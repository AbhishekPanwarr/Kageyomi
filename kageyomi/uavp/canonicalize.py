from __future__ import annotations

import html
import json
import re
from typing import Any

STRIP_FIELDS = {
    "code",
    "message",
    "timestamp",
    "request_id",
    "trace_id",
    "server_time",
    "latency_ms",
    "update_time",
}


def canonicalize_soso_response(data: dict | list | str, data_type: str = "json") -> str:
    payload: Any = data
    if isinstance(data, dict) and "data" in data:
        payload = data["data"]

    if data_type == "text":
        return _canonicalize_text(payload)

    normalized = _normalize_json(_strip_fields(payload))
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"))


def _canonicalize_text(value: Any) -> str:
    text = html.unescape(str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def _strip_fields(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _strip_fields(val) for key, val in value.items() if key not in STRIP_FIELDS}
    if isinstance(value, list):
        return [_strip_fields(item) for item in value]
    return value


def _normalize_json(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, dict):
        return {key: _normalize_json(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_normalize_json(item) for item in value]
    return value
