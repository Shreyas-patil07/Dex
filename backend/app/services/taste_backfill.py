from __future__ import annotations

from typing import Any

from .taste import TASTE_MODEL_VERSION, update_watch_atomically
from .tmdb import TMDBError


DEFAULT_BACKFILL_PAGE_SIZE = 25
MAX_BACKFILL_PAGE_SIZE = 50


async def backfill_watched_page(
    db: Any,
    user_document: Any,
    tmdb: Any,
    catalog: Any,
    limit: int = DEFAULT_BACKFILL_PAGE_SIZE,
    cursor: str | None = None,
) -> dict[str, Any]:
    """Idempotently enrich one page of legacy watched titles.

    The caller can repeat the operation safely. Each title's contribution is
    applied in the same transaction as its watch document update. When a page
    has TMDB failures, restart a later pass without a cursor to retry pending
    titles; already completed titles are skipped.
    """
    if not 1 <= limit <= MAX_BACKFILL_PAGE_SIZE:
        raise ValueError(f"limit must be between 1 and {MAX_BACKFILL_PAGE_SIZE}")

    watches = user_document.collection("watches")
    query = watches.where("status", "==", "watched").order_by("__name__")
    if cursor:
        cursor_snapshot = await watches.document(cursor).get()
        if not cursor_snapshot.exists:
            raise ValueError("cursor does not reference an existing watch document")
        query = query.start_after(cursor_snapshot)

    snapshots = [
        snapshot
        async for snapshot in query.limit(limit + 1).stream()
    ]
    has_more = len(snapshots) > limit
    page = snapshots[:limit]

    enriched = 0
    skipped = 0
    pending = 0
    pending_ids: list[str] = []

    for snapshot in page:
        data = snapshot.to_dict() or {}
        contribution = data.get("taste_contribution")
        if (
            data.get("taste_metadata_status") == "ready"
            and "taste_contribution" in data
            and (
                contribution is None
                or contribution.get("model_version") == TASTE_MODEL_VERSION
            )
        ):
            skipped += 1
            continue

        try:
            features = await catalog.get_features(
                db,
                tmdb,
                data["media_type"],
                int(data["tmdb_id"]),
            )
        except TMDBError:
            await update_watch_atomically(
                db,
                user_document,
                snapshot.reference,
                {},
                metadata_status="pending",
            )
            pending += 1
            pending_ids.append(snapshot.id)
            continue

        updated = await update_watch_atomically(
            db,
            user_document,
            snapshot.reference,
            {},
            metadata_features=features,
            metadata_status="ready",
        )
        if updated is not None:
            enriched += 1

    return {
        "scanned": len(page),
        "enriched": enriched,
        "skipped": skipped,
        "pending": pending,
        "pending_watch_ids": pending_ids,
        "next_cursor": page[-1].id if has_more and page else None,
        "complete": not has_more,
    }
