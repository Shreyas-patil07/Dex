import asyncio
import time
from copy import deepcopy
from typing import Any

import httpx


class TMDBError(Exception):
    pass


class TMDBService:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.themoviedb.org/3",
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._transport = transport
        self._client: httpx.AsyncClient | None = None
        self._cache: dict[tuple[str, tuple[tuple[str, str], ...]], tuple[float, dict[str, Any]]] = {}

    async def start(self) -> None:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                transport=self._transport,
            )

    async def close(self) -> None:
        client, self._client = self._client, None
        if client is not None and not client.is_closed:
            await client.aclose()

    @staticmethod
    def _cache_ttl(path: str) -> int:
        if path.startswith("/trending/"):
            return 300
        if path == "/search/multi":
            return 60
        if path.endswith("/watch/providers"):
            return 1800
        if path.startswith(("/movie/", "/tv/")):
            return 21600
        return 0

    @staticmethod
    def _cache_key(
        path: str,
        params: dict[str, Any] | None,
    ) -> tuple[str, tuple[tuple[str, str], ...]]:
        normalized = tuple(sorted((str(key), str(value)) for key, value in (params or {}).items()))
        return path, normalized

    async def _request(
        self,
        client: httpx.AsyncClient,
        path: str,
        query: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = await client.get(f"{self.base_url}{path}", params=query)
        except httpx.HTTPError as exc:
            raise TMDBError("TMDB service is temporarily unavailable") from exc

        if response.status_code >= 400:
            raise TMDBError(f"TMDB request failed with status {response.status_code}")

        try:
            payload = response.json()
        except ValueError as exc:
            raise TMDBError("TMDB returned an invalid response") from exc

        if not isinstance(payload, dict):
            raise TMDBError("TMDB returned an invalid response")
        return payload

    async def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.api_key:
            raise TMDBError("TMDB_API_KEY is not configured")

        cache_ttl = self._cache_ttl(path)
        cache_key = self._cache_key(path, params)
        now = time.monotonic()
        cached = self._cache.get(cache_key)
        if cached is not None:
            created_at, value = cached
            if now - created_at < cache_ttl:
                return deepcopy(value)
            self._cache.pop(cache_key, None)

        query = {"api_key": self.api_key, **(params or {})}
        if self._client is None or self._client.is_closed:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                transport=self._transport,
            ) as client:
                payload = await self._request(client, path, query)
        else:
            payload = await self._request(self._client, path, query)

        if cache_ttl:
            self._cache[cache_key] = (time.monotonic(), deepcopy(payload))
        return payload

    async def get_many(self, *requests: tuple[str, dict[str, Any] | None]) -> list[dict[str, Any]]:
        return list(await asyncio.gather(*(self.get(path, params) for path, params in requests)))

    async def trending(self, media_type: str = "all", time_window: str = "day") -> dict[str, Any]:
        if media_type not in {"all", "movie", "tv"}:
            raise ValueError("media_type must be all, movie, or tv")
        if time_window not in {"day", "week"}:
            raise ValueError("time_window must be day or week")

        first_page, second_page = await asyncio.gather(
            self.get(f"/trending/{media_type}/{time_window}", {"page": 1}),
            self.get(f"/trending/{media_type}/{time_window}", {"page": 2}),
        )
        results = (first_page.get("results") or []) + (second_page.get("results") or [])
        return {
            **first_page,
            "results": results[:24],
        }

    async def search(self, query: str, page: int = 1) -> dict[str, Any]:
        if not query.strip():
            return {"results": [], "total_pages": 0, "total_results": 0, "page": page}

        return await self.get("/search/multi", {"query": query, "page": page, "include_adult": False})
