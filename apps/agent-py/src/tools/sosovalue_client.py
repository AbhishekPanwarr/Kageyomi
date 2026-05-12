from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any

import httpx


class RateLimitedClient:
    def __init__(self, base_url: str, api_key: str, requests_per_minute: int = 10):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.requests_per_minute = requests_per_minute
        self.request_times: list[float] = []
        self.lock = asyncio.Lock()

    async def _wait_if_needed(self) -> None:
        async with self.lock:
            now = time.time()
            self.request_times = [entry for entry in self.request_times if now - entry < 60]
            if len(self.request_times) >= self.requests_per_minute:
                wait_time = 60 - (now - self.request_times[0])
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
            self.request_times.append(time.time())

    async def get(self, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        await self._wait_if_needed()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.base_url}/{endpoint.lstrip('/')}",
                params=params or {},
                headers={"x-soso-api-key": self.api_key},
            )
            response.raise_for_status()
            return response.json()


def load_demo_cache() -> dict[str, Any]:
    cache_path = Path(__file__).with_name("cache.json")
    if not cache_path.exists():
        return {}
    return json.loads(cache_path.read_text())


def create_rate_limited_client() -> RateLimitedClient:
    return RateLimitedClient(
        base_url=os.getenv("SOSO_BASE_URL", "https://openapi.sosovalue.com/openapi/v1"),
        api_key=os.getenv("SOSO_API_KEY", ""),
        requests_per_minute=int(os.getenv("SOSO_REQUESTS_PER_MINUTE", "10")),
    )
