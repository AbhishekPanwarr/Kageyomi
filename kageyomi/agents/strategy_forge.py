from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from langchain_groq import ChatGroq

from kageyomi.state import AgentState


def _primary_agent(state: AgentState) -> str:
    value = state.get("primary_agent") or state.get("detected_intent") or state.get("selected_agent") or "FullGraph"
    return str(value)


def _normalize_bias(value: str | None) -> str:
    lowered = (value or "").lower()
    if any(token in lowered for token in ("bull", "positive", "accumulating", "outperforming", "low")):
        return "bullish"
    if any(token in lowered for token in ("bear", "negative", "high", "defensive", "risk-off")):
        return "bearish"
    return "neutral"


def _normalize_confidence(value: Any, default: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return round(max(0.0, min(1.0, default)), 2)
    if numeric > 1:
        numeric = numeric / 100.0
    return round(max(0.0, min(1.0, numeric)), 2)


def _build_supporting_signals(state: AgentState) -> list[dict[str, str]]:
    signals = _signal_bundle(state)
    items: list[dict[str, str]] = []

    flow = signals.get("flow")
    if isinstance(flow, dict):
        items.append({
            "agent": "FlowSentinel",
            "bias": _normalize_bias(str(flow.get("bias"))),
            "signal": str(flow.get("summary") or "ETF flow data was reviewed."),
        })

    narrative = signals.get("narrative")
    if isinstance(narrative, dict):
        items.append({
            "agent": "NarrativeScope",
            "bias": _normalize_bias(str(narrative.get("sentiment"))),
            "signal": str(narrative.get("summary") or "News and sentiment data was reviewed."),
        })

    treasury = signals.get("treasury")
    if isinstance(treasury, dict):
        items.append({
            "agent": "TreasuryRadar",
            "bias": _normalize_bias(str(treasury.get("bias"))),
            "signal": str(treasury.get("summary") or "Treasury activity was reviewed."),
        })

    index = signals.get("index")
    if isinstance(index, dict):
        items.append({
            "agent": "IndexArb",
            "bias": _normalize_bias(str(index.get("bias"))),
            "signal": str(index.get("summary") or "Index relative value data was reviewed."),
        })

    macro = signals.get("macro")
    if isinstance(macro, dict):
        risk = str(macro.get("risk") or "")
        bias = "bearish" if risk == "high" else "neutral" if risk == "moderate" else "bullish"
        items.append({
            "agent": "MacroShield",
            "bias": bias,
            "signal": str(macro.get("summary") or "Macro event history was reviewed."),
        })

    venture = signals.get("venture")
    if isinstance(venture, dict):
        items.append({
            "agent": "VentureMap",
            "bias": "neutral",
            "signal": str(venture.get("summary") or "Fundraising activity was reviewed."),
        })

    return items


def _build_risks(state: AgentState, stance: str) -> list[dict[str, str]]:
    risks: list[dict[str, str]] = []
    macro = state.get("macro_signal")
    if isinstance(macro, dict):
        risk_level = str(macro.get("risk") or "")
        event = str(macro.get("event") or "macro event")
        if risk_level in {"high", "moderate"}:
            risks.append({
                "risk": f"{event} volatility",
                "description": f"{event} currently reads as {risk_level} risk and could disrupt near-term positioning.",
            })

    narrative = state.get("narrative_signal")
    if isinstance(narrative, dict) and str(narrative.get("sentiment")) == "negative":
        risks.append({
            "risk": "negative narrative",
            "description": "News sentiment is currently negative and could weigh on follow-through.",
        })

    if stance == "bullish":
        risks.append({
            "risk": "overextension",
            "description": "Bullish alignment can still fail if flows fade or macro conditions tighten unexpectedly.",
        })
    elif stance == "defensive":
        risks.append({
            "risk": "false downside signal",
            "description": "Defensive setups can reverse quickly if institutional flow or sentiment improves.",
        })

    return risks[:3]


def _fallback_thesis(state: AgentState, stance: str, supporting_signals: list[dict[str, str]]) -> str:
    if not supporting_signals:
        return f"Kageyomi sees the current setup as {stance} based on the available SoSoValue evidence."
    lead = supporting_signals[0]
    second = supporting_signals[1] if len(supporting_signals) > 1 else None
    if second:
        return (
            f"{lead['agent']} and {second['agent']} are the strongest drivers of the current {stance} view, "
            f"combining {lead['signal'].lower()} and {second['signal'].lower()}"
        )
    return f"{lead['agent']} is the primary driver of the current {stance} view: {lead['signal']}"


def _normalize_model_report(payload: dict[str, Any], state: AgentState) -> dict[str, Any]:
    fallback = _fallback_strategy_report(state)
    stance = str(payload.get("stance") or fallback["stance"]).lower()
    confidence = _normalize_confidence(payload.get("confidence"), float(fallback["confidence"]))

    raw_supporting = payload.get("supportingSignals")
    if isinstance(raw_supporting, list) and raw_supporting:
        supporting_signals: list[dict[str, str]] = []
        for item in raw_supporting:
            if isinstance(item, str):
                supporting_signals.append({
                    "agent": "Signal",
                    "bias": "neutral",
                    "signal": item,
                })
            elif isinstance(item, dict):
                supporting_signals.append({
                    "agent": str(item.get("agent") or item.get("source") or item.get("name") or "Signal"),
                    "bias": _normalize_bias(str(item.get("bias") or item.get("sentiment") or item.get("risk") or "neutral")),
                    "signal": str(item.get("signal") or item.get("summary") or item.get("detail") or item),
                })
        if not supporting_signals:
            supporting_signals = fallback["supportingSignals"]
    else:
        supporting_signals = fallback["supportingSignals"]

    raw_risks = payload.get("risks")
    if isinstance(raw_risks, list) and raw_risks:
        risks: list[dict[str, str]] = []
        for item in raw_risks:
            if isinstance(item, str):
                risks.append({"risk": "Risk", "description": item})
            elif isinstance(item, dict):
                risks.append({
                    "risk": str(item.get("risk") or item.get("title") or "Risk"),
                    "description": str(item.get("description") or item.get("detail") or item),
                })
        if not risks:
            risks = fallback["risks"]
    else:
        risks = fallback["risks"]

    thesis = str(payload.get("thesis") or fallback["thesis"])
    next_step = str(payload.get("nextStep") or fallback["nextStep"])

    return {
        "selectedAgent": str(payload.get("selectedAgent") or _primary_agent(state)),
        "activeAgents": list(state.get("active_agents", [])),
        "stance": stance,
        "confidence": confidence,
        "thesis": thesis,
        "supportingSignals": supporting_signals,
        "risks": risks,
        "nextStep": next_step,
    }


def _fallback_strategy_report(state: AgentState) -> dict[str, Any]:
    signals = _signal_bundle(state)
    bullish_votes = 0
    bearish_votes = 0
    neutral_votes = 0
    for signal in signals.values():
        if not isinstance(signal, dict):
            continue
        tone = str(
            signal.get("bias")
            or signal.get("sentiment")
            or signal.get("risk")
            or signal.get("summary", "")
        ).lower()
        if any(token in tone for token in ("bull", "positive", "accumulating", "outperforming", "low")):
            bullish_votes += 1
        elif any(token in tone for token in ("bear", "negative", "high")):
            bearish_votes += 1
        else:
            neutral_votes += 1
    stance = "bullish" if bullish_votes > bearish_votes else "defensive" if bearish_votes > bullish_votes else "neutral"
    total_votes = max(1, bullish_votes + bearish_votes + neutral_votes)
    agreement = max(bullish_votes, bearish_votes, neutral_votes) / total_votes
    confidence = round(min(0.9, 0.45 + agreement * 0.4), 2)
    supporting_signals = _build_supporting_signals(state)
    risks = _build_risks(state, stance)
    return {
        "selectedAgent": _primary_agent(state),
        "activeAgents": state.get("active_agents", []),
        "stance": stance,
        "confidence": confidence,
        "bullishVotes": bullish_votes,
        "bearishVotes": bearish_votes,
        "neutralVotes": neutral_votes,
        "signals": signals,
        "thesis": _fallback_thesis(state, stance, supporting_signals),
        "supportingSignals": supporting_signals,
        "risks": risks,
        "nextStep": "Use the signal mix as a research starting point, then validate it with fresh price action and risk limits.",
    }


def _signal_bundle(state: AgentState) -> dict[str, Any]:
    return {
        "flow": state.get("flow_signal"),
        "narrative": state.get("narrative_signal"),
        "treasury": state.get("treasury_signal"),
        "index": state.get("index_signal"),
        "macro": state.get("macro_signal"),
        "venture": state.get("venture_signal"),
    }


async def synthesize_strategy_report(state: AgentState) -> dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or os.getenv("KAGEYOMI_MOCK_GROQ", "false").lower() == "true":
        return _fallback_strategy_report(state)

    llm = ChatGroq(
        temperature=0,
        api_key=api_key,
        model=state.get("model_cid", "llama-3.3-70b-versatile"),
        model_kwargs={"seed": 42, "top_p": 1},
    )
    prompt = json.dumps(
        {
            "task": "Compose a concise but genuinely useful crypto research memo as strict JSON.",
            "query": state.get("query", ""),
            "selected_agent": _primary_agent(state),
            "active_agents": state.get("active_agents", []),
            "signals": _signal_bundle(state),
            "requirements": {
                "return_keys": [
                    "selectedAgent",
                    "activeAgents",
                    "stance",
                    "confidence",
                    "thesis",
                    "supportingSignals",
                    "risks",
                    "nextStep",
                ],
                "selectedAgent_rule": "Set this to the primary agent that best explains the thesis, not to orchestration labels like FullGraph or Auto.",
                "confidence_rule": "Return a number between 0 and 1.",
                "supportingSignals_rule": "Return 3 to 5 objects, each with keys: agent, bias, signal.",
                "risks_rule": "Return 2 to 4 objects, each with keys: risk, description.",
                "thesis_rule": "Reference the strongest concrete signals from the provided data, not generic crypto commentary.",
                "nextStep_rule": "Give a research or positioning next step, not a vague placeholder sentence.",
                "json_only": True,
                "no_markdown": True,
            },
        },
        sort_keys=True,
    )
    message = await asyncio.to_thread(llm.invoke, prompt)
    try:
        payload = json.loads(str(message.content))
        if isinstance(payload, dict):
            return _normalize_model_report(payload, state)
    except json.JSONDecodeError:
        pass
    report = _fallback_strategy_report(state)
    report["raw_model_output"] = str(message.content)
    return report


async def strategy_forge_node(state: AgentState) -> dict[str, Any]:
    return {
        "strategy_report": await synthesize_strategy_report(state),
        "reasoning_steps": ["StrategyForge synthesized the final memo from the active agent signals."],
    }
