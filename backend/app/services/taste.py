from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from math import sqrt
from typing import Any, Awaitable, Callable
from urllib.parse import quote

from google.cloud import firestore


TASTE_MODEL_VERSION = 1
TASTE_SCHEMA_VERSION = 1
NEUTRAL_RATING = 5.5
UNRATED_WATCH_WEIGHT = 0.15
MAX_FEATURES_PER_GROUP = 100
EPSILON = 1e-12

# Applied when feature-group scores are combined by the recommendation scorer.
GROUP_WEIGHTS = {
    "genres": 1.0,
    "keywords": 1.2,
    "people": 1.0,
    "decades": 0.35,
}

FEATURE_GROUPS = tuple(GROUP_WEIGHTS)


def rating_to_sentiment(rating: float | None) -> float:
    """Map a 0..10 rating to [-1, 1] around the fixed neutral midpoint.

    An unrated watched title is a weak positive signal. The fixed baseline
    keeps prior contributions stable when a user's average rating changes.
    """
    if rating is None:
        return UNRATED_WATCH_WEIGHT
    if not 0 <= rating <= 10:
        raise ValueError("rating must be between 0 and 10")
    if rating < NEUTRAL_RATING:
        return (rating - NEUTRAL_RATING) / NEUTRAL_RATING
    return (rating - NEUTRAL_RATING) / (10.0 - NEUTRAL_RATING)


def normalize_taste_features(features: dict[str, Any] | None) -> dict[str, list[str]]:
    """Normalize and bound the TMDB feature snapshot stored on a watch."""
    source = features or {}
    normalized: dict[str, list[str]] = {}
    for group in FEATURE_GROUPS:
        raw_values = source.get(group, [])
        if not isinstance(raw_values, (list, tuple, set)):
            raw_values = []
        values = sorted({
            str(value).strip()
            for value in raw_values
            if value is not None and str(value).strip() and "/" not in str(value)
        })
        normalized[group] = values[:MAX_FEATURES_PER_GROUP]
    return normalized


def build_taste_contribution(
    rating: float | None,
    features: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Build the exact signed feature deltas persisted with a watched title.

    Each feature group is L2-normalized independently. Group weights are
    applied later by the scorer, not baked into the stored group vectors.
    Persisting these exact deltas makes edits and deletes reversible.
    """
    sentiment = rating_to_sentiment(rating)
    normalized = normalize_taste_features(features)
    if abs(sentiment) <= EPSILON:
        return None

    direction = "positive" if sentiment > 0 else "negative"
    magnitude = abs(sentiment)
    weights: dict[str, dict[str, float]] = {}
    for group, feature_ids in normalized.items():
        if not feature_ids:
            continue
        per_feature = round(magnitude / sqrt(len(feature_ids)), 12)
        weights[group] = {feature_id: per_feature for feature_id in feature_ids}

    if not weights:
        return None

    return {
        "model_version": TASTE_MODEL_VERSION,
        "sentiment": round(sentiment, 12),
        "rated": rating is not None,
        "direction": direction,
        "weights": weights,
    }


def _has_signal(contribution: dict[str, Any] | None) -> bool:
    if not isinstance(contribution, dict):
        return False
    return any(
        isinstance(features, dict) and bool(features)
        for features in (contribution.get("weights") or {}).values()
    )


def _feature_document_id(feature_id: str) -> str:
    # Feature IDs are normally TMDB numeric IDs or decade strings. Quote any
    # remaining reserved characters so no user-controlled slash enters a path.
    return quote(str(feature_id), safe="-_.~")


def _accumulate_contribution(
    deltas: dict[tuple[str, str], dict[str, float]],
    contribution: dict[str, Any] | None,
    multiplier: float,
) -> None:
    if not _has_signal(contribution):
        return
    direction = contribution.get("direction")
    if direction not in {"positive", "negative"}:
        return
    field = "positive_sum" if direction == "positive" else "negative_sum"
    weights = contribution.get("weights") or {}
    for group, feature_weights in weights.items():
        if group not in FEATURE_GROUPS or not isinstance(feature_weights, dict):
            continue
        for feature_id, value in feature_weights.items():
            try:
                numeric_value = float(value)
            except (TypeError, ValueError):
                continue
            if not feature_id or abs(numeric_value) <= EPSILON:
                continue
            key = (group, str(feature_id))
            deltas.setdefault(key, {"positive_sum": 0.0, "negative_sum": 0.0})
            deltas[key][field] += multiplier * numeric_value


def _apply_profile_delta(
    transaction: Any,
    user_document: Any,
    profile_snapshot: Any,
    old_contribution: dict[str, Any] | None,
    new_contribution: dict[str, Any] | None,
) -> None:
    old_has_signal = _has_signal(old_contribution)
    new_has_signal = _has_signal(new_contribution)
    if old_contribution == new_contribution:
        return

    deltas: dict[tuple[str, str], dict[str, float]] = {}
    _accumulate_contribution(deltas, old_contribution, -1.0)
    _accumulate_contribution(deltas, new_contribution, 1.0)

    now = datetime.now(timezone.utc)
    vectors = user_document.collection("taste_vectors")
    for (group, feature_id), amounts in deltas.items():
        updates: dict[str, Any] = {"updated_at": now}
        for field, amount in amounts.items():
            if abs(amount) > EPSILON:
                updates[field] = firestore.Increment(round(amount, 12))
        if len(updates) > 1:
            feature_ref = (
                vectors.document(group)
                .collection("features")
                .document(_feature_document_id(feature_id))
            )
            transaction.set(feature_ref, updates, merge=True)

    profiled_delta = int(new_has_signal) - int(old_has_signal)
    rated_delta = int(
        new_has_signal and bool((new_contribution or {}).get("rated"))
    ) - int(
        old_has_signal and bool((old_contribution or {}).get("rated"))
    )

    profile_ref = user_document.collection("taste").document("profile")
    profile_data: dict[str, Any] = {
        "schema_version": TASTE_SCHEMA_VERSION,
        "model_version": TASTE_MODEL_VERSION,
        "updated_at": now,
    }
    if not profile_snapshot.exists:
        profile_data["created_at"] = now
    if profiled_delta:
        profile_data["profiled_watch_count"] = firestore.Increment(profiled_delta)
    if rated_delta:
        profile_data["profiled_rated_count"] = firestore.Increment(rated_delta)
    transaction.set(profile_ref, profile_data, merge=True)


async def run_transaction(
    db: Any,
    operation: Callable[[Any], Awaitable[Any]],
) -> Any:
    """Execute an async operation with Firestore's retrying transaction wrapper."""
    transaction = db.transaction()

    @firestore.async_transactional
    async def execute(transaction: Any) -> Any:
        return await operation(transaction)

    return await execute(transaction)


async def add_watch_atomically(
    db: Any,
    user_document: Any,
    watch_ref: Any,
    watch_data: dict[str, Any],
) -> bool:
    profile_ref = user_document.collection("taste").document("profile")

    async def operation(transaction: Any) -> bool:
        watch_snapshot = await watch_ref.get(transaction=transaction)
        if watch_snapshot.exists:
            return False
        profile_snapshot = await profile_ref.get(transaction=transaction)
        _apply_profile_delta(
            transaction,
            user_document,
            profile_snapshot,
            None,
            watch_data.get("taste_contribution"),
        )
        transaction.set(watch_ref, watch_data)
        return True

    return await run_transaction(db, operation)


async def update_watch_atomically(
    db: Any,
    user_document: Any,
    watch_ref: Any,
    changes: dict[str, Any],
    metadata_features: dict[str, Any] | None = None,
    metadata_status: str | None = None,
) -> dict[str, Any] | None:
    profile_ref = user_document.collection("taste").document("profile")

    async def operation(transaction: Any) -> dict[str, Any] | None:
        watch_snapshot = await watch_ref.get(transaction=transaction)
        if not watch_snapshot.exists:
            return None
        profile_snapshot = await profile_ref.get(transaction=transaction)
        old_data = watch_snapshot.to_dict() or {}
        new_data = {**old_data, **changes}
        target_status = new_data.get("status", "want_to_watch")

        if target_status == "watched":
            current_metadata_status = old_data.get("taste_metadata_status")
            if current_metadata_status != "ready" and metadata_status is not None:
                new_data["taste_metadata_status"] = metadata_status
                if metadata_status == "ready" and metadata_features is not None:
                    new_data["taste_features"] = normalize_taste_features(metadata_features)

            if new_data.get("taste_metadata_status") == "ready":
                new_data["taste_features"] = normalize_taste_features(
                    new_data.get("taste_features")
                )
                new_contribution = build_taste_contribution(
                    new_data.get("rating"),
                    new_data.get("taste_features"),
                )
            else:
                new_contribution = None
        else:
            new_contribution = None

        new_data["taste_contribution"] = new_contribution
        _apply_profile_delta(
            transaction,
            user_document,
            profile_snapshot,
            old_data.get("taste_contribution"),
            new_contribution,
        )
        transaction.set(watch_ref, new_data)
        return new_data

    return await run_transaction(db, operation)


async def delete_watch_atomically(
    db: Any,
    user_document: Any,
    watch_ref: Any,
) -> bool:
    profile_ref = user_document.collection("taste").document("profile")

    async def operation(transaction: Any) -> bool:
        watch_snapshot = await watch_ref.get(transaction=transaction)
        if not watch_snapshot.exists:
            return False
        profile_snapshot = await profile_ref.get(transaction=transaction)
        old_data = watch_snapshot.to_dict() or {}
        _apply_profile_delta(
            transaction,
            user_document,
            profile_snapshot,
            old_data.get("taste_contribution"),
            None,
        )
        transaction.delete(watch_ref)
        return True

    return await run_transaction(db, operation)
