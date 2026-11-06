import asyncio

import httpx
import pytest

from app.services.tmdb import TMDBError, TMDBNotFoundError, TMDBService


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


def test_search_uses_selected_media_type_endpoint():
    paths = []

    def handler(request: httpx.Request) -> httpx.Response:
        paths.append(request.url.path)
        return httpx.Response(200, json={"results": [{"id": 1}]})

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        await service.start()
        try:
            await service.search("Dune", media_type="all")
            await service.search("Dune", media_type="movie")
            await service.search("Dune", media_type="tv")
            assert paths == ["/3/search/multi", "/3/search/movie", "/3/search/tv"]
        finally:
            await service.close()

    run(scenario())



def test_response_cache_uses_bounded_lru_eviction():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        query = request.url.params["query"]
        calls.append(query)
        return httpx.Response(200, json={"results": [{"query": query}]})

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        service.MAX_CACHE_ENTRIES = 2
        await service.start()
        try:
            await service.get("/search/multi", {"query": "first"})
            await service.get("/search/multi", {"query": "second"})
            await service.get("/search/multi", {"query": "first"})
            await service.get("/search/multi", {"query": "third"})

            keys = [key[1][0][1] for key in service._cache.keys()]
            assert keys == ["first", "third"]
            assert len(service._cache) == 2

            await service.get("/search/multi", {"query": "first"})
            assert calls == ["first", "second", "third"]
        finally:
            await service.close()

    run(scenario())



def test_upstream_404_uses_permanent_not_found_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"status_message": "not found"})

    async def scenario():
        service = TMDBService("test-key", transport=httpx.MockTransport(handler))
        await service.start()
        try:
            with pytest.raises(TMDBNotFoundError, match="not found"):
                await service.get("/movie/99999999")
        finally:
            await service.close()

    run(scenario())
