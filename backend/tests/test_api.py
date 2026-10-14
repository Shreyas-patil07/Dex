from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from google.api_core.exceptions import AlreadyExists

import app.main as main
from app.firestore import get_firestore


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

    async def get(self):
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


@pytest.fixture
def api_client(monkeypatch):
    database = FakeFirestore()
    main.app.dependency_overrides[get_firestore] = lambda: database
    monkeypatch.setattr(
        main,
        "verify_firebase_token",
        lambda token: {"uid": token, "email": f"{token}@example.com"},
    )
    try:
        with TestClient(main.app) as client:
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


def test_search_query_and_page_are_bounded(api_client):
    too_long = api_client.get("/api/search", params={"query": "x" * 101})
    too_high = api_client.get("/api/search", params={"query": "Dune", "page": 501})

    assert too_long.status_code == 422
    assert too_high.status_code == 422
