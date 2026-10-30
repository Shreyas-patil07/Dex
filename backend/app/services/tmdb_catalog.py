from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ..services.tmdb import TMDBError, TMDBService


CATALOG_COLLECTION = "tmdb_catalog"
CATALOG_VERSION = 1
CATALOG_TTL = timedelta(days=180)


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


def _as_utc_datetime(value: Any) -> datetime | None:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class TMDBCatalog:
    """Firestore-backed shared cache for recommendation feature metadata."""

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
        )
        if is_fresh:
            return cached_features

        try:
            details = await tmdb.get(
                f"/{media_type}/{tmdb_id}",
                {"append_to_response": "keywords,credits"},
            )
        except TMDBError:
            # Stale metadata is preferable to blocking a user's watch action.
            if isinstance(cached_features, dict):
                return cached_features
            raise

        features = extract_taste_features(details, media_type)
        cache_data = {
            "tmdb_id": tmdb_id,
            "media_type": media_type,
            "catalog_version": CATALOG_VERSION,
            "features": features,
            "title": details.get("title") or details.get("name"),
            "fetched_at": datetime.now(timezone.utc),
        }
        await cache_ref.set(cache_data)
        return features
