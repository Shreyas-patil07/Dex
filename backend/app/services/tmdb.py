import asyncio
from typing import Any

import httpx


class TMDBError(Exception):
    pass


class TMDBService:
    def __init__(self, api_key: str, base_url: str = "https://api.themoviedb.org/3"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.api_key:
            raise TMDBError("TMDB_API_KEY is not configured")
        query = {"api_key": self.api_key, **(params or {})}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}{path}", params=query)
        if response.status_code >= 400:
            raise TMDBError(f"TMDB request failed with status {response.status_code}")
        return response.json()

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
