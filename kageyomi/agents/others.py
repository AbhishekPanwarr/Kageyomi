from __future__ import annotations

import json
from typing import Any

from kageyomi.agents.base import uavp_tool_call
from kageyomi.state import AgentState


def _safe_json_loads(canonical_data: str) -> Any:
    try:
        return json.loads(canonical_data)
    except json.JSONDecodeError:
        return canonical_data


def narrative_signal_from_canonical(canonical_data: str, keyword: str) -> dict[str, Any]:
    payload = _safe_json_loads(canonical_data)
    if isinstance(payload, dict):
        articles = payload.get("list", [])
    else:
        articles = payload if isinstance(payload, list) else []
    positive_terms = ("approval", "surge", "record", "inflow", "growth", "buy", "bull")
    negative_terms = ("delay", "outflow", "hack", "lawsuit", "sell", "bear", "risk")
    score = 0
    headlines: list[str] = []
    for article in articles[:5]:
        if not isinstance(article, dict):
            continue
        title = str(article.get("title", ""))
        content = str(article.get("content", ""))
        text = f"{title} {content}".lower()
        score += sum(1 for term in positive_terms if term in text)
        score -= sum(1 for term in negative_terms if term in text)
        if title:
            headlines.append(title)
    sentiment = "positive" if score > 0 else "negative" if score < 0 else "neutral"
    return {
        "agent": "NarrativeScope",
        "keyword": keyword,
        "article_count": len(articles) if isinstance(articles, list) else 0,
        "sentiment": sentiment,
        "top_headlines": headlines[:3],
        "summary": f"News sentiment around '{keyword}' is {sentiment}.",
    }


def treasury_signal_from_canonical(canonical_data: str, ticker: str) -> dict[str, Any]:
    payload = _safe_json_loads(canonical_data)
    rows = payload if isinstance(payload, list) else []
    latest = rows[0] if rows and isinstance(rows[0], dict) else {}
    btc_acquired = float(latest.get("btc_acq", 0) or 0)
    holdings = float(latest.get("btc_holding", 0) or 0)
    bias = "accumulating" if btc_acquired > 0 else "steady"
    return {
        "agent": "TreasuryRadar",
        "ticker": ticker,
        "latest_purchase_date": latest.get("date"),
        "latest_btc_acquired": btc_acquired,
        "latest_total_holdings": holdings,
        "bias": bias,
        "summary": f"{ticker} treasury behavior looks {bias}.",
    }


def index_signal_from_canonical(canonical_data: str, index_ticker: str) -> dict[str, Any]:
    payload = _safe_json_loads(canonical_data)
    if not isinstance(payload, dict):
        payload = {}
    daily_change = float(payload.get("24h_change_pct", 0) or 0)
    weekly_roi = float(payload.get("7day_roi", 0) or 0)
    monthly_roi = float(payload.get("1month_roi", 0) or 0)
    bias = "outperforming" if weekly_roi > 0 and monthly_roi > 0 else "mixed"
    return {
        "agent": "IndexArb",
        "index_ticker": index_ticker,
        "daily_change_pct": round(daily_change, 6),
        "weekly_roi": round(weekly_roi, 6),
        "monthly_roi": round(monthly_roi, 6),
        "bias": bias,
        "summary": f"{index_ticker} relative-value profile is {bias}.",
    }


def macro_signal_from_canonical(canonical_data: str, event: str) -> dict[str, Any]:
    payload = _safe_json_loads(canonical_data)
    rows = payload if isinstance(payload, list) else []
    latest = rows[0] if rows and isinstance(rows[0], dict) else {}
    actual = float(latest.get("actual", 0) or 0)
    forecast = float(latest.get("forecast", 0) or 0)
    surprise = round(actual - forecast, 6)
    risk = "high" if abs(surprise) > 0.5 else "moderate" if abs(surprise) > 0.1 else "low"
    return {
        "agent": "MacroShield",
        "event": event,
        "latest_date": latest.get("date"),
        "surprise": surprise,
        "risk": risk,
        "summary": f"{event} macro surprise implies {risk} event risk.",
    }


def venture_signal_from_canonical(canonical_data: str) -> dict[str, Any]:
    payload = _safe_json_loads(canonical_data)
    projects = payload if isinstance(payload, list) else []
    names = [
        str(project.get("project_name"))
        for project in projects[:5]
        if isinstance(project, dict) and project.get("project_name")
    ]
    return {
        "agent": "VentureMap",
        "project_count": len(projects) if isinstance(projects, list) else 0,
        "sample_projects": names[:3],
        "summary": f"Fundraising map surfaced {len(names) if names else 0} immediately visible projects.",
    }


async def narrative_scope_node(state: AgentState) -> dict[str, Any]:
    if "NarrativeScope" not in state.get("active_agents", []):
        return {}
    keyword = state.get("news_keyword", state.get("symbol", "BTC"))
    canonical_data, receipt = await uavp_tool_call(
        state["job_id"],
        "fetch_news_search",
        "/news/search",
        {"keyword": keyword, "category": 1, "page_size": 10},
    )
    return {
        "narrative_signal": narrative_signal_from_canonical(canonical_data, keyword),
        "receipts": [receipt],
        "reasoning_steps": [f"NarrativeScope searched SoSoValue news for '{keyword}'."],
    }


async def treasury_radar_node(state: AgentState) -> dict[str, Any]:
    if "TreasuryRadar" not in state.get("active_agents", []):
        return {}
    ticker = state.get("treasury_ticker", "MSTR")
    canonical_data, receipt = await uavp_tool_call(
        state["job_id"],
        "fetch_btc_treasury_history",
        f"/btc-treasuries/{ticker}/purchase-history",
        {"limit": 5},
    )
    return {
        "treasury_signal": treasury_signal_from_canonical(canonical_data, ticker),
        "receipts": [receipt],
        "reasoning_steps": [f"TreasuryRadar reviewed BTC treasury history for {ticker}."],
    }


async def index_arb_node(state: AgentState) -> dict[str, Any]:
    if "IndexArb" not in state.get("active_agents", []):
        return {}
    index_ticker = state.get("index_ticker", "ssimag7")
    canonical_data, receipt = await uavp_tool_call(
        state["job_id"],
        "fetch_index_market_snapshot",
        f"/indices/{index_ticker}/market-snapshot",
        {},
    )
    return {
        "index_signal": index_signal_from_canonical(canonical_data, index_ticker),
        "receipts": [receipt],
        "reasoning_steps": [f"IndexArb compared current SoSoValue index snapshot for {index_ticker}."],
    }


async def macro_shield_node(state: AgentState) -> dict[str, Any]:
    if "MacroShield" not in state.get("active_agents", []):
        return {}
    event = state.get("macro_event", "CPI")
    canonical_data, receipt = await uavp_tool_call(
        state["job_id"],
        "fetch_macro_history",
        f"/macro/events/{event}/history",
        {"limit": 5},
    )
    return {
        "macro_signal": macro_signal_from_canonical(canonical_data, event),
        "receipts": [receipt],
        "reasoning_steps": [f"MacroShield evaluated the historical surprise profile for {event}."],
    }


async def venture_map_node(state: AgentState) -> dict[str, Any]:
    if "VentureMap" not in state.get("active_agents", []):
        return {}
    canonical_data, receipt = await uavp_tool_call(
        state["job_id"],
        "fetch_fundraising_projects",
        "/fundraising/projects",
        {},
    )
    return {
        "venture_signal": venture_signal_from_canonical(canonical_data),
        "receipts": [receipt],
        "reasoning_steps": ["VentureMap sampled current fundraising projects from SoSoValue."],
    }
