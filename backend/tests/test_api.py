from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from google.api_core.exceptions import AlreadyExists
from google.cloud import firestore

import app.main as main
from app.firestore import get_firestore
from app.services import taste


class FakeSnapshot:
    def __init__(self, document_id, data):
        self.id = document_id
        self._data = deepcopy(data)
        self.exists = data is not None

    def to_dict(self):
        return deepcopy(self._data) if self.exists else None


class FakeDocumentReference:
    def __init__(self, database, path):
        self.database = database
        self.path = path

    async def get(self, transaction=None):
        return FakeSnapshot(self.path[-1], self.database.documents.get(self.path))

    async def set(self, data):
        self.database.documents[self.path] = deepcopy(data)

    async def create(self, data):
        if self.path in self.database.documents:
            raise AlreadyExists("Document already exists")
        self.database.documents[self.path] = deepcopy(data)

    async def update(self, data):
        if self.path not in self.database.documents:
            raise KeyError("Document does not exist")
        self.database.documents[self.path].update(deepcopy(data))

    async def delete(self):
        self.database.documents.pop(self.path, None)

    def collection(self, name):
        return FakeCollection(self.database, self.path + (name,))


class FakeCollection:
    def __init__(self, database, path):
        self.database = database
        self.path = path

    def document(self, document_id):
        return FakeDocumentReference(self.database, self.path + (document_id,))

    async def stream(self):
        for path, data in list(self.database.documents.items()):
            if len(path) == len(self.path) + 1 and path[: len(self.path)] == self.path:
                yield FakeSnapshot(path[-1], data)


class FakeFirestore:
    def __init__(self):
        self.documents = {}

    def collection(self, name):
        return FakeCollection(self, (name,))


class FakeTransaction:
    def __init__(self, database):
        self.database = database
        self.mutations = []

    def set(self, reference, data, merge=False):
        self.mutations.append(("set", reference.path, deepcopy(data), merge))

    def delete(self, reference):
        self.mutations.append(("delete", reference.path, None, False))

    def commit(self):
        for operation, path, data, merge in self.mutations:
            if operation == "delete":
                self.database.documents.pop(path, None)
                continue

            document = deepcopy(self.database.documents.get(path, {})) if merge else {}
            for key, value in data.items():
                if isinstance(value, firestore.Increment):
                    document[key] = float(document.get(key, 0.0) or 0.0) + value.value
                else:
                    document[key] = deepcopy(value)
            self.database.documents[path] = document


@pytest.fixture
def api_client(monkeypatch):
    database = FakeFirestore()

    async def fake_run_transaction(db, operation):
        transaction = FakeTransaction(db)
        result = await operation(transaction)
        transaction.commit()
        return result

    monkeypatch.setattr(taste, "run_transaction", fake_run_transaction)
    main.limiter._storage.reset()
    main.app.dependency_overrides[get_firestore] = lambda: database
    monkeypatch.setattr(
        main,
        "verify_firebase_token",
        lambda token: {"uid": token, "email": f"{token}@example.com"},
    )
    try:
        with TestClient(main.app) as client:
            client.database = database
            yield client
    finally:
        main.app.dependency_overrides.clear()


def auth_headers(uid):
    return {"Authorization": f"Bearer {uid}"}


def sync_account(client, uid, display_name=None):
    response = client.post(
        "/api/auth/sync",
        headers=auth_headers(uid),
        json={"display_name": display_name},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_health_endpoint_accepts_head_only(api_client):
    head_response = api_client.head("/api/health")
    get_response = api_client.get("/api/health")

    assert head_response.status_code == 200
    assert head_response.content == b""
    assert get_response.status_code == 405


def test_account_sync_does_not_require_email_verified_claim(api_client):
    # The mocked decoded token intentionally omits email_verified. Dex has no
    # email-verification requirement, but still requires a valid bearer token.
    data = sync_account(api_client, "alice", "Alice")
    assert data["id"] == "alice"
    assert data["email"] == "alice@example.com"
    assert data["username"] is None


def test_username_is_unique_case_insensitively(api_client):
    sync_account(api_client, "alice")
    sync_account(api_client, "bob")

    first = api_client.post(
        "/api/auth/username",
        headers=auth_headers("alice"),
        json={"username": "FilmFan"},
    )
    second = api_client.post(
        "/api/auth/username",
        headers=auth_headers("bob"),
        json={"username": "filmfan"},
    )

    assert first.status_code == 200
    assert first.json()["username"] == "filmfan"
    assert second.status_code == 409


def test_watch_crud_is_isolated_by_firebase_uid(api_client):
    sync_account(api_client, "alice")
    sync_account(api_client, "bob")

    payload = {
        "tmdb_id": 550,
        "media_type": "movie",
        "title": "Fight Club",
        "status": "want_to_watch",
    }
    created = api_client.post("/api/watches", headers=auth_headers("alice"), json=payload)
    assert created.status_code == 201
    watch_id = created.json()["id"]

    duplicate = api_client.post("/api/watches", headers=auth_headers("alice"), json=payload)
    assert duplicate.status_code == 409

    alice_watches = api_client.get("/api/watches", headers=auth_headers("alice"))
    bob_watches = api_client.get("/api/watches", headers=auth_headers("bob"))
    assert alice_watches.status_code == 200
    assert len(alice_watches.json()) == 1
    assert bob_watches.status_code == 200
    assert bob_watches.json() == []

    updated = api_client.patch(
        f"/api/watches/{watch_id}",
        headers=auth_headers("alice"),
        json={"status": "watched"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "watched"

    deleted = api_client.delete(f"/api/watches/{watch_id}", headers=auth_headers("alice"))
    assert deleted.status_code == 204
    assert api_client.get("/api/watches", headers=auth_headers("alice")).json() == []



def test_watched_title_updates_positive_and_negative_vectors_atomically(api_client, monkeypatch):
    sync_account(api_client, "taste-user")

    async def fake_get_features(db, tmdb_service, media_type, tmdb_id):
        assert media_type == "movie"
        assert tmdb_id == 550
        return {
            "genres": ["18"],
            "keywords": ["100", "200"],
            "people": ["7467"],
            "decades": ["1990s"],
        }

    monkeypatch.setattr(main.tmdb_catalog, "get_features", fake_get_features)

    created = api_client.post(
        "/api/watches",
        headers=auth_headers("taste-user"),
        json={
            "tmdb_id": 550,
            "media_type": "movie",
            "title": "Fight Club",
            "status": "watched",
            "rating": 9.0,
        },
    )
    assert created.status_code == 201, created.text

    database = api_client.database
    watch_path = ("users", "taste-user", "watches", "movie_550")
    profile_path = ("users", "taste-user", "taste", "profile")
    genre_path = ("users", "taste-user", "taste_vectors", "genres", "features", "18")
    assert database.documents[profile_path]["profiled_watch_count"] == 1
    assert database.documents[profile_path]["profiled_rated_count"] == 1
    assert database.documents[genre_path]["positive_sum"] == pytest.approx(7 / 9)
    assert database.documents[watch_path]["taste_contribution"]["direction"] == "positive"

    updated = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
        json={"rating": 2.0},
    )
    assert updated.status_code == 200, updated.text
    vector = database.documents[genre_path]
    assert vector["positive_sum"] == pytest.approx(0.0, abs=1e-10)
    assert vector["negative_sum"] == pytest.approx(7 / 11)
    assert database.documents[watch_path]["taste_contribution"]["direction"] == "negative"

    moved_to_watchlist = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
        json={"status": "want_to_watch"},
    )
    assert moved_to_watchlist.status_code == 200
    assert database.documents[profile_path]["profiled_watch_count"] == 0
    assert database.documents[genre_path]["negative_sum"] == pytest.approx(0.0, abs=1e-10)

    moved_back = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
        json={"status": "watched"},
    )
    assert moved_back.status_code == 200
    assert database.documents[profile_path]["profiled_watch_count"] == 1
    assert database.documents[genre_path]["negative_sum"] == pytest.approx(7 / 11)

    deleted = api_client.delete(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
    )
    assert deleted.status_code == 204
    assert database.documents[profile_path]["profiled_watch_count"] == 0
    assert database.documents[genre_path]["negative_sum"] == pytest.approx(0.0, abs=1e-10)


def test_search_query_and_page_are_bounded(api_client):
    too_long = api_client.get("/api/search", params={"query": "x" * 101})
    too_high = api_client.get("/api/search", params={"query": "Dune", "page": 501})

    assert too_long.status_code == 422
    assert too_high.status_code == 422

def test_public_search_is_rate_limited(api_client):
    statuses = [
        api_client.get("/api/search", params={"query": "Dune"}).status_code
        for _ in range(31)
    ]

    assert statuses[-1] == 429
    assert statuses.count(429) == 1


def test_search_supports_all_movies_and_series(api_client, monkeypatch):
    calls = []

    async def fake_search(query, page, media_type="all"):
        calls.append(media_type)
        if media_type == "all":
            return {"results": [
                {"id": 1, "media_type": "movie"},
                {"id": 2, "media_type": "tv"},
                {"id": 3, "media_type": "person"},
            ]}
        return {"results": [{"id": 10, "title": "Filtered result"}]}

    monkeypatch.setattr(main.tmdb, "search", fake_search)
    all_results = api_client.get("/api/search", params={"query": "Dune"})
    movie_results = api_client.get("/api/search", params={"query": "Dune", "media_type": "movie"})
    series_results = api_client.get("/api/search", params={"query": "Dune", "media_type": "tv"})
    invalid_type = api_client.get("/api/search", params={"query": "Dune", "media_type": "person"})

    assert all_results.status_code == 200
    assert [item["media_type"] for item in all_results.json()["results"]] == ["movie", "tv"]
    assert movie_results.json()["results"][0]["media_type"] == "movie"
    assert series_results.json()["results"][0]["media_type"] == "tv"
    assert invalid_type.status_code == 422
    assert calls == ["all", "movie", "tv"]
