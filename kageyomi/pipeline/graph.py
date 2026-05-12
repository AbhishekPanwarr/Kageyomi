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


def _resolve_active_agents(selected_agent: str, max_tools: int) -> list[str]:
    if selected_agent and selected_agent not in {"FullGraph", "Auto"}:
        return [selected_agent]
    return ANALYST_AGENTS[: max(1, min(max_tools, len(ANALYST_AGENTS)))]


async def planner_node(state: AgentState) -> dict[str, Any]:
    query = state.get("query", "")
    symbol = _extract_symbol(query)
    selected_agent = state.get("selected_agent", "FullGraph")
    max_tools = int(state.get("max_tools", len(ANALYST_AGENTS)))
    active_agents = _resolve_active_agents(selected_agent, max_tools)
    return {
        "symbol": symbol,
        "selected_agent": selected_agent,
        "active_agents": active_agents,
        "news_keyword": _extract_news_keyword(query, symbol),
        "macro_event": _extract_macro_event(query),
        "treasury_ticker": _extract_treasury_ticker(query),
        "index_ticker": _extract_index_ticker(query),
        "reasoning_steps": [f"Planner activated agents: {', '.join(active_agents)}."],
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
