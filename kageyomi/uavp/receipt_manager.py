import json
import hashlib
import os
import httpx
from eth_account.messages import encode_defunct
from eth_account import Account

# ensure that we use the unencrypted key locally
def normalize_hex(val: str) -> str:
    return val if val.startswith("0x") else f"0x{val}"

def sha256_hex(val: str | bytes) -> str:
    if isinstance(val, str):
        val = val.encode("utf-8")
    return "0x" + hashlib.sha256(val).hexdigest()

def create_receipt(job_id: str, tool_name: str, tool_call_id: str, tool_args_json: str, params_hash: str, response_hash: str, canonical_data: str, data_type: str, timestamp_ms: int) -> dict:
    obj = {
        "jobId": job_id,
        "toolName": tool_name,
        "toolCallId": tool_call_id,
        "toolArgumentsJson": tool_args_json,
        "paramsHash": params_hash,
        "responseHash": response_hash,
        "dataType": data_type,
        "canonicalData": canonical_data,
        "timestampMs": timestamp_ms
    }
    receipt_hash = sha256_hex(json.dumps(obj, sort_keys=True, separators=(",", ":")))
    return {**obj, "receiptHash": receipt_hash}

def sign_receipt(receipt: dict, private_key: str) -> dict:
    if not private_key:
        return receipt
    msg = encode_defunct(hexstr=receipt["receiptHash"])
    signed = Account.sign_message(msg, private_key=normalize_hex(private_key))
    return {**receipt, "signature": signed.signature.hex()}


def _local_receipt_cache_dir() -> str:
    return os.getenv("KAGEYOMI_RECEIPT_CACHE_DIR", ".receipt-cache")


def _persist_receipts_locally(cid: str, receipts: list) -> None:
    cache_dir = _local_receipt_cache_dir()
    os.makedirs(cache_dir, exist_ok=True)
    with open(os.path.join(cache_dir, f"{cid}.json"), "w", encoding="utf-8") as handle:
        json.dump(receipts, handle, indent=2)

async def post_receipts_to_ipfs(receipts: list) -> str:
    if os.getenv("KAGEYOMI_MOCK_IPFS", "false").lower() == "true":
        cid = sha256_hex(json.dumps(receipts))[2:]
        mock_dir = os.getenv("KAGEYOMI_MOCK_IPFS_DIR", ".mock-ipfs")
        os.makedirs(mock_dir, exist_ok=True)
        with open(os.path.join(mock_dir, f"{cid}.json"), "w", encoding="utf-8") as f:
            json.dump(receipts, f, indent=2)
        _persist_receipts_locally(cid, receipts)
        return cid

    pinata_jwt = os.getenv("PINATA_JWT")
    if not pinata_jwt:
        raise ValueError("PINATA_JWT is not configured")

    payload = json.dumps(receipts).encode("utf-8")
    files = {"file": ("kageyomi-receipts.json", payload)}
    data = {"network": "public", "name": "kageyomi-receipts.json"}
    
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://uploads.pinata.cloud/v3/files",
            headers={"Authorization": f"Bearer {pinata_jwt}"},
            data=data,
            files=files,
            timeout=30.0
        )
        res.raise_for_status()
        resp_data = res.json()
        cid = resp_data.get("data", {}).get("cid")
        if not cid:
            raise ValueError(f"IPFS receipt upload returned no CID: {resp_data}")
        _persist_receipts_locally(cid, receipts)
        return cid


async def load_receipts_from_ipfs(cid: str) -> list[dict]:
    local_path = os.path.join(_local_receipt_cache_dir(), f"{cid}.json")
    if os.path.exists(local_path):
        with open(local_path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    mock_dir = os.getenv("KAGEYOMI_MOCK_IPFS_DIR", ".mock-ipfs")
    mock_path = os.path.join(mock_dir, f"{cid}.json")
    if os.path.exists(mock_path):
        with open(mock_path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    gateway_base = os.getenv("IPFS_GATEWAY", "https://gateway.pinata.cloud/ipfs")
    gateway_url = f"{gateway_base.rstrip('/')}/{cid}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(gateway_url)
        res.raise_for_status()
        receipts = res.json()
    if not isinstance(receipts, list):
        raise ValueError(f"Receipts CID {cid} did not resolve to a list payload")
    _persist_receipts_locally(cid, receipts)
    return receipts

def compute_merkle_root(leaves: list[str]) -> str:
    if not leaves:
        return sha256_hex("")
    
    level = [normalize_hex(l) for l in leaves]
    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i+1] if i+1 < len(level) else left
            next_level.append(sha256_hex(bytes.fromhex(left[2:]) + bytes.fromhex(right[2:])))
        level = next_level
    return level[0]

def compute_trace_hash(prompt: str, output_hash: str, receipt_root: str, receipts_cid: str, model: str, tool_count: int) -> str:
    obj = {
        "promptHash": sha256_hex(prompt),
        "outputHash": normalize_hex(output_hash),
        "receiptRoot": normalize_hex(receipt_root),
        "receiptsCID": receipts_cid,
        "model": model,
        "toolCount": tool_count
    }
    return sha256_hex(json.dumps(obj, sort_keys=True, separators=(",", ":")))
