from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from langchain_groq import ChatGroq

from kageyomi.state import AgentState


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
    return {
        "selectedAgent": state.get("selected_agent", "FullGraph"),
        "activeAgents": state.get("active_agents", []),
        "stance": stance,
        "bullishVotes": bullish_votes,
        "bearishVotes": bearish_votes,
        "neutralVotes": neutral_votes,
        "signals": signals,
        "thesis": f"Kageyomi sees the current setup as {stance} based on the available SoSoValue evidence.",
        "nextStep": "Use the signal mix as a research starting point, not a direct order instruction.",
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
            "task": "Compose a concise crypto research memo as strict JSON.",
            "query": state.get("query", ""),
            "selected_agent": state.get("selected_agent", "FullGraph"),
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
            return payload
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
