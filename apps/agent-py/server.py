from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from uavp_runner import run_agent_job, verify_agent_job


app = FastAPI(title="Kageyomi UAVP Agent")
logger = logging.getLogger("kageyomi.agent_py")


class AgentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    prompt: str = Field(min_length=1)
    model_cid: str = Field(
        default="llama-3.3-70b-versatile",
        validation_alias=AliasChoices("model_cid", "modelCid"),
    )
    max_tools: int = Field(default=5, ge=1, le=5, validation_alias=AliasChoices("max_tools", "maxTools"))


class AgentVerifyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    receipts_cid: str = Field(min_length=1, validation_alias=AliasChoices("receipts_cid", "receiptsCID"))
    prompt: str = Field(min_length=1)
    expected_output_hash: str = Field(
        min_length=1,
        validation_alias=AliasChoices("expected_output_hash", "expectedOutputHash"),
    )


@app.post("/uavp/execute")
async def execute_agent(req: AgentRequest) -> dict:
    try:
        return await run_agent_job(req.prompt, req.model_cid, req.max_tools)
    except Exception as exc:
        logger.exception("UAVP execute failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uavp/verify")
async def verify_agent(req: AgentVerifyRequest) -> dict:
    try:
        return await verify_agent_job(req.receipts_cid, req.prompt, req.expected_output_hash)
    except Exception as exc:
        logger.exception("UAVP verify failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "layer": "uavp_agent"}
