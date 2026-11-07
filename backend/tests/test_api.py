from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from google.api_core.exceptions import AlreadyExists
from google.cloud import firestore

import app.main as main
from app.firestore import get_firestore
from app.services import taste
from app.services.tmdb import TMDBNotFoundError


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

    def where(self, field, operator, value):
        return FakeQuery(self).where(field, operator, value)

    def order_by(self, field, direction=None):
        return FakeQuery(self).order_by(field, direction)

    async def stream(self):
        for path, data in list(self.database.documents.items()):
            if len(path) == len(self.path) + 1 and path[: len(self.path)] == self.path:
                yield FakeSnapshot(path[-1], data)




class FakeQuery:
    def __init__(self, collection):
        self.collection = collection
        self.cursor = None
        self.page_size = None
        self.filter_field = None
        self.filter_value = None
        self.order_field = "__name__"
        self.descending = False

    def where(self, field, operator, value):
        self.filter_field = field
        self.filter_operator = operator
        self.filter_value = value
        return self

    def order_by(self, field, direction=None):
        self.order_field = field
        self.descending = direction == firestore.Query.DESCENDING
        return self

    def start_after(self, snapshot):
        self.cursor = snapshot.id
        return self

    def limit(self, amount):
        self.page_size = amount
        return self

    async def stream(self):
        entries = []
        for path, data in self.collection.database.documents.items():
            if len(path) != len(self.collection.path) + 1 or path[:-1] != self.collection.path:
                continue
            if self.filter_field is not None and data.get(self.filter_field) != self.filter_value:
                continue
            snapshot = FakeSnapshot(path[-1], data)
            snapshot.reference = FakeDocumentReference(self.collection.database, path)
            entries.append(snapshot)

        if self.order_field == "__name__":
            entries.sort(key=lambda snapshot: snapshot.id, reverse=self.descending)
        else:
            entries.sort(
                key=lambda snapshot: (
                    (snapshot.to_dict() or {}).get(self.order_field),
                    snapshot.id,
                ),
                reverse=self.descending,
            )

        if self.cursor:
            cursor_index = next(
                (index for index, item in enumerate(entries) if item.id == self.cursor),
                None,
            )
            if cursor_index is not None:
                entries = entries[cursor_index + 1:]

        for snapshot in entries[:self.page_size]:
            yield snapshot


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
    monkeypatch.setattr(main, "run_transaction", fake_run_transaction)
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


def test_health_endpoint_reports_deployed_api_version(api_client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "test-source-commit")
    head_response = api_client.head("/api/health")
    get_response = api_client.get("/api/health")

    assert head_response.status_code == 200
    assert head_response.content == b""
    assert get_response.status_code == 200
    assert get_response.json() == {
        "status": "ok",
        "service": "dex-api",
        "version": "0.5.1",
        "source_commit": "test-source-commit",
        "watch_write_endpoint": "POST /api/watches",
    }


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





def test_username_rejects_firestore_reserved_ids_and_names(api_client):
    sync_account(api_client, "reserved-user")

    for username in ("__abc__", "admin", "root", "profile"):
        response = api_client.post(
            "/api/auth/username",
            headers=auth_headers("reserved-user"),
            json={"username": username},
        )
        assert response.status_code == 422

    assert api_client.get(
        "/api/auth/username/available",
        params={"username": "__abc__"},
    ).json() == {"available": False}
    assert api_client.get(
        "/api/auth/username/available",
        params={"username": "admin"},
    ).json() == {"available": False}


def test_username_availability_is_rate_limited(api_client):
    statuses = [
        api_client.get(
            "/api/auth/username/available",
            params={"username": f"filmfan{index}"},
        ).status_code
        for index in range(31)
    ]
    assert statuses[:20] == [200] * 20
    assert statuses[20:] == [429] * 11


def test_username_rename_transaction_releases_old_claim(api_client):
    sync_account(api_client, "alice")
    sync_account(api_client, "bob")

    first = api_client.post(
        "/api/auth/username",
        headers=auth_headers("alice"),
        json={"username": "FilmFan"},
    )
    renamed = api_client.post(
        "/api/auth/username",
        headers=auth_headers("alice"),
        json={"username": "Cinephile"},
    )
    claimed_old = api_client.post(
        "/api/auth/username",
        headers=auth_headers("bob"),
        json={"username": "FilmFan"},
    )

    assert first.status_code == 200
    assert renamed.status_code == 200
    assert renamed.json()["username"] == "cinephile"
    assert claimed_old.status_code == 200
    assert api_client.database.documents[("usernames", "cinephile")]["firebase_uid"] == "alice"
    assert api_client.database.documents[("usernames", "filmfan")]["firebase_uid"] == "bob"


def test_watching_status_is_saved_without_taste_signal_until_marked_watched(api_client, monkeypatch):
    sync_account(api_client, "watching-user")
    feature_calls = []

    async def fake_get_features(db, tmdb_service, media_type, tmdb_id):
        feature_calls.append((media_type, tmdb_id))
        return {
            "genres": ["18"],
            "keywords": ["100", "101", "102", "103", "104", "105"],
            "people": ["7467"],
            "decades": ["2020s"],
        }

    monkeypatch.setattr(main.tmdb_catalog, "get_features", fake_get_features)

    statuses = api_client.get("/api/watch-statuses")
    assert statuses.status_code == 200
    assert {item["value"] for item in statuses.json()["statuses"]} == {
        "watched", "watching", "want_to_watch", "in_future"
    }

    created = api_client.post(
        "/api/watches",
        headers=auth_headers("watching-user"),
        json={
            "tmdb_id": 550,
            "media_type": "movie",
            "title": "Fight Club",
            "status": "watching",
            "rating": 9.0,
        },
    )

    assert created.status_code == 201, created.text
    assert created.json()["status"] == "watching"
    assert created.json()["watched_at"] is None
    assert feature_calls == []

    watch_path = ("users", "watching-user", "watches", "movie_550")
    profile_path = ("users", "watching-user", "taste", "profile")
    stored = api_client.database.documents[watch_path]
    assert stored["taste_metadata_status"] == "not_applicable"
    assert stored["taste_contribution"] is None
    assert api_client.database.documents[profile_path].get("profiled_watch_count", 0) == 0

    moved_to_watched = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("watching-user"),
        json={"status": "watched"},
    )

    assert moved_to_watched.status_code == 200, moved_to_watched.text
    assert moved_to_watched.json()["status"] == "watched"
    assert moved_to_watched.json()["watched_at"] is not None
    assert feature_calls == [("movie", 550)]
    assert api_client.database.documents[watch_path]["taste_contribution"]["direction"] == "positive"
    assert api_client.database.documents[profile_path]["profiled_watch_count"] == 1


def test_taste_profile_returns_signed_labelled_signals_without_writes(api_client):
    sync_account(api_client, "taste-dna-user")
    database = api_client.database
    now = main.datetime.now(main.timezone.utc)

    database.documents[("users", "taste-dna-user", "watches", "movie_1")] = {
        "tmdb_id": 1,
        "media_type": "movie",
        "title": "Positive signal",
        "status": "watched",
        "rating": 9.0,
        "watched_at": now,
        "taste_metadata_status": "ready",
        "taste_features": {
            "genres": ["18"],
            "keywords": ["100"],
            "people": ["7467"],
            "decades": ["1990s"],
        },
        "taste_contribution": {
            "direction": "positive",
            "rated": True,
            "weights": {
                "genres": {"18": 0.8},
                "keywords": {
                    "100": 0.7,
                    "101": 0.6,
                    "102": 0.5,
                    "103": 0.4,
                    "104": 0.3,
                    "105": 0.2,
                },
                "people": {"7467": 0.6},
                "decades": {"1990s": 0.5},
            },
        },
    }
    database.documents[("users", "taste-dna-user", "watches", "movie_2")] = {
        "tmdb_id": 2,
        "media_type": "movie",
        "title": "Lower-rated signal",
        "status": "watched",
        "rating": 2.0,
        "watched_at": now,
        "taste_metadata_status": "ready",
        "taste_features": {
            "genres": ["27"],
            "keywords": ["200"],
            "people": ["999"],
            "decades": ["2000s"],
        },
        "taste_contribution": {
            "direction": "negative",
            "rated": True,
            "weights": {
                "genres": {"27": 0.7},
                "keywords": {"200": 0.6},
                "people": {"999": 0.5},
                "decades": {"2000s": 0.4},
            },
        },
    }
    database.documents[("users", "taste-dna-user", "watches", "movie_3")] = {
        "tmdb_id": 3,
        "media_type": "movie",
        "title": "Currently watching",
        "status": "watching",
        "taste_features": {"genres": ["18"]},
        "taste_contribution": {
            "direction": "positive",
            "weights": {"genres": {"18": 10.0}},
        },
    }
    database.documents[("users", "taste-dna-user", "taste", "profile")] = {
        "profile_version": 4,
    }
    database.documents[("tmdb_catalog", "movie_1")] = {
        "labels": {
            "genres": {"18": "Drama"},
            "keywords": {
                "100": "psychological",
                "101": "based on comic",
                "102": "superhero",
                "103": "marvel cinematic universe (mcu)",
                "104": "aftercreditsstinger",
                "105": "post-credits scene",
            },
            "people": {"7467": "David Fincher"},
            "decades": {"1990s": "1990s"},
        },
    }
    database.documents[("tmdb_catalog", "movie_2")] = {
        "labels": {
            "genres": {"27": "Horror"},
            "keywords": {"200": "Supernatural"},
            "people": {"999": "Example Creator"},
            "decades": {"2000s": "2000s"},
        },
    }
    before = deepcopy(database.documents)

    response = api_client.get(
        "/api/taste/profile",
        headers=auth_headers("taste-dna-user"),
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["model_version"] == 1
    assert payload["profile_version"] == 4
    assert payload["overview"] == {
        "watched_titles": 2,
        "profiled_titles": 2,
        "rated_titles": 2,
        "rated_profiled_titles": 2,
        "unrated_profiled_titles": 0,
        "metadata_ready_titles": 2,
        "pending_titles": 0,
        "metadata_unavailable_titles": 0,
        "coverage_percent": 100.0,
        "recent_profiled_titles": 2,
    }

    groups = {group["key"]: group for group in payload["groups"]}
    assert groups["genres"]["positive"][0]["label"] == "Drama"
    assert groups["genres"]["lower_rated"][0]["label"] == "Horror"
    assert groups["genres"]["positive"][0]["watch_count"] == 1
    theme_labels = {item["label"]: item for item in groups["keywords"]["positive"]}
    assert set(theme_labels) == {
        "Psychological",
        "Comic-book adaptation",
        "Superheroes",
        "Marvel Cinematic Universe (MCU)",
    }
    assert theme_labels["Psychological"]["watch_count"] == 1
    assert "Aftercreditsstinger" not in theme_labels
    assert "Post-Credits Scene" not in theme_labels
    assert groups["people"]["positive"][0]["label"] == "David Fincher"
    assert groups["decades"]["positive"][0]["label"] == "1990s"
    assert groups["genres"]["recent"][0]["label"] == "Drama"
    assert database.documents == before


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
    assert len(alice_watches.json()['items']) == 1
    assert bob_watches.status_code == 200
    assert bob_watches.json()['items'] == []

    updated = api_client.patch(
        f"/api/watches/{watch_id}",
        headers=auth_headers("alice"),
        json={"status": "watched"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "watched"
    assert updated.json()["watched_at"] is not None

    deleted = api_client.delete(f"/api/watches/{watch_id}", headers=auth_headers("alice"))
    assert deleted.status_code == 204
    assert api_client.get("/api/watches", headers=auth_headers("alice")).json()["items"] == []




def test_get_watch_returns_existing_status_and_is_user_scoped(api_client):
    sync_account(api_client, "alice")
    sync_account(api_client, "bob")
    created = api_client.post(
        "/api/watches",
        headers=auth_headers("alice"),
        json={
            "tmdb_id": 550,
            "media_type": "movie",
            "title": "Fight Club",
            "status": "want_to_watch",
        },
    )
    assert created.status_code == 201

    found = api_client.get(
        "/api/watches/movie_550",
        headers=auth_headers("alice"),
    )
    missing_for_other_user = api_client.get(
        "/api/watches/movie_550",
        headers=auth_headers("bob"),
    )
    missing_title = api_client.get(
        "/api/watches/movie_999",
        headers=auth_headers("alice"),
    )

    assert found.status_code == 200
    assert found.json()["id"] == "movie_550"
    assert found.json()["status"] == "want_to_watch"
    assert missing_for_other_user.status_code == 404
    assert missing_title.status_code == 404


def test_watched_title_updates_recompute_from_stored_contributions(api_client, monkeypatch):
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
    assert database.documents[profile_path]["profiled_watch_count"] == 1
    assert database.documents[profile_path]["profiled_rated_count"] == 1
    assert database.documents[profile_path]["profile_version"] == 1
    assert not any(path[:3] == ("users", "taste-user", "taste_vectors") for path in database.documents)
    assert database.documents[watch_path]["taste_contribution"]["direction"] == "positive"

    updated = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
        json={"rating": 2.0},
    )
    assert updated.status_code == 200, updated.text
    assert database.documents[profile_path]["profile_version"] == 2
    assert database.documents[watch_path]["taste_contribution"]["direction"] == "negative"

    moved_to_watchlist = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
        json={"status": "want_to_watch"},
    )
    assert moved_to_watchlist.status_code == 200
    assert database.documents[profile_path]["profile_version"] == 3
    assert database.documents[profile_path]["profiled_watch_count"] == 0

    moved_back = api_client.patch(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
        json={"status": "watched"},
    )
    assert moved_back.status_code == 200
    assert database.documents[profile_path]["profile_version"] == 4
    assert database.documents[profile_path]["profiled_watch_count"] == 1

    deleted = api_client.delete(
        "/api/watches/movie_550",
        headers=auth_headers("taste-user"),
    )
    assert deleted.status_code == 204
    assert database.documents[profile_path]["profile_version"] == 5
    assert database.documents[profile_path]["profiled_watch_count"] == 0



def test_historical_backfill_is_paginated_idempotent_without_vectors(api_client, monkeypatch):
    sync_account(api_client, "backfill-user")
    database = api_client.database

    legacy_path = ("users", "backfill-user", "watches", "movie_550")
    database.documents[legacy_path] = {
        "tmdb_id": 550,
        "media_type": "movie",
        "title": "Fight Club",
        "status": "watched",
        "rating": 9.0,
        "created_at": main.datetime.now(main.timezone.utc),
    }

    calls = []

    async def fake_get_features(db, tmdb_service, media_type, tmdb_id):
        calls.append(tmdb_id)
        return {"genres": ["18"], "keywords": ["100"], "people": ["7467"], "decades": ["1990s"]}

    monkeypatch.setattr(main.tmdb_catalog, "get_features", fake_get_features)

    first = api_client.post(
        "/api/taste/backfill?limit=1",
        headers=auth_headers("backfill-user"),
    )
    assert first.status_code == 200, first.text
    first_data = first.json()
    assert first_data["scanned"] == 1
    assert first_data["enriched"] == 1
    assert first_data["complete"] is True
    assert first_data["next_cursor"] is None
    assert calls == [550]

    profile_path = ("users", "backfill-user", "taste", "profile")
    assert database.documents[profile_path]["profiled_watch_count"] == 1

    second = api_client.post(
        "/api/taste/backfill",
        headers=auth_headers("backfill-user"),
    )
    assert second.status_code == 200
    assert second.json()["skipped"] == 1
    assert calls == [550]
    assert database.documents[profile_path]["profiled_watch_count"] == 1






def test_watch_history_is_cursor_paginated_and_read_only(api_client, monkeypatch):
    sync_account(api_client, "paged-user")
    database = api_client.database
    for tmdb_id in range(550, 555):
        database.documents[("users", "paged-user", "watches", f"movie_{tmdb_id}")] = {
            "tmdb_id": tmdb_id,
            "media_type": "movie",
            "title": f"Movie {tmdb_id}",
            "status": "want_to_watch",
            "created_at": main.datetime(2026, 1, tmdb_id - 549, tzinfo=main.timezone.utc),
        }

    async def forbidden_tmdb_call(*args, **kwargs):
        raise AssertionError("GET /api/watches must not call TMDB")

    monkeypatch.setattr(main.tmdb, "get_many", forbidden_tmdb_call)
    before = {
        path: dict(data)
        for path, data in database.documents.items()
        if path[:3] == ("users", "paged-user", "watches")
    }

    first = api_client.get("/api/watches?limit=2", headers=auth_headers("paged-user"))
    assert first.status_code == 200, first.text
    first_page = first.json()
    assert len(first_page["items"]) == 2
    assert first_page["has_more"] is True
    assert first_page["next_cursor"]

    second = api_client.get(
        "/api/watches",
        params={"limit": 2, "cursor": first_page["next_cursor"]},
        headers=auth_headers("paged-user"),
    )
    assert second.status_code == 200, second.text
    second_page = second.json()
    assert len(second_page["items"]) == 2
    assert second_page["has_more"] is True

    third = api_client.get(
        "/api/watches",
        params={"limit": 2, "cursor": second_page["next_cursor"]},
        headers=auth_headers("paged-user"),
    )
    assert third.status_code == 200, third.text
    assert len(third.json()["items"]) == 1
    assert third.json()["has_more"] is False
    assert third.json()["next_cursor"] is None

    all_ids = [
        item["id"]
        for page in (first_page, second_page, third.json())
        for item in page["items"]
    ]
    assert len(all_ids) == len(set(all_ids)) == 5
    after = {
        path: data
        for path, data in database.documents.items()
        if path[:3] == ("users", "paged-user", "watches")
    }
    assert after == before


def test_watch_history_rejects_invalid_cursor(api_client):
    sync_account(api_client, "cursor-user")
    response = api_client.get(
        "/api/watches?cursor=missing",
        headers=auth_headers("cursor-user"),
    )
    assert response.status_code == 422


def test_watch_create_rejects_invalid_tmdb_ids_and_image_paths(api_client):
    sync_account(api_client, "validation-user")
    headers = auth_headers("validation-user")
    base = {
        "tmdb_id": 550,
        "media_type": "movie",
        "title": "Fight Club",
        "status": "want_to_watch",
    }

    invalid_id = api_client.post("/api/watches", headers=headers, json={**base, "tmdb_id": 0})
    invalid_path = api_client.post(
        "/api/watches",
        headers=headers,
        json={**base, "tmdb_id": 551, "poster_path": "https://example.com/poster.jpg"},
    )
    oversized_path = api_client.post(
        "/api/watches",
        headers=headers,
        json={**base, "tmdb_id": 552, "poster_path": "/" + "x" * 300},
    )

    assert invalid_id.status_code == 422
    assert invalid_path.status_code == 422
    assert oversized_path.status_code == 422


def test_watched_create_returns_404_for_unknown_tmdb_title(api_client, monkeypatch):
    sync_account(api_client, "missing-tmdb")

    async def missing_title(*args, **kwargs):
        raise TMDBNotFoundError("TMDB title was not found")

    monkeypatch.setattr(main.tmdb_catalog, "get_features", missing_title)
    response = api_client.post(
        "/api/watches",
        headers=auth_headers("missing-tmdb"),
        json={
            "tmdb_id": 99999999,
            "media_type": "movie",
            "title": "Unknown title",
            "status": "watched",
        },
    )

    assert response.status_code == 404
    assert ("users", "missing-tmdb", "watches", "movie_99999999") not in api_client.database.documents



def test_backfill_marks_tmdb_404_permanent_and_does_not_retry(api_client, monkeypatch):
    sync_account(api_client, "not-found-backfill")
    database = api_client.database
    watch_path = ("users", "not-found-backfill", "watches", "movie_99999999")
    database.documents[watch_path] = {
        "tmdb_id": 99999999,
        "media_type": "movie",
        "title": "Removed title",
        "status": "watched",
        "created_at": main.datetime.now(main.timezone.utc),
    }
    calls = []

    async def missing_title(*args, **kwargs):
        calls.append(True)
        raise TMDBNotFoundError("TMDB title was not found")

    monkeypatch.setattr(main.tmdb_catalog, "get_features", missing_title)
    first = api_client.post(
        "/api/taste/backfill?limit=10",
        headers=auth_headers("not-found-backfill"),
    )
    second = api_client.post(
        "/api/taste/backfill?limit=10",
        headers=auth_headers("not-found-backfill"),
    )

    assert first.status_code == 200
    assert first.json()["unavailable"] == 1
    assert first.json()["pending"] == 0
    assert second.json()["unavailable"] == 1
    assert calls == [True]
    assert database.documents[watch_path]["taste_metadata_status"] == "not_found"


def test_backfill_fetches_tmdb_metadata_with_bounded_concurrency(api_client, monkeypatch):
    import asyncio

    sync_account(api_client, "concurrent-backfill")
    database = api_client.database
    for tmdb_id in range(100, 108):
        database.documents[("users", "concurrent-backfill", "watches", f"movie_{tmdb_id}")] = {
            "tmdb_id": tmdb_id,
            "media_type": "movie",
            "title": f"Movie {tmdb_id}",
            "status": "watched",
            "created_at": main.datetime.now(main.timezone.utc),
        }

    active = 0
    max_active = 0

    async def fake_get_features(db, tmdb_service, media_type, tmdb_id):
        nonlocal active, max_active
        active += 1
        max_active = max(max_active, active)
        await asyncio.sleep(0.01)
        active -= 1
        return {"genres": ["18"], "keywords": [], "people": [], "decades": []}

    monkeypatch.setattr(main.tmdb_catalog, "get_features", fake_get_features)
    response = api_client.post(
        "/api/taste/backfill?limit=8",
        headers=auth_headers("concurrent-backfill"),
    )

    assert response.status_code == 200
    assert response.json()["enriched"] == 8
    assert 1 < max_active <= 5


def test_recommendations_endpoint_is_authenticated_and_returns_three_slots(api_client, monkeypatch):
    sync_account(api_client, "rec-user")

    async def fake_recommend(db, user_document):
        return {
            "personalized": True,
            "slots": {"safe": {"id": 1}, "adjacent": {"id": 2}, "wildcard": {"id": 3}},
        }

    monkeypatch.setattr(main.recommendation_service, "recommend", fake_recommend)
    unauthorized = api_client.get("/api/recommendations")
    authorized = api_client.get(
        "/api/recommendations",
        headers=auth_headers("rec-user"),
    )

    assert unauthorized.status_code == 401
    assert authorized.status_code == 200
    assert set(authorized.json()["slots"]) == {"safe", "adjacent", "wildcard"}


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




def test_public_search_rate_limit_uses_forwarded_client_ip(api_client, monkeypatch):
    async def fake_search(query, page, media_type):
        return {"results": [], "total_pages": 0, "total_results": 0, "page": page}

    monkeypatch.setattr(main.tmdb, "search", fake_search)
    for _ in range(31):
        response = api_client.get(
            "/api/search",
            params={"query": "Dune"},
            headers={"X-Forwarded-For": "198.51.100.10"},
        )
    assert response.status_code == 429
    isolated = api_client.get(
        "/api/search",
        params={"query": "Dune"},
        headers={"X-Forwarded-For": "198.51.100.11"},
    )
    assert isolated.status_code == 200


def test_watch_creation_rate_limit_is_per_firebase_uid(api_client):
    sync_account(api_client, "alice")
    sync_account(api_client, "bob")
    payload = {
        "media_type": "movie",
        "title": "Rate limited test",
        "status": "want_to_watch",
    }
    for index in range(31):
        response = api_client.post(
            "/api/watches",
            headers=auth_headers("alice"),
            json={**payload, "tmdb_id": 5000 + index},
        )
    assert response.status_code == 429
    bob_response = api_client.post(
        "/api/watches",
        headers=auth_headers("bob"),
        json={**payload, "tmdb_id": 550},
    )
    assert bob_response.status_code == 201


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
