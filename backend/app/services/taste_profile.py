from __future__ import annotations

import asyncio
import math
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from .recommendations import (
    RECENT_HALF_LIFE_DAYS,
    build_all_time_profile,
    build_recent_profile,
)
from .taste import FEATURE_GROUPS, TASTE_MODEL_VERSION


GROUP_LABELS = {
    "genres": "Genres",
    "keywords": "Themes",
    "people": "Directors & creators",
    "decades": "Decades",
}


KEYWORD_NOISE_SLUGS = {
    "aftercreditsstinger",
    "duringcreditsstinger",
    "aftercreditscene",
    "duringcreditscene",
    "postcreditscene",
    "midcreditscene",
    "endcreditscene",
    "creditstinger",
}
KEYWORD_LABEL_OVERRIDES = {
    "basedoncomic": "Comic-book adaptation",
    "basedoncomicbook": "Comic-book adaptation",
    "basedoncomicbooks": "Comic-book adaptation",
    "superhero": "Superheroes",
    "superheroes": "Superheroes",
    "marvelcinematicuniverse": "Marvel Cinematic Universe (MCU)",
    "marvelcinematicuniversemcu": "Marvel Cinematic Universe (MCU)",
    "mcu": "Marvel Cinematic Universe (MCU)",
}
ACRONYM_LABELS = {
    "Ai": "AI",
    "Cgi": "CGI",
    "Fbi": "FBI",
    "Mcu": "MCU",
    "Nasa": "NASA",
    "Tv": "TV",
    "Ufo": "UFO",
    "Uk": "UK",
    "Usa": "USA",
}


def _normalize_feature_label(group: str, label: str) -> str | None:
    """Clean display labels without changing the underlying feature IDs or weights."""
    value = unicodedata.normalize("NFKC", str(label)).strip()
    if not value:
        return None
    if group != "keywords":
        return value

    spaced = re.sub(r"[\\s_]+", " ", value).strip()
    slug = re.sub(r"[^a-z0-9]+", "", spaced.casefold())
    if not slug or slug in KEYWORD_NOISE_SLUGS:
        return None

    if slug in KEYWORD_LABEL_OVERRIDES:
        return KEYWORD_LABEL_OVERRIDES[slug]

    title = spaced.title()
    for source, replacement in ACRONYM_LABELS.items():
        title = re.sub(rf"\\b{source}\\b", replacement, title)
    return title


def _label_key(label: str) -> str:
    return unicodedata.normalize("NFKC", label).casefold()


def _number(value: Any) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return 0.0
    return result if math.isfinite(result) else 0.0


def _ranked_features(
    profile: dict[str, dict[str, dict[str, float]]],
    labels: dict[str, dict[str, str]],
    evidence: dict[str, dict[str, int]],
    group: str,
    direction: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    opposite = "negative" if direction == "positive" else "positive"
    grouped: dict[str, dict[str, Any]] = {}

    for feature_id in set(profile[group]["positive"]) | set(profile[group]["negative"]):
        label = _normalize_feature_label(group, labels.get(group, {}).get(feature_id, ""))
        if not label:
            continue
        strength = (
            _number(profile[group][direction].get(feature_id))
            - _number(profile[group][opposite].get(feature_id))
        )
        if strength <= 0:
            continue

        key = _label_key(label)
        item = grouped.setdefault(key, {"label": label, "strength": 0.0, "ids": []})
        item["strength"] += strength
        item["ids"].append(str(feature_id))

    candidates = [
        (key, item["label"], item["strength"], item["ids"])
        for key, item in grouped.items()
        if item["strength"] > 0
    ]
    candidates.sort(key=lambda item: (-item[2], item[1].casefold()))
    visible = candidates[:limit]
    maximum = max((item[2] for item in visible), default=0.0)
    if maximum <= 0:
        return []

    return [
        {
            "id": min(feature_ids),
            "label": label,
            "strength": round(strength / maximum * 100),
            "watch_count": evidence.get(group, {}).get(key, 0),
        }
        for key, label, strength, feature_ids in visible
    ]

async def build_taste_profile(db: Any, user_document: Any) -> dict[str, Any]:
    """Build a read-only, explainable profile from stored watch contributions.

    Feature labels are read only from the shared TMDB catalogue cache. This
    endpoint never calls TMDB and never writes user or catalogue data.
    """
    watch_snapshots = [
        snapshot async for snapshot in user_document.collection("watches").stream()
    ]
    watches = [snapshot.to_dict() or {} for snapshot in watch_snapshots]
    watched = [watch for watch in watches if watch.get("status") == "watched"]

    all_time, profiled_count = build_all_time_profile(watches)
    recent, recent_count = build_recent_profile(watches)

    labels: dict[str, dict[str, str]] = {group: {} for group in FEATURE_GROUPS}
    evidence: dict[str, dict[str, int]] = {group: {} for group in FEATURE_GROUPS}
    catalogue_keys = {
        (str(watch.get("media_type")), int(_number(watch.get("tmdb_id"))))
        for watch in watched
        if watch.get("media_type") in {"movie", "tv"} and _number(watch.get("tmdb_id")) > 0
        and isinstance(watch.get("taste_contribution"), dict)
    }

    semaphore = asyncio.Semaphore(8)

    async def read_labels(media_type: str, tmdb_id: int) -> dict[str, dict[str, str]]:
        async with semaphore:
            snapshot = await db.collection("tmdb_catalog").document(
                f"{media_type}_{tmdb_id}"
            ).get()
        data = snapshot.to_dict() if snapshot.exists else {}
        source = (data or {}).get("labels") or {}
        return source if isinstance(source, dict) else {}

    label_sets = await asyncio.gather(
        *(read_labels(media_type, tmdb_id) for media_type, tmdb_id in catalogue_keys)
    )
    for label_set in label_sets:
        for group in FEATURE_GROUPS:
            group_labels = label_set.get(group) or {}
            if isinstance(group_labels, dict):
                for feature_id, raw_label in group_labels.items():
                    if raw_label:
                        normalized = _normalize_feature_label(group, str(raw_label))
                        if normalized:
                            labels[group].setdefault(str(feature_id), normalized)

    for watch in watched:
        contribution = watch.get("taste_contribution") or {}
        weights = contribution.get("weights") or {}
        for group in FEATURE_GROUPS:
            title_labels = {
                _label_key(label)
                for feature_id in (weights.get(group) or {})
                if (label := labels[group].get(str(feature_id)))
            }
            for label_key in title_labels:
                evidence[group][label_key] = evidence[group].get(label_key, 0) + 1

    profile_snapshot = await user_document.collection("taste").document("profile").get()
    profile_data = profile_snapshot.to_dict() if profile_snapshot.exists else {}
    metadata_ready = sum(
        watch.get("taste_metadata_status") == "ready" for watch in watched
    )
    unavailable = sum(
        watch.get("taste_metadata_status") == "not_found" for watch in watched
    )
    pending = max(0, len(watched) - metadata_ready - unavailable)
    rated_count = sum(watch.get("rating") is not None for watch in watched)
    rated_profiled_count = sum(
        bool((watch.get("taste_contribution") or {}).get("rated"))
        and bool((watch.get("taste_contribution") or {}).get("weights"))
        for watch in watched
    )
    coverage = round(profiled_count / len(watched) * 100, 1) if watched else 0.0

    groups = []
    for group in FEATURE_GROUPS:
        groups.append({
            "key": group,
            "label": GROUP_LABELS[group],
            "positive": _ranked_features(all_time, labels, evidence, group, "positive"),
            "lower_rated": _ranked_features(all_time, labels, evidence, group, "negative", limit=3),
            "recent": _ranked_features(recent, labels, evidence, group, "positive", limit=4),
        })

    return {
        "model_version": TASTE_MODEL_VERSION,
        "profile_version": int(_number((profile_data or {}).get("profile_version"))),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "recent_half_life_days": RECENT_HALF_LIFE_DAYS,
        "overview": {
            "watched_titles": len(watched),
            "profiled_titles": profiled_count,
            "rated_titles": rated_count,
            "rated_profiled_titles": rated_profiled_count,
            "unrated_profiled_titles": max(0, profiled_count - rated_profiled_count),
            "metadata_ready_titles": metadata_ready,
            "pending_titles": pending,
            "metadata_unavailable_titles": unavailable,
            "coverage_percent": coverage,
            "recent_profiled_titles": recent_count,
        },
        "groups": groups,
    }
