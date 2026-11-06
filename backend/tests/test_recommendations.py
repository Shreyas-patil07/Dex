from datetime import datetime, timedelta, timezone

import pytest

from app.services.recommendations import (
    RECENT_HALF_LIFE_DAYS,
    build_recent_profile,
    calculate_idf,
    candidate_pool_percentiles,
    cosine_group_score,
    feature_jaccard,
    mmr_score,
    score_candidate,
)


def test_idf_increases_as_feature_becomes_rarer():
    assert calculate_idf(100, 100) == pytest.approx(1.0)
    assert calculate_idf(100, 10) > calculate_idf(100, 50)
    assert calculate_idf(100, 0) == pytest.approx(1.0)


def test_cosine_score_rewards_positive_and_penalizes_negative_features():
    positive = cosine_group_score({"18": 1.0}, {"53": 1.0}, ["18"])
    negative = cosine_group_score({"18": 1.0}, {"53": 1.0}, ["53"])
    neutral = cosine_group_score({"18": 1.0}, {"53": 1.0}, ["99"])

    assert positive == pytest.approx(2 ** -0.5)
    assert negative == pytest.approx(-(2 ** -0.5))
    assert neutral == pytest.approx(0.0)


def test_candidate_scoring_combines_only_available_feature_groups():
    profile = {
        "genres": {"positive": {"18": 1.0}, "negative": {}},
        "keywords": {"positive": {}, "negative": {}},
        "people": {"positive": {}, "negative": {}},
        "decades": {"positive": {}, "negative": {}},
    }
    score = score_candidate(profile, {"genres": ["18"]}, {"genres": {"18": 2.0}})
    assert score == pytest.approx(1.0)


def test_recent_profile_uses_ninety_day_half_life_and_ignores_watchlist():
    now = datetime(2026, 11, 7, tzinfo=timezone.utc)
    contribution = {
        "direction": "positive",
        "weights": {"genres": {"18": 0.8}},
    }
    watches = [
        {
            "status": "watched",
            "watched_at": now - timedelta(days=RECENT_HALF_LIFE_DAYS),
            "taste_contribution": contribution,
        },
        {
            "status": "want_to_watch",
            "watched_at": now,
            "taste_contribution": contribution,
        },
    ]

    profile, count = build_recent_profile(watches, now=now)
    assert count == 1
    assert profile["genres"]["positive"]["18"] == pytest.approx(0.4)


def test_candidate_percentiles_are_rank_based_and_ties_share_midrank():
    assert candidate_pool_percentiles([0.1, 0.5, 0.9]) == [0, 50, 100]
    assert candidate_pool_percentiles([0.1, 0.1, 0.9]) == [25, 25, 100]
    assert candidate_pool_percentiles([1.0]) == [50]


def test_mmr_penalizes_redundant_candidates():
    diverse = mmr_score(0.7, 0.0)
    redundant = mmr_score(0.9, 1.0)
    assert diverse > redundant
    assert feature_jaccard(
        {"genres": ["18", "53"]},
        {"genres": ["18", "53"]},
    ) == pytest.approx(1.0)
    assert feature_jaccard(
        {"genres": ["18"]},
        {"genres": ["53"]},
    ) == pytest.approx(0.0)


class FakeSnapshot:
    def __init__(self, data):
        self._data = data

    def to_dict(self):
        return self._data


class FakeIdfDocument:
    def __init__(self, database, path):
        self.database = database
        self.path = path

    def collection(self, name):
        return FakeIdfCollection(self.database, self.path + (name,))

    async def get(self):
        self.database.reads += 1
        return FakeSnapshot(self.database.documents.get(self.path))


class FakeIdfCollection:
    def __init__(self, database, path):
        self.database = database
        self.path = path

    def document(self, document_id):
        return FakeIdfDocument(self.database, self.path + (document_id,))


class FakeIdfDatabase:
    def __init__(self):
        self.reads = 0
        self.documents = {
            ("tmdb_feature_stats", "genres"): {"document_count": 100},
            ("tmdb_feature_stats", "genres", "features", "18"): {"document_frequency": 10},
        }

    def collection(self, name):
        return FakeIdfCollection(self, (name,))


def test_idf_cache_reuses_document_frequency_for_five_minutes(monkeypatch):
    from app.services.recommendations import TasteRecommendationService

    database = FakeIdfDatabase()
    service = TasteRecommendationService(None, None)
    profile = {
        group: {"positive": {}, "negative": {}}
        for group in ("genres", "keywords", "people", "decades")
    }
    profile["genres"]["positive"]["18"] = 1.0

    async def scenario():
        first = await service._load_idf(database, profile)
        first_reads = database.reads
        second = await service._load_idf(database, profile)

        assert first["genres"]["18"] == pytest.approx(calculate_idf(100, 10))
        assert second == first
        assert first_reads == 2
        assert database.reads == first_reads

    import asyncio
    asyncio.run(scenario())
