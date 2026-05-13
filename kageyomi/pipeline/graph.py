from __future__ import annotations

import re
from typing import Any

from langgraph.graph import END, StateGraph

from kageyomi.agents.flow_sentinel import flow_sentinel_node
from kageyomi.agents.others import (
    index_arb_node,
    macro_shield_node,
    narrative_scope_node,
    treasury_radar_node,
    venture_map_node,
)
from kageyomi.agents.strategy_forge import strategy_forge_node
from kageyomi.state import AgentState

ANALYST_AGENTS = [
    "FlowSentinel",
    "NarrativeScope",
    "TreasuryRadar",
    "IndexArb",
    "MacroShield",
    "VentureMap",
]

INTENT_PATTERNS: dict[str, tuple[str, ...]] = {
    "FlowSentinel": (
        "etf",
        "flow",
        "inflow",
        "outflow",
        "blackrock",
        "fidelity",
        "ibit",
        "fbtc",
    ),
    "NarrativeScope": (
        "news",
        "headline",
        "sentiment",
        "narrative",
        "approval",
        "media",
        "latest",
    ),
    "TreasuryRadar": (
        "treasury",
        "mstr",
        "microstrategy",
        "tsla",
        "coin",
        "hood",
        "accumulation",
        "corporate",
    ),
    "IndexArb": (
        "index",
        "indices",
        "mag7",
        "layer1",
        "layer 1",
        "relative value",
        "arb",
        "performance",
    ),
    "MacroShield": (
        "cpi",
        "fomc",
        "nfp",
        "nonfarm",
        "macro",
        "rates",
        "inflation",
        "fed",
    ),
    "VentureMap": (
        "venture",
        "fundraising",
        "funding",
        "vc",
        "round",
        "raise",
        "seed",
    ),
}


def _extract_symbol(query: str) -> str:
    for symbol in ("BTC", "ETH", "SOL", "XRP", "DOGE"):
        if re.search(rf"\b{symbol}\b", query, re.IGNORECASE):
            return symbol
    return "BTC"


def _extract_macro_event(query: str) -> str:
    for event in ("CPI", "Nonfarm Payrolls", "FOMC"):
        if event.lower() in query.lower():
            return event
    if "nfp" in query.lower():
        return "Nonfarm Payrolls"
    return "CPI"


def _extract_treasury_ticker(query: str) -> str:
    for ticker in ("MSTR", "TSLA", "COIN", "HOOD"):
        if re.search(rf"\b{ticker}\b", query, re.IGNORECASE):
            return ticker
    return "MSTR"


def _extract_index_ticker(query: str) -> str:
    lowered = query.lower()
    if "layer1" in lowered or "layer 1" in lowered:
        return "ssilayer1"
    return "ssimag7"


def _extract_news_keyword(query: str, symbol: str) -> str:
    lowered = query.lower()
    if "etf" in lowered:
        return f"{symbol} ETF"
    if "macro" in lowered or "cpi" in lowered or "fomc" in lowered:
        return f"{symbol} macro"
    return symbol


def _score_agent_intents(query: str, symbol: str) -> dict[str, int]:
    lowered = query.lower()
    scores: dict[str, int] = {agent: 0 for agent in ANALYST_AGENTS}

    for agent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if pattern in lowered:
                scores[agent] += 1

    if symbol and symbol.lower() in lowered:
        scores["FlowSentinel"] += 1
        scores["NarrativeScope"] += 1

    if "versus" in lowered or "compare" in lowered or "vs" in lowered:
        scores["IndexArb"] += 1
    if "risk" in lowered or "surprise" in lowered:
        scores["MacroShield"] += 1

    return scores


def _fallback_intent_agent(query: str, symbol: str) -> str:
    lowered = query.lower()
    if "news" in lowered or "latest" in lowered:
        return "NarrativeScope"
    if any(token in lowered for token in ("etf", "flow", "inflow", "outflow")):
        return "FlowSentinel"
    if any(token in lowered for token in ("index", "performance", "compare", "versus", "vs")):
        return "IndexArb"
    if any(token in lowered for token in ("macro", "cpi", "fomc", "nfp", "inflation")):
        return "MacroShield"
    if any(token in lowered for token in ("treasury", "mstr", "microstrategy", "corporate")):
        return "TreasuryRadar"
    if any(token in lowered for token in ("venture", "fundraising", "vc", "funding")):
        return "VentureMap"
    return "FlowSentinel" if symbol else "NarrativeScope"


def _resolve_active_agents(selected_agent: str, max_tools: int, query: str, symbol: str) -> tuple[str, list[str], dict[str, int]]:
    if selected_agent and selected_agent not in {"FullGraph", "Auto"}:
        return selected_agent, [selected_agent], {selected_agent: 999}

    scores = _score_agent_intents(query, symbol)
    positive_agents = [agent for agent in ANALYST_AGENTS if scores[agent] > 0]
    sorted_agents = sorted(
        ANALYST_AGENTS,
        key=lambda agent: (-scores[agent], ANALYST_AGENTS.index(agent)),
    )

    if selected_agent == "Auto":
        chosen = sorted_agents[0] if positive_agents else _fallback_intent_agent(query, symbol)
        return chosen, [chosen], scores

    if positive_agents:
        chosen_agents = sorted_agents[: max(1, min(max_tools, len(positive_agents)))]
        chosen_agents = [agent for agent in chosen_agents if scores[agent] > 0]
        primary_agent = chosen_agents[0]
        return primary_agent, chosen_agents, scores

    fallback = _fallback_intent_agent(query, symbol)
    return fallback, [fallback], scores


async def planner_node(state: AgentState) -> dict[str, Any]:
    query = state.get("query", "")
    symbol = _extract_symbol(query)
    selected_agent = state.get("selected_agent", "Auto")
    max_tools = int(state.get("max_tools", len(ANALYST_AGENTS)))
    detected_intent, active_agents, intent_scores = _resolve_active_agents(selected_agent, max_tools, query, symbol)
    return {
        "symbol": symbol,
        "selected_agent": selected_agent,
        "detected_intent": detected_intent,
        "primary_agent": detected_intent,
        "active_agents": active_agents,
        "intent_scores": intent_scores,
        "news_keyword": _extract_news_keyword(query, symbol),
        "macro_event": _extract_macro_event(query),
        "treasury_ticker": _extract_treasury_ticker(query),
        "index_ticker": _extract_index_ticker(query),
        "reasoning_steps": [
            f"Intent finder selected {detected_intent} as the primary agent.",
            f"Planner activated agents: {', '.join(active_agents)}.",
        ],
    }


def build_graph():
    builder = StateGraph(AgentState)
    builder.add_node("planner", planner_node)
    builder.add_node("flow_sentinel", flow_sentinel_node)
    builder.add_node("narrative_scope", narrative_scope_node)
    builder.add_node("treasury_radar", treasury_radar_node)
    builder.add_node("index_arb", index_arb_node)
    builder.add_node("macro_shield", macro_shield_node)
    builder.add_node("venture_map", venture_map_node)
    builder.add_node("strategy_forge", strategy_forge_node)

    builder.set_entry_point("planner")

    for node_name in (
        "flow_sentinel",
        "narrative_scope",
        "treasury_radar",
        "index_arb",
        "macro_shield",
        "venture_map",
    ):
        builder.add_edge("planner", node_name)
        builder.add_edge(node_name, "strategy_forge")

    builder.add_edge("strategy_forge", END)
    return builder.compile()


graph = build_graph()
