import asyncio

import httpx
import pytest

from app.services.tmdb import TMDBError, TMDBService


def run(coro):
    return asyncio.run(coro)


def test_trending_results_are_cached_and_returned_without_shared_mutation():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        page = int(request.url.params["page"])
        return httpx.Response(200, json={"page": page, "results": [{"id": page}]})

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        await service.start()
        try:
            first = await service.trending("movie", "week")
            first["results"].clear()
            second = await service.trending("movie", "week")

            assert len(calls) == 2
            assert len(second["results"]) == 2
            assert [item["id"] for item in second["results"]] == [1, 2]
        finally:
            await service.close()

    run(scenario())


def test_upstream_http_errors_are_normalized():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"status_message": "rate limited"})

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        await service.start()
        try:
            with pytest.raises(TMDBError, match="status 429"):
                await service.get("/search/multi", {"query": "Dune"})
        finally:
            await service.close()

    run(scenario())


def test_upstream_network_errors_are_normalized():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        await service.start()
        try:
            with pytest.raises(TMDBError, match="temporarily unavailable"):
                await service.get("/search/multi", {"query": "Dune"})
        finally:
            await service.close()

    run(scenario())


def test_invalid_upstream_json_is_normalized():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"not-json")

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        await service.start()
        try:
            with pytest.raises(TMDBError, match="invalid response"):
                await service.get("/movie/10")
        finally:
            await service.close()

    run(scenario())
