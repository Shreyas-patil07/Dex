from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.api_core.exceptions import AlreadyExists
from google.cloud.firestore_v1.base_document import DocumentSnapshot
from pydantic import BaseModel, Field

from .config import settings
from .firestore import get_firestore
from .schemas import (
    UserPublic,
    UsernameRequest,
    WatchCreate,
    WatchPublic,
    WatchUpdate,
    is_reserved_username,
)
from .services.firebase_auth import verify_firebase_token
from .services.tmdb import TMDBError, TMDBService
from .services.taste import (
    add_watch_atomically,
    build_taste_contribution,
    delete_watch_atomically,
    update_watch_atomically,
    run_transaction,
)
from .services.tmdb_catalog import TMDBCatalog
from .services.taste_backfill import backfill_watched_page, MAX_BACKFILL_PAGE_SIZE
from .services.recommendations import TasteRecommendationService


tmdb = TMDBService(settings.tmdb_api_key, settings.tmdb_base_url)
tmdb_catalog = TMDBCatalog()
recommendation_service = TasteRecommendationService(tmdb, tmdb_catalog)
bearer = HTTPBearer(auto_error=False)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.rate_limit_storage_uri,
    headers_enabled=True,
)

USERS = "users"
USERNAME_REGISTRY = "usernames"
WATCH_REGION = "IN"
WATCH_STATUSES = (
    {"value": "watched", "label": "Watched"},
    {"value": "want_to_watch", "label": "Want to Watch"},
    {"value": "in_future", "label": "In Future"},
)
WATCH_STATUS_VALUES = {item["value"] for item in WATCH_STATUSES}


class AuthSyncRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await tmdb.start()
    try:
        yield
    finally:
        await tmdb.close()


app = FastAPI(title=settings.app_name, version="0.5.1", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_username(value: str) -> str:
    return value.strip().lower()


def user_ref(db, firebase_uid: str):
    return db.collection(USERS).document(firebase_uid)


def user_public(firebase_uid: str, data: dict) -> UserPublic:
    return UserPublic(
        id=firebase_uid,
        email=data.get("email", ""),
        username=data.get("username"),
        display_name=data.get("display_name"),
        tagline=data.get("tagline"),
        created_at=data.get("created_at") or datetime.now(timezone.utc),
    )


def watch_public(doc_id: str, data: dict) -> WatchPublic:
    return WatchPublic(
        id=doc_id,
        tmdb_id=int(data["tmdb_id"]),
        media_type=data["media_type"],
        title=data["title"],
        status=data.get("status", "want_to_watch"),
        rating=data.get("rating"),
        watched_at=data.get("watched_at"),
        notes=data.get("notes"),
        poster_path=data.get("poster_path"),
        backdrop_path=data.get("backdrop_path"),
        created_at=data.get("created_at") or datetime.now(timezone.utc),
    )


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db=Depends(get_firestore),
) -> tuple[str, dict]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")

    decoded = verify_firebase_token(credentials.credentials)
    firebase_uid = str(decoded.get("uid", ""))
    email = str(decoded.get("email", "")).lower()
    if not firebase_uid or not email:
        raise HTTPException(status_code=401, detail="Firebase account is missing required identity information")

    snapshot: DocumentSnapshot = await user_ref(db, firebase_uid).get()
    if snapshot.exists:
        return firebase_uid, snapshot.to_dict() or {}

    raise HTTPException(status_code=401, detail="Dex account not synchronized")


@app.get("/api/health")
@app.head("/api/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "dex-api",
        "version": app.version,
        "watch_write_endpoint": "POST /api/watches",
    }

@app.get("/api/search")
@limiter.limit("30/minute")
async def search(
    request: Request,
    response: Response,
    query: str = Query(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1, le=500),
    media_type: str = Query("all", pattern="^(all|movie|tv)$"),
) -> dict:
    try:
        results = await tmdb.search(query, page, media_type)
        if media_type == "all":
            results["results"] = [
                item for item in results.get("results", [])
                if item.get("media_type") in ("movie", "tv")
            ]
        else:
            results["results"] = [
                {**item, "media_type": media_type}
                for item in results.get("results", [])
            ]
        return results
    except TMDBError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

@app.get("/api/media/trending")
@limiter.limit("60/minute")
async def trending(
    request: Request,
    response: Response,
    media_type: str = Query("all", pattern="^(all|movie|tv)$"),
    time_window: str = Query("week", pattern="^(day|week)$"),
) -> dict:
    try:
        return await tmdb.trending(media_type, time_window)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TMDBError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/media/{media_type}/{tmdb_id}")
@limiter.limit("60/minute")
async def media_details(
    request: Request,
    response: Response,
    media_type: str,
    tmdb_id: int,
) -> dict:
    if media_type not in {"movie", "tv"}:
        raise HTTPException(status_code=422, detail="media_type must be movie or tv")
    if tmdb_id < 1:
        raise HTTPException(status_code=422, detail="tmdb_id must be positive")
    try:
        details, providers = await tmdb.get_many(
            (f"/{media_type}/{tmdb_id}", {"append_to_response": "credits,videos"}),
            (f"/{media_type}/{tmdb_id}/watch/providers", {"watch_region": WATCH_REGION}),
        )
        return {**details, "watch_providers": providers.get("results", {}).get(WATCH_REGION, {})}
    except TMDBError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/auth/sync", response_model=UserPublic)
async def sync_auth_user(
    payload: AuthSyncRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db=Depends(get_firestore),
) -> UserPublic:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")

    decoded = verify_firebase_token(credentials.credentials)
    firebase_uid = str(decoded.get("uid", ""))
    email = str(decoded.get("email", "")).lower()
    if not firebase_uid or not email:
        raise HTTPException(status_code=401, detail="Firebase account is missing required identity information")

    ref = user_ref(db, firebase_uid)
    snapshot = await ref.get()
    if snapshot.exists:
        data = snapshot.to_dict() or {}
        if payload.display_name and not data.get("display_name"):
            data["display_name"] = payload.display_name
            await ref.update({"display_name": payload.display_name})
        return user_public(firebase_uid, data)

    now = datetime.now(timezone.utc)
    data = {
        "email": email,
        "username": None,
        "display_name": payload.display_name or decoded.get("name"),
        "tagline": None,
        "created_at": now,
    }
    await ref.set(data)
    return user_public(firebase_uid, data)


@app.get("/api/watch-statuses")
async def watch_statuses() -> dict[str, list[dict[str, str]]]:
    return {"statuses": list(WATCH_STATUSES)}


@app.get("/api/auth/username/available")
async def username_available(
    username: str = Query(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$"),
    db=Depends(get_firestore),
) -> dict[str, bool]:
    key = normalize_username(username)
    if is_reserved_username(key):
        return {"available": False}
    snapshot = await db.collection(USERNAME_REGISTRY).document(key).get()
    return {"available": not snapshot.exists}


@app.post("/api/auth/username", response_model=UserPublic)
async def set_username(
    payload: UsernameRequest,
    current=Depends(current_user),
    db=Depends(get_firestore),
) -> UserPublic:
    firebase_uid, _ = current
    username = normalize_username(payload.username)
    registry_ref = db.collection(USERNAME_REGISTRY).document(username)
    account_ref = user_ref(db, firebase_uid)
    now = datetime.now(timezone.utc)

    async def claim(transaction):
        account_snapshot = await account_ref.get(transaction=transaction)
        if not account_snapshot.exists:
            raise HTTPException(status_code=401, detail="Dex account not synchronized")

        registry_snapshot = await registry_ref.get(transaction=transaction)
        registry_data = registry_snapshot.to_dict() or {}
        existing_uid = str(registry_data.get("firebase_uid", "")) if registry_snapshot.exists else ""
        if existing_uid and existing_uid != firebase_uid:
            raise HTTPException(status_code=409, detail="That username is already taken.")

        account_data = account_snapshot.to_dict() or {}
        old_username = normalize_username(str(account_data.get("username") or ""))
        old_ref = (
            db.collection(USERNAME_REGISTRY).document(old_username)
            if old_username and old_username != username
            else None
        )
        old_snapshot = await old_ref.get(transaction=transaction) if old_ref is not None else None

        # All reads happen before writes. Firestore retries the transaction if
        # another account claims this username between the read and commit.
        if not existing_uid:
            transaction.set(
                registry_ref,
                {"firebase_uid": firebase_uid, "created_at": now},
            )
        transaction.set(account_ref, {"username": username}, merge=True)
        if old_ref is not None and old_snapshot is not None and old_snapshot.exists:
            old_data = old_snapshot.to_dict() or {}
            if old_data.get("firebase_uid") == firebase_uid:
                transaction.delete(old_ref)

        account_data["username"] = username
        return account_data

    data = await run_transaction(db, claim)
    return user_public(firebase_uid, data)



