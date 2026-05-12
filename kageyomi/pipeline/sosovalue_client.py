import asyncio
import json
import httpx
import os
import time
from typing import Any

class SoSoValueClient:
    def __init__(self):
        self.api_key = os.getenv("SOSOVALUE_API_KEY", "")
        self.base_url = os.getenv("SOSO_BASE_URL", "https://openapi.sosovalue.com/openapi/v1")
        self.requests_per_minute = int(os.getenv("SOSO_REQUESTS_PER_MINUTE", "10"))
        self.lock = asyncio.Lock()
        self.request_times = []
        self.cache: dict[str, tuple[Any, float]] = {}
    
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
