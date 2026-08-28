from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.api_core.exceptions import AlreadyExists
from google.cloud.firestore_v1.base_document import DocumentSnapshot
from pydantic import BaseModel, Field

from .config import settings
from .firestore import get_firestore
from .schemas import UserPublic, UsernameRequest, WatchCreate, WatchPublic
from .services.firebase_auth import verify_firebase_token
from .services.tmdb import TMDBError, TMDBService


tmdb = TMDBService(settings.tmdb_api_key, settings.tmdb_base_url)
bearer = HTTPBearer(auto_error=False)

USERS = "users"
USERNAME_REGISTRY = "usernames"
WATCH_REGION = "IN"


class AuthSyncRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title=settings.app_name, version="0.5.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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
        status=data.get("status", "watched"),
        rating=data.get("rating"),
        watched_at=data.get("watched_at"),
        notes=data.get("notes"),
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
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "dex-api", "database": "firestore"}


@app.get("/api/media/trending")
async def trending(
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
async def media_details(
    media_type: str,
    tmdb_id: int,
) -> dict:
    if media_type not in {"movie", "tv"}:
        raise HTTPException(status_code=422, detail="media_type must be movie or tv")
    try:
        details, providers = await tmdb.get_many(
            f"/{media_type}/{tmdb_id}",
            {"append_to_response": "credits,videos"},
            f"/{media_type}/{tmdb_id}/watch/providers",
            {"watch_region": WATCH_REGION},
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


@app.get("/api/auth/username/available")
async def username_available(
    username: str = Query(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$"),
    db=Depends(get_firestore),
) -> dict[str, bool]:
    key = normalize_username(username)
    snapshot = await db.collection(USERNAME_REGISTRY).document(key).get()
    return {"available": not snapshot.exists}


@app.post("/api/auth/username", response_model=UserPublic)
async def set_username(
    payload: UsernameRequest,
    current=Depends(current_user),
    db=Depends(get_firestore),
) -> UserPublic:
    firebase_uid, data = current
    username = normalize_username(payload.username)
    registry_ref = db.collection(USERNAME_REGISTRY).document(username)
    existing = await registry_ref.get()

    if existing.exists:
        existing_uid = str((existing.to_dict() or {}).get("firebase_uid", ""))
        if existing_uid != firebase_uid:
            raise HTTPException(status_code=409, detail="That username is already taken.")
    else:
        try:
            await registry_ref.create({"firebase_uid": firebase_uid, "created_at": datetime.now(timezone.utc)})
        except AlreadyExists:
            raise HTTPException(status_code=409, detail="That username is already taken.") from None

    old_username = data.get("username")
    await user_ref(db, firebase_uid).update({"username": username})

    if old_username and old_username != username:
        old_ref = db.collection(USERNAME_REGISTRY).document(normalize_username(old_username))
        old_snapshot = await old_ref.get()
        if old_snapshot.exists and (old_snapshot.to_dict() or {}).get("firebase_uid") == firebase_uid:
            await old_ref.delete()

    data["username"] = username
    return user_public(firebase_uid, data)


@app.get("/api/me", response_model=UserPublic)
async def me(current=Depends(current_user)) -> UserPublic:
    firebase_uid, data = current
    return user_public(firebase_uid, data)


@app.post("/api/watches", response_model=WatchPublic, status_code=status.HTTP_201_CREATED)
async def add_watch(
    payload: WatchCreate,
    current=Depends(current_user),
    db=Depends(get_firestore),
) -> WatchPublic:
    firebase_uid, _ = current
    doc_id = f"{payload.media_type}_{payload.tmdb_id}"
    ref = user_ref(db, firebase_uid).collection("watches").document(doc_id)
    existing = await ref.get()
    if existing.exists:
        raise HTTPException(status_code=409, detail="This title is already in your library")

    data = payload.model_dump()
    data["created_at"] = datetime.now(timezone.utc)
    try:
        await ref.create(data)
    except AlreadyExists:
        raise HTTPException(status_code=409, detail="This title is already in your library") from None
    return watch_public(doc_id, data)


@app.get("/api/watches", response_model=list[WatchPublic])
async def list_watches(
    current=Depends(current_user),
    db=Depends(get_firestore),
) -> list[WatchPublic]:
    firebase_uid, _ = current
    snapshots = [snapshot async for snapshot in user_ref(db, firebase_uid).collection("watches").stream()]
    snapshots.sort(key=lambda snapshot: snapshot.to_dict().get("created_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return [watch_public(snapshot.id, snapshot.to_dict() or {}) for snapshot in snapshots]
