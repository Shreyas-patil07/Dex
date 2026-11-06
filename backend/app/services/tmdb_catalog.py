from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from google.cloud import firestore

from ..services.taste import FEATURE_GROUPS, normalize_taste_features
from ..services.tmdb import TMDBError, TMDBService


CATALOG_COLLECTION = "tmdb_catalog"
CATALOG_VERSION = 1
CATALOG_TTL = timedelta(days=180)
FEATURE_STATS_COLLECTION = "tmdb_feature_stats"
FEATURE_STATS_VERSION = 1


def _ids(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    return sorted({
        str(item["id"])
        for item in values
        if isinstance(item, dict) and item.get("id") is not None
    })


def _year_decade(date_value: Any) -> list[str]:
    if not isinstance(date_value, str) or len(date_value) < 4:
        return []
    try:
        year = int(date_value[:4])
    except ValueError:
        return []
    if year < 1800 or year > 2200:
        return []
    return [f"{(year // 10) * 10}s"]


def extract_taste_features(details: dict[str, Any], media_type: str) -> dict[str, list[str]]:
    """Extract stable, compact feature IDs from a TMDB movie or TV detail."""
    genres = _ids(details.get("genres"))
    keyword_payload = details.get("keywords") or {}
    if media_type == "movie":
        keywords = _ids(keyword_payload.get("keywords", []))
        crew = (details.get("credits") or {}).get("crew", [])
        people = sorted({
            str(person["id"])
            for person in crew
            if isinstance(person, dict)
            and person.get("id") is not None
            and person.get("job") == "Director"
        })
        date_value = details.get("release_date")
    else:
        keywords = _ids(keyword_payload.get("results", []))
        people = _ids(details.get("created_by", []))
        if not people:
            crew = (details.get("credits") or {}).get("crew", [])
            people = sorted({
                str(person["id"])
                for person in crew
                if isinstance(person, dict)
                and person.get("id") is not None
                and person.get("job") == "Creator"
            })
        date_value = details.get("first_air_date")

    return {
        "genres": genres,
        "keywords": keywords[:100],
        "people": people[:100],
        "decades": _year_decade(date_value),
    }



def extract_taste_labels(details: dict[str, Any], media_type: str) -> dict[str, dict[str, str]]:
    """Map TMDB feature IDs to display labels for recommendation explanations."""
    labels: dict[str, dict[str, str]] = {
        "genres": {},
        "keywords": {},
        "people": {},
        "decades": {},
    }
    for genre in details.get("genres", []) or []:
        if isinstance(genre, dict) and genre.get("id") is not None and genre.get("name"):
            labels["genres"][str(genre["id"])] = str(genre["name"])

    keyword_payload = details.get("keywords") or {}
    keyword_items = keyword_payload.get("keywords" if media_type == "movie" else "results", [])
    for keyword in keyword_items or []:
        if isinstance(keyword, dict) and keyword.get("id") is not None and keyword.get("name"):
            labels["keywords"][str(keyword["id"])] = str(keyword["name"])

    if media_type == "movie":
        people = [
            person for person in (details.get("credits") or {}).get("crew", [])
            if isinstance(person, dict) and person.get("job") == "Director"
        ]
        date_value = details.get("release_date")
    else:
        people = details.get("created_by") or [
            person for person in (details.get("credits") or {}).get("crew", [])
            if isinstance(person, dict) and person.get("job") == "Creator"
        ]
        date_value = details.get("first_air_date")

    for person in people:
        if isinstance(person, dict) and person.get("id") is not None and person.get("name"):
            labels["people"][str(person["id"])] = str(person["name"])

    decade = _year_decade(date_value)
    if decade:
        labels["decades"][decade[0]] = decade[0]
    return labels


def _as_utc_datetime(value: Any) -> datetime | None:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class TMDBCatalog:
    """Firestore-backed shared cache for recommendation feature metadata."""



    async def _index_features(
        self,
        db: Any,
        cache_ref: Any,
        features: dict[str, list[str]],
    ) -> None:
        """Maintain global document-frequency counters exactly once per catalog item."""
        if not hasattr(db, "transaction"):
            return

        normalized = normalize_taste_features(features)
        now = datetime.now(timezone.utc)
        transaction = db.transaction()

        @firestore.async_transactional
        async def apply(transaction: Any) -> None:
            snapshot = await cache_ref.get(transaction=transaction)
            if not snapshot.exists:
                return
            cached = snapshot.to_dict() or {}
            already_indexed = cached.get("stats_indexed_version") == FEATURE_STATS_VERSION
            previous = normalize_taste_features(cached.get("indexed_features")) if already_indexed else {
                group: [] for group in FEATURE_GROUPS
            }
            if already_indexed and previous == normalized:
                return

            for group in FEATURE_GROUPS:
                group_ref = db.collection(FEATURE_STATS_COLLECTION).document(group)
                if not already_indexed:
                    transaction.set(
                        group_ref,
                        {
                            "document_count": firestore.Increment(1),
                            "stats_version": FEATURE_STATS_VERSION,
                            "updated_at": now,
                        },
                        merge=True,
                    )

                old_ids = set(previous.get(group, []))
                new_ids = set(normalized.get(group, []))
                for feature_id in old_ids | new_ids:
                    delta = int(feature_id in new_ids) - int(feature_id in old_ids)
                    if not delta:
                        continue
                    feature_ref = (
                        group_ref.collection("features")
                        .document(quote(feature_id, safe="-_.~"))
                    )
                    transaction.set(
                        feature_ref,
                        {
                            "document_frequency": firestore.Increment(delta),
                            "stats_version": FEATURE_STATS_VERSION,
                            "updated_at": now,
                        },
                        merge=True,
                    )

            transaction.set(
                cache_ref,
                {
                    "stats_indexed_version": FEATURE_STATS_VERSION,
                    "indexed_features": normalized,
                    "stats_indexed_at": now,
                },
                merge=True,
            )

        await apply(transaction)

    async def get_feature_labels(
        self,
        db: Any,
        media_type: str,
        tmdb_id: int,
    ) -> dict[str, dict[str, str]]:
        snapshot = await db.collection(CATALOG_COLLECTION).document(
            f"{media_type}_{tmdb_id}"
        ).get()
        data = snapshot.to_dict() if snapshot.exists else {}
        return (data or {}).get("labels") or {}

    async def get_features(
        self,
        db: Any,
        tmdb: TMDBService,
        media_type: str,
        tmdb_id: int,
    ) -> dict[str, list[str]]:
        if media_type not in {"movie", "tv"}:
            raise ValueError("media_type must be movie or tv")
        if tmdb_id < 1:
            raise ValueError("tmdb_id must be positive")

        cache_ref = db.collection(CATALOG_COLLECTION).document(f"{media_type}_{tmdb_id}")
        snapshot = await cache_ref.get()
        cached = snapshot.to_dict() if snapshot.exists else None
        cached_features = (cached or {}).get("features")

        fetched_at = _as_utc_datetime((cached or {}).get("fetched_at"))
        is_fresh = (
            cached is not None
            and cached.get("catalog_version") == CATALOG_VERSION
            and fetched_at is not None
            and datetime.now(timezone.utc) - fetched_at < CATALOG_TTL
            and isinstance(cached_features, dict)
            and isinstance((cached or {}).get("labels"), dict)
        )
        if is_fresh:
            await self._index_features(db, cache_ref, cached_features)
            return cached_features

        try:
            details = await tmdb.get(
                f"/{media_type}/{tmdb_id}",
                {"append_to_response": "keywords,credits"},
            )
        except TMDBError:
            # Stale metadata is preferable to blocking a user's watch action.
            if isinstance(cached_features, dict):
                await self._index_features(db, cache_ref, cached_features)
                return cached_features
            raise

        features = extract_taste_features(details, media_type)
        cache_data = {
            "tmdb_id": tmdb_id,
            "media_type": media_type,
            "catalog_version": CATALOG_VERSION,
            "features": features,
            "labels": extract_taste_labels(details, media_type),
            "title": details.get("title") or details.get("name"),
            "fetched_at": datetime.now(timezone.utc),
        }
        await cache_ref.set(cache_data, merge=True)
        await self._index_features(db, cache_ref, features)
        return features
