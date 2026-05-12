from __future__ import annotations

import json
from typing import Any

from kageyomi.agents.base import uavp_tool_call
from kageyomi.state import AgentState

AGENT_NAME = "FlowSentinel"
TOOL_NAME = "fetch_ETF_summary_history"


def flow_signal_from_canonical(canonical_data: str, symbol: str) -> dict[str, Any]:
    rows = json.loads(canonical_data)
    if not isinstance(rows, list):
        rows = []
    total_net_inflow = sum(float(row.get("total_net_inflow", 0) or 0) for row in rows if isinstance(row, dict))
    latest = rows[0] if rows and isinstance(rows[0], dict) else {}
    latest_inflow = float(latest.get("total_net_inflow", 0) or 0)
    bias = "bullish" if total_net_inflow > 0 else "bearish" if total_net_inflow < 0 else "neutral"
    return {
        "agent": AGENT_NAME,
        "symbol": symbol,
        "days_analyzed": len(rows),
        "net_inflow_lookback_usd": round(total_net_inflow, 2),
        "latest_session_inflow_usd": round(latest_inflow, 2),
        "latest_date": latest.get("date"),
        "bias": bias,
        "summary": f"{symbol} ETF flow signal is {bias} over the lookback window.",
    }


async def flow_sentinel_node(state: AgentState) -> dict[str, Any]:
    if AGENT_NAME not in state.get("active_agents", []):
        return {}

    symbol = state.get("symbol", "BTC")
    canonical_data, receipt = await uavp_tool_call(
        state["job_id"],
        TOOL_NAME,
        "/etfs/summary-history",
        {"symbol": symbol, "country_code": "US", "limit": 7},
    )
    return {
        "flow_signal": flow_signal_from_canonical(canonical_data, symbol),
        "receipts": [receipt],
        "reasoning_steps": [f"{AGENT_NAME} analyzed {symbol} ETF aggregate flow history."],
    }
