from datetime import datetime, timedelta, timezone
import asyncio

import pytest

from app.services.taste import (
    GROUP_WEIGHTS,
    build_taste_contribution,
    rating_to_sentiment,
)
from app.services.tmdb_catalog import TMDBCatalog, extract_taste_features
from app.services.tmdb import TMDBError


def test_rating_sentiment_uses_fixed_neutral_baseline():
    assert rating_to_sentiment(0) == pytest.approx(-1.0)
    assert rating_to_sentiment(5.5) == pytest.approx(0.0)
    assert rating_to_sentiment(10) == pytest.approx(1.0)
    assert rating_to_sentiment(2) == pytest.approx(-7 / 11)
    assert rating_to_sentiment(9) == pytest.approx(7 / 9)
    assert rating_to_sentiment(None) == pytest.approx(0.15)


def test_contribution_is_l2_normalized_with_separate_signed_direction():
    features = {
        "genres": ["18", "53", "18"],
        "keywords": ["100", "200"],
        "people": ["7467"],
        "decades": ["1990s"],
    }

    positive = build_taste_contribution(9.0, features)
    negative = build_taste_contribution(2.0, features)

    assert positive["direction"] == "positive"
    assert positive["weights"]["genres"]["18"] == pytest.approx((7 / 9) / (2 ** 0.5))
    assert positive["weights"]["keywords"]["100"] == pytest.approx((7 / 9) / (2 ** 0.5))
    assert negative["direction"] == "negative"
    assert negative["weights"]["genres"]["18"] == pytest.approx((7 / 11) / (2 ** 0.5))
    assert positive["rated"] is True
    assert GROUP_WEIGHTS == {
        "genres": 1.0,
        "keywords": 1.2,
        "people": 1.0,
        "decades": 0.35,
    }


def test_neutral_rating_and_empty_metadata_do_not_create_a_vector():
    assert build_taste_contribution(5.5, {"genres": ["18"]}) is None
    assert build_taste_contribution(9.0, {}) is None


def test_unrated_watched_title_creates_a_small_positive_signal():
    contribution = build_taste_contribution(None, {"genres": ["18"]})
    assert contribution["sentiment"] == pytest.approx(0.15)
    assert contribution["rated"] is False
    assert contribution["weights"]["genres"]["18"] == pytest.approx(0.15)


def test_extract_movie_features_uses_genres_keywords_directors_and_decade():
    details = {
        "genres": [{"id": 18}, {"id": 53}],
        "keywords": {"keywords": [{"id": 200}, {"id": 100}]},
        "credits": {
            "crew": [
                {"id": 7467, "job": "Director"},
                {"id": 12, "job": "Producer"},
            ]
        },
        "release_date": "1999-10-15",
    }

    assert extract_taste_features(details, "movie") == {
        "genres": ["18", "53"],
        "keywords": ["100", "200"],
        "people": ["7467"],
        "decades": ["1990s"],
    }


def test_extract_tv_features_uses_creators_and_tv_keyword_shape():
    details = {
        "genres": [{"id": 18}],
        "keywords": {"results": [{"id": 300}]},
        "created_by": [{"id": 91}, {"id": 92}],
        "first_air_date": "2021-02-01",
    }

    assert extract_taste_features(details, "tv") == {
        "genres": ["18"],
        "keywords": ["300"],
        "people": ["91", "92"],
        "decades": ["2020s"],
    }


class FakeSnapshot:
    def __init__(self, data):
        self.exists = data is not None
        self._data = data

    def to_dict(self):
        return self._data


class FakeDocumentReference:
    def __init__(self, database, path):
        self.database = database
        self.path = path

    async def get(self):
        return FakeSnapshot(self.database.documents.get(self.path))

    async def set(self, data):
        self.database.documents[self.path] = data


class FakeCollection:
    def __init__(self, database, path):
        self.database = database
        self.path = path

    def document(self, document_id):
        return FakeDocumentReference(self.database, self.path + (document_id,))


class FakeDatabase:
    def __init__(self):
        self.documents = {}

    def collection(self, name):
        return FakeCollection(self, (name,))


def test_tmdb_metadata_is_shared_and_reused_from_firestore():
    database = FakeDatabase()
    calls = []

    class FakeTMDB:
        async def get(self, path, params):
            calls.append((path, params))
            return {
                "genres": [{"id": 18}],
                "keywords": {"keywords": [{"id": 100}]},
                "credits": {"crew": [{"id": 7467, "job": "Director"}]},
                "release_date": "1999-10-15",
                "title": "Fight Club",
            }

    async def scenario():
        catalog = TMDBCatalog()
        first = await catalog.get_features(database, FakeTMDB(), "movie", 550)
        second = await catalog.get_features(database, FakeTMDB(), "movie", 550)
        assert first == second
        assert len(calls) == 1
        assert calls[0] == (
            "/movie/550",
            {"append_to_response": "keywords,credits"},
        )
        cached = database.documents[("tmdb_catalog", "movie_550")]
        assert cached["catalog_version"] == 1
        assert cached["features"] == first

    asyncio.run(scenario())


def test_tmdb_catalog_uses_stale_cache_if_upstream_is_unavailable():
    database = FakeDatabase()
    database.documents[("tmdb_catalog", "tv_100")] = {
        "catalog_version": 1,
        "features": {"genres": ["18"], "keywords": [], "people": ["91"], "decades": ["2020s"]},
        "fetched_at": datetime.now(timezone.utc) - timedelta(days=181),
    }

    class BrokenTMDB:
        async def get(self, path, params):
            raise TMDBError("unavailable")

    async def scenario():
        features = await TMDBCatalog().get_features(database, BrokenTMDB(), "tv", 100)
        assert features["people"] == ["91"]

    asyncio.run(scenario())
