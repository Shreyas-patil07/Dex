from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone
from math import log, sqrt
from typing import Any

from .taste import FEATURE_GROUPS, GROUP_WEIGHTS
from .tmdb import TMDBError


RECENT_HALF_LIFE_DAYS = 90.0
RECENT_ALL_TIME_BLEND = 0.25
MMR_LAMBDA = 0.45
NEGATIVE_PENALTY = 1.0
PRIMARY_CANDIDATE_LIMIT = 18
WILDCARD_CANDIDATE_LIMIT = 12
ENRICH_CONCURRENCY = 4
RECOMMENDATION_CACHE_TTL_SECONDS = 6 * 60 * 60
EXPLORATION_TOP_K = 5
RELATED_SEED_LIMIT = 4
RELATED_CANDIDATE_PAGES = (1, 2)
RELATED_ENDPOINTS = ("recommendations", "similar")


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
        except ValueError:
            return None
    return None


def _empty_profile() -> dict[str, dict[str, dict[str, float]]]:
    return {
        group: {"positive": {}, "negative": {}}
        for group in FEATURE_GROUPS
    }


def calculate_idf(document_count: int, document_frequency: int) -> float:
    if document_count <= 0 or document_frequency <= 0:
        return 1.0
    bounded_frequency = min(document_frequency, document_count)
    return log((document_count + 1) / (bounded_frequency + 1)) + 1.0


def build_local_idf(
    profile: dict[str, dict[str, dict[str, float]]],
    watches: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> dict[str, dict[str, float]]:
    """Compute feature rarity from this user's watched set and current candidate pool."""
    documents: list[dict[str, set[str]]] = []

    for watch in watches:
        if watch.get("status") != "watched":
            continue
        raw = watch.get("taste_features") or {}
        if not isinstance(raw, dict):
            raw = {}
        contribution = watch.get("taste_contribution") or {}
        weights = contribution.get("weights") or {}
        document = {
            group: set(map(str, raw.get(group, []) or []))
            for group in FEATURE_GROUPS
        }
        for group in FEATURE_GROUPS:
            if not document[group]:
                document[group].update(map(str, (weights.get(group) or {}).keys()))
        if any(document.values()):
            documents.append(document)

    for candidate in candidates:
        features = candidate.get("features") or {}
        documents.append({
            group: set(map(str, features.get(group, []) or []))
            for group in FEATURE_GROUPS
        })

    document_count = len(documents)
    frequencies: dict[str, dict[str, int]] = {
        group: {} for group in FEATURE_GROUPS
    }
    for document in documents:
        for group, feature_ids in document.items():
            for feature_id in feature_ids:
                frequencies[group][feature_id] = frequencies[group].get(feature_id, 0) + 1

    idf: dict[str, dict[str, float]] = {group: {} for group in FEATURE_GROUPS}
    for group in FEATURE_GROUPS:
        feature_ids = (
            set(profile[group]["positive"])
            | set(profile[group]["negative"])
            | set(frequencies[group])
        )
        for feature_id in feature_ids:
            idf[group][feature_id] = calculate_idf(
                document_count,
                frequencies[group].get(feature_id, 0),
            )
    return idf


def build_recent_profile(
    watches: list[dict[str, Any]],
    now: datetime | None = None,
    half_life_days: float = RECENT_HALF_LIFE_DAYS,
) -> tuple[dict[str, dict[str, dict[str, float]]], int]:
    """Rebuild a decayed profile from contribution snapshots, with no history writes."""
    reference_time = now or datetime.now(timezone.utc)
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)

    recent = _empty_profile()
    included = 0
    for watch in watches:
        if watch.get("status") != "watched":
            continue
        contribution = watch.get("taste_contribution")
        if not isinstance(contribution, dict):
            continue

        watched_at = _datetime(watch.get("watched_at")) or _datetime(watch.get("created_at"))
        if watched_at is None:
            continue
        age_days = max(0.0, (reference_time - watched_at).total_seconds() / 86400.0)
        decay = 0.5 ** (age_days / half_life_days)
        direction = contribution.get("direction")
        if direction not in {"positive", "negative"}:
            continue

        has_feature = False
        for group, feature_map in (contribution.get("weights") or {}).items():
            if group not in FEATURE_GROUPS or not isinstance(feature_map, dict):
                continue
            target = recent[group][direction]
            for feature_id, value in feature_map.items():
                weighted_value = _number(value) * decay
                if weighted_value > 0 and feature_id:
                    target[str(feature_id)] = target.get(str(feature_id), 0.0) + weighted_value
                    has_feature = True
        included += int(has_feature)

    return recent, included


def build_all_time_profile(
    watches: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, dict[str, float]]], int]:
    """Rebuild the signed all-time profile from each watch's stored contribution."""
    profile = _empty_profile()
    included = 0
    for watch in watches:
        if watch.get("status") != "watched":
            continue
        contribution = watch.get("taste_contribution")
        if not isinstance(contribution, dict):
            continue
        direction = contribution.get("direction")
        if direction not in {"positive", "negative"}:
            continue
        has_feature = False
        for group, feature_map in (contribution.get("weights") or {}).items():
            if group not in FEATURE_GROUPS or not isinstance(feature_map, dict):
                continue
            target = profile[group][direction]
            for feature_id, value in feature_map.items():
                weighted_value = _number(value)
                if weighted_value > 0 and feature_id:
                    target[str(feature_id)] = target.get(str(feature_id), 0.0) + weighted_value
                    has_feature = True
        included += int(has_feature)
    return profile, included


def cosine_group_score(
    user_positive: dict[str, float],
    user_negative: dict[str, float],
    candidate_features: list[str],
    idf: dict[str, float] | None = None,
) -> float | None:
    """Signed cosine between (positive - negative) user evidence and a title."""
    if not candidate_features:
        return None

    feature_idf = idf or {}
    all_user_ids = set(user_positive) | set(user_negative)
    candidate_ids = set(map(str, candidate_features))
    user_vector = {
        feature_id: (
            user_positive.get(feature_id, 0.0) - NEGATIVE_PENALTY * user_negative.get(feature_id, 0.0)
        ) * feature_idf.get(feature_id, 1.0)
        for feature_id in all_user_ids
    }
    user_norm = sqrt(sum(value * value for value in user_vector.values()))
    if user_norm <= 1e-12:
        return None

    candidate_weights = {
        feature_id: feature_idf.get(feature_id, 1.0)
        for feature_id in candidate_ids
    }
    candidate_norm = sqrt(sum(value * value for value in candidate_weights.values()))
    if candidate_norm <= 1e-12:
        return None

    dot = sum(
        user_vector.get(feature_id, 0.0) * candidate_weights[feature_id]
        for feature_id in candidate_ids
    )
    return max(-1.0, min(1.0, dot / (user_norm * candidate_norm)))


def score_candidate(
    profile: dict[str, dict[str, dict[str, float]]],
    features: dict[str, list[str]],
    idf: dict[str, dict[str, float]],
) -> float | None:
    group_scores: list[tuple[float, float]] = []
    for group in FEATURE_GROUPS:
        score = cosine_group_score(
            profile[group]["positive"],
            profile[group]["negative"],
            features.get(group, []),
            idf.get(group, {}),
        )
        if score is not None:
            group_scores.append((score, GROUP_WEIGHTS[group]))

    if not group_scores:
        return None
    return sum(score * weight for score, weight in group_scores) / sum(
        weight for _, weight in group_scores
    )


def feature_jaccard(
    left: dict[str, list[str]],
    right: dict[str, list[str]],
) -> float:
    weighted: list[tuple[float, float]] = []
    for group in FEATURE_GROUPS:
        left_set = set(left.get(group, []))
        right_set = set(right.get(group, []))
        union = left_set | right_set
        if not union:
            continue
        weighted.append((
            len(left_set & right_set) / len(union),
            GROUP_WEIGHTS[group],
        ))
    if not weighted:
        return 0.0
    return sum(score * weight for score, weight in weighted) / sum(
        weight for _, weight in weighted
    )


def mmr_score(relevance: float, redundancy: float, weight: float = MMR_LAMBDA) -> float:
    relevance_01 = max(0.0, min(1.0, (relevance + 1.0) / 2.0))
    return weight * relevance_01 - (1.0 - weight) * redundancy


def candidate_pool_percentiles(scores: list[float]) -> list[int]:
    """Return mid-rank percentile ranks, not probabilities of liking a title."""
    if not scores:
        return []
    if len(scores) == 1:
        return [50]
    ordered = sorted(scores)
    output: list[int] = []
    for score in scores:
        lower = sum(value < score for value in ordered)
        equal = sum(value == score for value in ordered)
        percentile = 100.0 * (lower + (equal - 1) / 2.0) / (len(ordered) - 1)
        output.append(round(percentile))
    return output


class TasteRecommendationService:
    def __init__(self, tmdb: Any, catalog: Any):
        self.tmdb = tmdb
        self.catalog = catalog

    async def _discover(
        self,
        media_type: str,
        filter_name: str,
        identifiers: list[str],
        vote_count: int = 50,
    ) -> list[dict[str, Any]]:
        if not identifiers:
            return []
        async def fetch_page(page: int) -> list[dict[str, Any]]:
            try:
                payload = await self.tmdb.get(
                    f"/discover/{media_type}",
                    {
                        filter_name: "|".join(identifiers),
                        "sort_by": "popularity.desc",
                        "vote_count.gte": vote_count,
                        "include_adult": "false",
                        "page": page,
                    },
                )
            except TMDBError:
                return []
            return [
                {**item, "media_type": media_type, "_retrieval_source": "discover"}
                for item in payload.get("results", [])
                if isinstance(item, dict) and item.get("id")
            ]

        pages = await asyncio.gather(*(fetch_page(page) for page in RELATED_CANDIDATE_PAGES))
        return [item for page in pages for item in page]

    async def _related(
        self,
        seed: dict[str, Any],
        endpoint: str,
    ) -> list[dict[str, Any]]:
        media_type = str(seed.get("media_type") or "")
        tmdb_id = int(_number(seed.get("tmdb_id")))
        if media_type not in {"movie", "tv"} or tmdb_id <= 0:
            return []
        try:
            payload = await self.tmdb.get(
                f"/{media_type}/{tmdb_id}/{endpoint}",
                {"page": 1},
            )
        except TMDBError:
            return []

        title = str(seed.get("title") or "a title you watched")
        rating = _number(seed.get("rating"), -1.0)
        if rating >= 7.0:
            reason = f"Because you rated {title} {rating:.1f}/10"
        else:
            reason = f"Because you watched {title}"

        return [
            {
                **item,
                "media_type": media_type,
                "_retrieval_source": endpoint,
                "_retrieval_reasons": [reason],
            }
            for item in payload.get("results", [])
            if isinstance(item, dict) and item.get("id")
        ]

    async def _retrieve_candidates(
        self,
        profile: dict[str, dict[str, dict[str, float]]],
        watches: list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        genre_seeds = sorted(
            (
                feature_id for feature_id in profile["genres"]["positive"]
                if profile["genres"]["positive"].get(feature_id, 0.0)
                > profile["genres"]["negative"].get(feature_id, 0.0)
            ),
            key=lambda feature_id: profile["genres"]["positive"].get(feature_id, 0.0)
            - profile["genres"]["negative"].get(feature_id, 0.0),
            reverse=True,
        )[:4]
        keyword_seeds = sorted(
            (
                feature_id for feature_id in profile["keywords"]["positive"]
                if profile["keywords"]["positive"].get(feature_id, 0.0)
                > profile["keywords"]["negative"].get(feature_id, 0.0)
            ),
            key=lambda feature_id: profile["keywords"]["positive"].get(feature_id, 0.0)
            - profile["keywords"]["negative"].get(feature_id, 0.0),
            reverse=True,
        )[:5]
        people_seeds = sorted(
            (
                feature_id for feature_id in profile["people"]["positive"]
                if profile["people"]["positive"].get(feature_id, 0.0)
                > profile["people"]["negative"].get(feature_id, 0.0)
            ),
            key=lambda feature_id: profile["people"]["positive"].get(feature_id, 0.0)
            - profile["people"]["negative"].get(feature_id, 0.0),
            reverse=True,
        )[:3]

        positive_watches = [
            watch for watch in (watches or [])
            if watch.get("status") == "watched"
            and isinstance(watch.get("taste_contribution"), dict)
            and watch["taste_contribution"].get("direction") == "positive"
            and watch.get("media_type") in {"movie", "tv"}
            and _number(watch.get("tmdb_id")) > 0
        ]
        positive_watches.sort(
            key=lambda watch: (
                _number(watch.get("rating"), -1.0),
                _number((watch.get("taste_contribution") or {}).get("sentiment")),
                _datetime(watch.get("watched_at")) or _datetime(watch.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
            ),
            reverse=True,
        )
        related_seeds = positive_watches[:RELATED_SEED_LIMIT]

        tasks = []
        if genre_seeds:
            tasks.extend(
                self._discover(media_type, "with_genres", genre_seeds)
                for media_type in ("movie", "tv")
            )
        if keyword_seeds:
            tasks.extend(
                self._discover(media_type, "with_keywords", keyword_seeds)
                for media_type in ("movie", "tv")
            )
        if people_seeds:
            tasks.append(self._discover("movie", "with_people", people_seeds))
        tasks.extend(
            self._related(seed, endpoint)
            for seed in related_seeds
            for endpoint in RELATED_ENDPOINTS
        )

        primary_sets = await asyncio.gather(*tasks) if tasks else []
        primary = [item for batch in primary_sets for item in batch]

        try:
            trending_payload = await self.tmdb.trending("all", "week")
            wildcard = [
                item for item in trending_payload.get("results", [])
                if isinstance(item, dict)
                and item.get("id")
                and item.get("media_type") in {"movie", "tv"}
            ]
        except TMDBError:
            wildcard = []

        if not primary:
            primary = list(wildcard)
        return primary, wildcard

    @staticmethod
    def _key(candidate: dict[str, Any]) -> str:
        return f"{candidate.get('media_type')}:{candidate.get('id')}"

    @staticmethod
    def _quality(candidate: dict[str, Any]) -> float:
        rating = max(0.0, min(10.0, _number(candidate.get("vote_average"))))
        votes = max(0.0, _number(candidate.get("vote_count")))
        vote_confidence = min(1.0, votes / 500.0)
        return (rating / 10.0) * (0.65 + 0.35 * vote_confidence)

    def _cheap_genre_score(
        self,
        candidate: dict[str, Any],
        profile: dict[str, dict[str, dict[str, float]]],
    ) -> float:
        score = cosine_group_score(
            profile["genres"]["positive"],
            profile["genres"]["negative"],
            [str(value) for value in candidate.get("genre_ids", [])],
        )
        if score is not None:
            return score
        return 0.0

    async def _enrich(
        self,
        db: Any,
        candidates: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        semaphore = asyncio.Semaphore(ENRICH_CONCURRENCY)

        async def enrich(candidate: dict[str, Any]) -> dict[str, Any]:
            media_type = candidate["media_type"]
            tmdb_id = int(candidate["id"])
            async with semaphore:
                try:
                    features = await self.catalog.get_features(
                        db, self.tmdb, media_type, tmdb_id
                    )
                    labels = await self.catalog.get_feature_labels(
                        db, media_type, tmdb_id
                    )
                except TMDBError:
                    features = {
                        "genres": [str(value) for value in candidate.get("genre_ids", [])],
                        "keywords": [],
                        "people": [],
                        "decades": [],
                    }
                    labels = {}
            return {
                **candidate,
                "features": features,
                "feature_labels": labels,
                "title": candidate.get("title") or candidate.get("name") or "Untitled",
            }

        return await asyncio.gather(*(enrich(candidate) for candidate in candidates))

    def _explanations(
        self,
        profile: dict[str, dict[str, dict[str, float]]],
        candidate: dict[str, Any],
        idf: dict[str, dict[str, float]],
    ) -> list[str]:
        matches: list[tuple[float, str]] = []
        labels = candidate.get("feature_labels") or {}
        features = candidate.get("features") or {}
        for group in FEATURE_GROUPS:
            candidate_ids = set(features.get(group, []))
            for feature_id in candidate_ids:
                positive = profile[group]["positive"].get(feature_id, 0.0)
                negative = profile[group]["negative"].get(feature_id, 0.0)
                strength = positive - NEGATIVE_PENALTY * negative
                if strength <= 0:
                    continue
                label = (labels.get(group) or {}).get(feature_id)
                if not label:
                    continue
                weighted_strength = strength * idf.get(group, {}).get(feature_id, 1.0)
                matches.append((weighted_strength, label))

        matches.sort(key=lambda item: item[0], reverse=True)
        reasons = [f"Your watch history leans toward {label}" for _, label in matches[:2]]
        if not reasons and _number(candidate.get("vote_average")) > 0:
            reasons.append(f"TMDB rating: {_number(candidate.get('vote_average')):.1f}/10")
        return reasons

    def _wildcard_novelty(
        self,
        candidate: dict[str, Any],
        profile: dict[str, dict[str, dict[str, float]]],
    ) -> float:
        candidate_features = candidate.get("features") or {}
        positive_genres = [
            feature_id
            for feature_id, value in profile["genres"]["positive"].items()
            if value > profile["genres"]["negative"].get(feature_id, 0.0)
        ]
        if not positive_genres:
            return 1.0
        overlap = set(positive_genres) & set(candidate_features.get("genres", []))
        return 1.0 - len(overlap) / max(1, len(set(positive_genres)))

    @staticmethod
    def _weighted_pick(candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not candidates:
            return None
        pool = candidates[:EXPLORATION_TOP_K]
        weights = list(range(len(pool), 0, -1))
        return random.choices(pool, weights=weights, k=1)[0]

    def _sample_cached_recommendations(self, cached: dict[str, Any]) -> dict[str, Any]:
        primary = cached.get("primary_candidates") or []
        wildcard = cached.get("wildcard_candidates") or []
        safe = self._weighted_pick(primary)
        remaining = [
            candidate for candidate in primary
            if candidate.get("public", {}).get("id") != (safe or {}).get("public", {}).get("id")
            or candidate.get("public", {}).get("media_type") != (safe or {}).get("public", {}).get("media_type")
        ]
        if safe is not None:
            remaining.sort(
                key=lambda candidate: mmr_score(
                    _number(candidate.get("raw_score")),
                    feature_jaccard(
                        candidate.get("features") or {},
                        safe.get("features") or {},
                    ),
                ),
                reverse=True,
            )
        adjacent = self._weighted_pick(remaining)
        wildcard_candidates = [
            candidate for candidate in wildcard
            if (
                candidate.get("public", {}).get("media_type"),
                candidate.get("public", {}).get("id"),
            ) not in {
                ((safe or {}).get("public", {}).get("media_type"), (safe or {}).get("public", {}).get("id")),
                ((adjacent or {}).get("public", {}).get("media_type"), (adjacent or {}).get("public", {}).get("id")),
            }
        ]
        wildcard = self._weighted_pick(wildcard_candidates)
        return {
            **(cached.get("metadata") or {}),
            "slots": {
                "safe": (safe or {}).get("public"),
                "adjacent": (adjacent or {}).get("public"),
                "wildcard": (wildcard or {}).get("public"),
            },
        }

    async def recommend(self, db: Any, user_document: Any) -> dict[str, Any]:
        profile_snapshot = await user_document.collection("taste").document("profile").get()
        profile_version = int(_number((profile_snapshot.to_dict() or {}).get("profile_version")))
        cache_ref = user_document.collection("recommendations").document("current")
        cache_snapshot = await cache_ref.get()
        cached = cache_snapshot.to_dict() if cache_snapshot.exists else None
        cached_at = _datetime((cached or {}).get("generated_at"))
        cache_is_fresh = (
            cached is not None
            and int(_number(cached.get("profile_version"), -1)) == profile_version
            and cached_at is not None
            and (datetime.now(timezone.utc) - cached_at).total_seconds() < RECOMMENDATION_CACHE_TTL_SECONDS
        )
        if cache_is_fresh:
            return self._sample_cached_recommendations(cached)

        watch_snapshots = [
            snapshot async for snapshot in user_document.collection("watches").stream()
        ]
        watches = [snapshot.to_dict() or {} for snapshot in watch_snapshots]
        watched = [watch for watch in watches if watch.get("status") == "watched"]
        ready = [
            watch for watch in watched
            if watch.get("taste_metadata_status") == "ready"
            and "taste_contribution" in watch
        ]
        unavailable = sum(1 for watch in watched if watch.get("taste_metadata_status") == "not_found")
        pending = len(watched) - len(ready) - unavailable

        all_time, all_time_count = build_all_time_profile(watches)
        recent, recent_count = build_recent_profile(watches)
        primary_candidates, wildcard_candidates = await self._retrieve_candidates(all_time, watches)

        excluded = {
            f"{watch.get('media_type')}:{watch.get('tmdb_id')}"
            for watch in watches
        }
        primary_by_key: dict[str, dict[str, Any]] = {}
        for candidate in primary_candidates:
            key = self._key(candidate)
            if key in excluded:
                continue
            existing = primary_by_key.get(key)
            if existing is None:
                primary_by_key[key] = candidate
            else:
                reasons = list(existing.get("_retrieval_reasons") or [])
                reasons.extend(candidate.get("_retrieval_reasons") or [])
                existing["_retrieval_reasons"] = list(dict.fromkeys(reasons))
                if candidate.get("_retrieval_source") in {"recommendations", "similar"}:
                    existing["_retrieval_source"] = candidate["_retrieval_source"]

        wildcard_by_key: dict[str, dict[str, Any]] = {}
        for candidate in wildcard_candidates:
            key = self._key(candidate)
            if key not in excluded:
                wildcard_by_key[key] = candidate

        primary_ranked = sorted(
            primary_by_key.values(),
            key=lambda candidate: (
                self._cheap_genre_score(candidate, all_time),
                self._quality(candidate),
                _number(candidate.get("popularity")),
            ),
            reverse=True,
        )[:PRIMARY_CANDIDATE_LIMIT]
        wildcard_ranked = sorted(
            wildcard_by_key.values(),
            key=lambda candidate: (
                self._quality(candidate),
                _number(candidate.get("popularity")),
            ),
            reverse=True,
        )[:WILDCARD_CANDIDATE_LIMIT]

        selected: dict[str, dict[str, Any]] = {}
        for candidate in primary_ranked + wildcard_ranked:
            selected[self._key(candidate)] = candidate
        enriched = await self._enrich(db, list(selected.values()))
        idf = build_local_idf(all_time, watches, enriched)

        personalized = any(
            all_time[group]["positive"] or all_time[group]["negative"]
            or recent[group]["positive"] or recent[group]["negative"]
            for group in FEATURE_GROUPS
        )
        scored: list[dict[str, Any]] = []
        by_key: dict[str, dict[str, Any]] = {}
        for candidate in enriched:
            features = candidate["features"]
            all_score = score_candidate(all_time, features, idf)
            recent_score = score_candidate(recent, features, idf)
            if all_score is None and recent_score is None:
                raw_score = 0.0 if personalized else self._quality(candidate) * 2.0 - 1.0
            elif all_score is None:
                raw_score = recent_score
            elif recent_score is None:
                raw_score = all_score
            else:
                raw_score = (
                    (1.0 - RECENT_ALL_TIME_BLEND) * all_score
                    + RECENT_ALL_TIME_BLEND * recent_score
                )
            candidate["raw_score"] = round(raw_score, 6)
            candidate["personalized"] = personalized
            retrieval_reasons = candidate.get("_retrieval_reasons") or []
            feature_reasons = (
                self._explanations(all_time, candidate, idf)
                if personalized else ["Popular with TMDB viewers"]
            )
            candidate["reasons"] = list(dict.fromkeys(
                [*retrieval_reasons, *feature_reasons]
            ))[:2]
            scored.append(candidate)
            by_key[self._key(candidate)] = candidate

        percentiles = candidate_pool_percentiles([candidate["raw_score"] for candidate in scored])
        for candidate, percentile in zip(scored, percentiles):
            candidate["match_percent"] = percentile if personalized else None

        primary_keys = {self._key(candidate) for candidate in primary_ranked}
        scored_primary = [by_key[key] for key in primary_keys if key in by_key]
        scored_primary.sort(key=lambda candidate: candidate["raw_score"], reverse=True)

        def public_candidate(candidate: dict[str, Any] | None) -> dict[str, Any] | None:
            if candidate is None:
                return None
            return {
                "id": int(candidate["id"]),
                "media_type": candidate["media_type"],
                "title": candidate["title"],
                "poster_path": candidate.get("poster_path"),
                "backdrop_path": candidate.get("backdrop_path"),
                "release_date": candidate.get("release_date") or candidate.get("first_air_date"),
                "vote_average": _number(candidate.get("vote_average")),
                "vote_count": int(_number(candidate.get("vote_count"))),
                "overview": candidate.get("overview") or "",
                "raw_score": candidate["raw_score"],
                "match_percent": candidate["match_percent"],
                "match_semantics": (
                    "Candidate-pool percentile; not a probability"
                    if personalized else "Not personalized"
                ),
                "reasons": candidate["reasons"],
            }

        return {
            "generated_at": datetime.now(timezone.utc),
            "algorithm_version": 1,
            "personalized": personalized,
            "match_score_semantics": (
                "Percentile rank within this request's enriched candidate pool; not a probability of liking."
                if personalized else "No complete taste signal is available; results use TMDB quality/popularity."
            ),
            "profile_status": {
                "watched_titles": len(watched),
                "metadata_ready_titles": len(ready),
                "pending_titles": pending,
                "metadata_unavailable_titles": unavailable,
                "profiled_titles": all_time_count,
                "backfill_complete": pending == 0,
            },
            "recent_profile": {
                "half_life_days": RECENT_HALF_LIFE_DAYS,
                "recently_weighted_titles": recent_count,
                "all_time_blend": 1.0 - RECENT_ALL_TIME_BLEND,
                "recent_blend": RECENT_ALL_TIME_BLEND,
            },
        }

        primary_pool = [
            {
                "public": public_candidate(candidate),
                "features": candidate["features"],
                "raw_score": candidate["raw_score"],
            }
            for candidate in scored_primary
        ]
        wildcard_pool = []
        for candidate in wildcard_ranked:
            scored_candidate = by_key.get(self._key(candidate))
            if scored_candidate is None:
                continue
            wildcard_pool.append({
                "public": public_candidate(scored_candidate),
                "features": scored_candidate["features"],
                "raw_score": scored_candidate["raw_score"],
            })

        cache_data = {
            "profile_version": profile_version,
            "generated_at": datetime.now(timezone.utc),
            "metadata": {
                "generated_at": datetime.now(timezone.utc),
                "algorithm_version": 2,
                "personalized": personalized,
                "match_score_semantics": (
                    "Percentile rank within this request's enriched candidate pool; not a probability of liking."
                    if personalized else "No complete taste signal is available; results use TMDB quality/popularity."
                ),
                "profile_status": {
                    "watched_titles": len(watched),
                    "metadata_ready_titles": len(ready),
                    "pending_titles": pending,
                    "metadata_unavailable_titles": unavailable,
                    "profiled_titles": all_time_count,
                    "backfill_complete": pending == 0,
                },
                "recent_profile": {
                    "half_life_days": RECENT_HALF_LIFE_DAYS,
                    "recently_weighted_titles": recent_count,
                    "all_time_blend": 1.0 - RECENT_ALL_TIME_BLEND,
                    "recent_blend": RECENT_ALL_TIME_BLEND,
                },
            },
            "primary_candidates": primary_pool,
            "wildcard_candidates": wildcard_pool,
        }
        await cache_ref.set(cache_data)
        return self._sample_cached_recommendations(cache_data)
