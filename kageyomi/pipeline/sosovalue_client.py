import asyncio
import json
import httpx
import os
import time
from pathlib import Path
from typing import Any

class SoSoValueClient:
    def __init__(self):
        self.api_key = os.getenv("SOSOVALUE_API_KEY", "")
        self.base_url = os.getenv("SOSO_BASE_URL", "https://openapi.sosovalue.com/openapi/v1")
        self.requests_per_minute = int(os.getenv("SOSO_REQUESTS_PER_MINUTE", "10"))
        self.use_mock = os.getenv("KAGEYOMI_USE_MOCK_SOSO", "false").lower() == "true"
        self.mock_file = os.getenv("SOSOVALUE_MOCK_FILE", "mock-sosovalue-responses.json")
        self.lock = asyncio.Lock()
        self.request_times = []
        self.cache: dict[str, tuple[Any, float]] = {}
        self._mock_cache: dict[str, Any] | None = None
    
    async def _wait_rate_limit(self):
        async with self.lock:
            now = time.time()
            self.request_times = [t for t in self.request_times if now - t < 60]
            if len(self.request_times) >= self.requests_per_minute:
                wait_time = 60 - (now - self.request_times[0])
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                now = time.time()
                self.request_times = [t for t in self.request_times if now - t < 60]
            self.request_times.append(time.time())

    async def get(self, endpoint: str, params: dict | None = None) -> dict[str, Any]:
        if params is None:
            params = {}
        if not endpoint.startswith("/"):
            endpoint = f"/{endpoint}"

        if self.use_mock:
            return self._load_mock_response(endpoint, params)

        if not self.api_key:
            raise ValueError("SOSOVALUE_API_KEY is not configured")
        
        cache_key = f"{endpoint}?{json.dumps(params, sort_keys=True)}"
        now = time.time()
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if now - timestamp < 60:
                return data

        await self._wait_rate_limit()
        
        headers = {
            "x-soso-api-key": self.api_key,
            "accept": "application/json",
            "user-agent": "kageyomi-uavp/1.0",
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            for _ in range(3):
                res = await client.get(f"{self.base_url}{endpoint}", params=params, headers=headers)
                if res.status_code == 429:
                    retry_after = int(res.headers.get("retry-after", "5"))
                    await asyncio.sleep(retry_after)
                    continue
                res.raise_for_status()
                data = res.json()
                self.cache[cache_key] = (data, time.time())
                return data
            res.raise_for_status()
        return {}

    def _load_mock_response(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        if self._mock_cache is None:
            mock_path = Path(self.mock_file)
            if not mock_path.is_absolute():
                mock_path = Path.cwd() / mock_path
            if not mock_path.exists():
                raise FileNotFoundError(f"Mock SoSoValue file not found: {mock_path}")
            self._mock_cache = json.loads(mock_path.read_text(encoding="utf-8"))

        key = self._mock_key(endpoint, params)
        if key not in self._mock_cache:
            raise KeyError(f"Missing mock SoSoValue response for key: {key}")
        payload = self._mock_cache[key]
        return payload if isinstance(payload, dict) else {"data": payload}

    @staticmethod
    def _mock_key(endpoint: str, params: dict[str, Any]) -> str:
        if not params:
            return endpoint
        serialized = "&".join(f"{key}={params[key]}" for key in sorted(params))
        return f"{endpoint}?{serialized}"
