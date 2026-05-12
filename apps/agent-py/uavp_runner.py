from __future__ import annotations

import json
import os
import subprocess
import hashlib
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parents[1] / "agent"
TS_ENTRYPOINT = APP_DIR / "src" / "agent" / "groq-agent.ts"
TS_VERIFY_ENTRYPOINT = APP_DIR / "src" / "verifier" / "cli.ts"


async def run_agent_job(prompt: str, model_cid: str, max_tools: int = 5) -> dict[str, Any]:
    env = os.environ.copy()
    env["GROQ_MODEL"] = model_cid
    env["KAGEYOMI_MAX_TOOLS"] = str(max_tools)

    command = [
        "node",
        "--import",
        "tsx",
        str(TS_ENTRYPOINT),
        prompt,
    ]

    result = subprocess.run(
        command,
        cwd=str(APP_DIR),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown UAVP agent error"
        raise RuntimeError(detail)

    payload = json.loads(result.stdout)
    return {
        "job_id": payload.get("jobId"),
        "output": payload["output"],
        "output_hash": payload["outputHash"],
        "receipt_root": payload["receiptRoot"],
        "receipts_cid": payload["receiptsCID"],
        "trace_hash": payload["traceHash"],
        "receipts": payload.get("receipts", []),
    }


async def verify_agent_job(receipts_cid: str, prompt: str, expected_output_hash: str) -> dict[str, Any]:
    command = [
        "node",
        "--import",
        "tsx",
        str(TS_VERIFY_ENTRYPOINT),
        receipts_cid,
        prompt,
        expected_output_hash,
    ]

    result = subprocess.run(
        command,
        cwd=str(APP_DIR),
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown UAVP verifier error"
        raise RuntimeError(detail)

    return json.loads(result.stdout)


def create_test_receipts() -> list[dict[str, str]]:
    canonical_payloads = [
        '{"date":"2026-05-12","total_net_inflow":-55066297.0,"total_value_traded":4706120449.0}',
        '{"date":"2026-04-11","actual":3.4,"forecast":3.2,"previous":3.1}',
    ]
    tool_names = [
        "fetch_ETF_summary_history",
        "fetch_macro_history",
    ]
    receipts: list[dict[str, str]] = []
    for tool_name, canonical in zip(tool_names, canonical_payloads):
        receipts.append(
            {
                "tool_name": tool_name,
                "canonical_data": canonical,
                "response_hash": "0x" + hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
            }
        )
    return receipts
