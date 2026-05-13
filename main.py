from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AliasChoices, BaseModel, Field

from kageyomi.agents.flow_sentinel import TOOL_NAME as FLOW_TOOL, flow_signal_from_canonical
from kageyomi.agents.others import (
    index_signal_from_canonical,
    macro_signal_from_canonical,
    narrative_signal_from_canonical,
    treasury_signal_from_canonical,
    venture_signal_from_canonical,
)
from kageyomi.agents.strategy_forge import synthesize_strategy_report
from kageyomi.pipeline.graph import ANALYST_AGENTS, graph
from kageyomi.uavp.receipt_manager import (
    compute_merkle_root,
    compute_trace_hash,
    load_receipts_from_ipfs,
    post_receipts_to_ipfs,
    sha256_hex,
)

logger = logging.getLogger("kageyomi")

app = FastAPI(title="Kageyomi UAVP Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
DEFAULT_AGENT = "Auto"


class AgentRequest(BaseModel):
    prompt: str = Field(min_length=1)
    agent: str = Field(default=DEFAULT_AGENT)
    model_cid: str = Field(default=DEFAULT_MODEL, validation_alias=AliasChoices("model_cid", "modelCid"))
    max_tools: int = Field(default=6, ge=1, le=6, validation_alias=AliasChoices("max_tools", "maxTools"))


class AgentVerifyRequest(BaseModel):
    receipts_cid: str = Field(min_length=1, validation_alias=AliasChoices("receipts_cid", "receiptsCID"))
    prompt: str = Field(min_length=1)
    expected_output_hash: str = Field(min_length=1, validation_alias=AliasChoices("expected_output_hash", "expectedOutputHash"))
    model_cid: str = Field(default=DEFAULT_MODEL, validation_alias=AliasChoices("model_cid", "modelCid"))


def _json_output(report: dict[str, Any]) -> str:
    return json.dumps(report, sort_keys=True, separators=(",", ":"))


def _build_initial_state(req: AgentRequest) -> dict[str, Any]:
    return {
        "query": req.prompt,
        "job_id": "0x" + uuid.uuid4().hex,
        "selected_agent": req.agent or DEFAULT_AGENT,
        "model_cid": req.model_cid,
        "max_tools": req.max_tools,
        "receipts": [],
        "reasoning_steps": [],
        "errors": [],
    }


def _response_payload(
    *,
    job_id: str,
    output: str,
    output_hash: str,
    receipt_root: str,
    receipts_cid: str,
    trace_hash: str,
    receipts: list[dict[str, Any]],
    report: dict[str, Any],
    reasoning_steps: list[str],
    active_agents: list[str],
    detected_intent: str | None,
) -> dict[str, Any]:
    return {
        "jobId": job_id,
        "job_id": job_id,
        "output": output,
        "outputHash": output_hash,
        "output_hash": output_hash,
        "receiptRoot": receipt_root,
        "receipt_root": receipt_root,
        "receiptsCID": receipts_cid,
        "receipts_cid": receipts_cid,
        "traceHash": trace_hash,
        "trace_hash": trace_hash,
        "receipts": receipts,
        "strategyReport": report,
        "strategy_report": report,
        "reasoningSteps": reasoning_steps,
        "reasoning_steps": reasoning_steps,
        "activeAgents": active_agents,
        "active_agents": active_agents,
        "detectedIntent": detected_intent,
        "detected_intent": detected_intent,
        "matched": None,
    }


def _normalize_receipts(receipts: Any) -> list[dict[str, Any]]:
    return [receipt for receipt in receipts if isinstance(receipt, dict)] if isinstance(receipts, list) else []


def _signal_state_from_receipts(prompt: str, receipts: list[dict[str, Any]], model_cid: str) -> dict[str, Any]:
    state: dict[str, Any] = {
        "query": prompt,
        "job_id": "replay",
        "model_cid": model_cid,
        "selected_agent": "Replay",
        "receipts": receipts,
        "reasoning_steps": ["Verifier replay loaded frozen canonical receipts."],
        "errors": [],
    }
    active_agents: list[str] = []
    seen_agents: set[str] = set()
    def mark(agent_name: str) -> None:
        if agent_name not in seen_agents:
            active_agents.append(agent_name)
            seen_agents.add(agent_name)
    for receipt in receipts:
        tool_name = str(receipt.get("toolName") or "")
        canonical_data = str(receipt.get("canonicalData") or "")
        args_json = str(receipt.get("toolArgumentsJson") or "{}")
        try:
            tool_args = json.loads(args_json)
        except json.JSONDecodeError:
            tool_args = {}

        if tool_name == FLOW_TOOL:
            mark("FlowSentinel")
            state["flow_signal"] = flow_signal_from_canonical(canonical_data, str(tool_args.get("symbol", "BTC")))
        elif tool_name == "fetch_news_search":
            mark("NarrativeScope")
            state["narrative_signal"] = narrative_signal_from_canonical(
                canonical_data,
                str(tool_args.get("keyword", "BTC")),
            )
        elif tool_name == "fetch_btc_treasury_history":
            mark("TreasuryRadar")
            state["treasury_signal"] = treasury_signal_from_canonical(
                canonical_data,
                str(tool_args.get("ticker", "MSTR")),
            )
        elif tool_name == "fetch_index_market_snapshot":
            mark("IndexArb")
            state["index_signal"] = index_signal_from_canonical(
                canonical_data,
                str(tool_args.get("index_ticker", tool_args.get("ticker", "ssimag7"))),
            )
        elif tool_name == "fetch_macro_history":
            mark("MacroShield")
            state["macro_signal"] = macro_signal_from_canonical(
                canonical_data,
                str(tool_args.get("event", "CPI")),
            )
        elif tool_name == "fetch_fundraising_projects":
            mark("VentureMap")
            state["venture_signal"] = venture_signal_from_canonical(canonical_data)
    ordered_agents = [agent for agent in ANALYST_AGENTS if agent in seen_agents]
    state["active_agents"] = ordered_agents
    state["selected_agent"] = ordered_agents[0] if len(ordered_agents) == 1 else "FullGraph"
    return state


@app.post("/uavp/execute")
async def execute_agent(req: AgentRequest) -> dict[str, Any]:
    try:
        state = _build_initial_state(req)
        final_state = await graph.ainvoke(state)
        receipts = _normalize_receipts(final_state.get("receipts"))
        report = final_state.get("strategy_report")
        if not isinstance(report, dict):
            raise ValueError("StrategyForge did not return a structured report")
        output = _json_output(report)
        output_hash = sha256_hex(output)
        receipt_root = compute_merkle_root([str(receipt["responseHash"]) for receipt in receipts]) if receipts else sha256_hex("")
        receipts_cid = await post_receipts_to_ipfs(receipts)
        trace_hash = compute_trace_hash(
            prompt=req.prompt,
            output_hash=output_hash,
            receipt_root=receipt_root,
            receipts_cid=receipts_cid,
            model=req.model_cid,
            tool_count=len(receipts),
        )
        return _response_payload(
            job_id=str(final_state.get("job_id") or state["job_id"]),
            output=output,
            output_hash=output_hash,
            receipt_root=receipt_root,
            receipts_cid=receipts_cid,
            trace_hash=trace_hash,
            receipts=receipts,
            report=report,
            reasoning_steps=list(final_state.get("reasoning_steps") or []),
            active_agents=list(final_state.get("active_agents") or []),
            detected_intent=str(final_state.get("detected_intent") or ""),
        )
    except Exception as exc:
        logger.exception("UAVP execute failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uavp/verify")
async def verify_agent(req: AgentVerifyRequest) -> dict[str, Any]:
    try:
        receipts = _normalize_receipts(await load_receipts_from_ipfs(req.receipts_cid))
        replay_state = _signal_state_from_receipts(req.prompt, receipts, req.model_cid)
        report = await synthesize_strategy_report(replay_state)
        output = _json_output(report)
        matched = sha256_hex(output).lower() == req.expected_output_hash.lower()
        return {
            "matched": matched,
            "reason": "verifier replay completed from frozen receipts",
            "receiptsCID": req.receipts_cid,
            "receipts_cid": req.receipts_cid,
            "expectedOutputHash": req.expected_output_hash,
            "expected_output_hash": req.expected_output_hash,
            "replayedOutputHash": sha256_hex(output),
            "replayed_output_hash": sha256_hex(output),
            "activeAgents": replay_state.get("active_agents", []),
            "active_agents": replay_state.get("active_agents", []),
        }
    except Exception as exc:
        logger.exception("UAVP verify failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "layer": "uavp_agent"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("KAGEYOMI_AGENT_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
