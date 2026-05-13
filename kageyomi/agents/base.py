import time
import json
from typing import Any
from kageyomi.uavp.canonicalize import canonicalize_soso_response
from kageyomi.uavp.receipt_manager import create_receipt, sign_receipt, sha256_hex
from kageyomi.pipeline.sosovalue_client import SoSoValueClient
import os

client = SoSoValueClient()

async def uavp_tool_call(job_id: str, tool_name: str, endpoint: str, params: dict) -> tuple[str, dict]:
    # Make API call
    raw_data = await client.get(endpoint, params)
    
    # Canonicalize
    data_type = "json"
    canonical_data = canonicalize_soso_response(raw_data, data_type)
    
    # Receipt
    tool_args_json = json.dumps(params, sort_keys=True, separators=(",", ":"))
    params_hash = sha256_hex(tool_args_json)
    response_hash = sha256_hex(canonical_data)
    
    receipt = create_receipt(
        job_id=job_id,
        tool_name=tool_name,
        tool_call_id=f"{tool_name}-{int(time.time()*1000)}",
        tool_args_json=tool_args_json,
        params_hash=params_hash,
        response_hash=response_hash,
        canonical_data=canonical_data,
        data_type=data_type,
        timestamp_ms=int(time.time() * 1000)
    )
    
    pk = os.getenv("NODE_PRIVATE_KEY")
    signed_receipt = sign_receipt(receipt, pk) if pk else receipt
    
    return canonical_data, signed_receipt
