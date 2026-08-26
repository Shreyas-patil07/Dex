from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import Base, engine, get_db
from .models import AuthIdentity, User, Watch
from .schemas import UserPublic, UsernameRequest, WatchCreate, WatchPublic
from .services.firebase_auth import verify_firebase_token
from .services.tmdb import TMDBError, TMDBService


tmdb = TMDBService(settings.tmdb_api_key, settings.tmdb_base_url)
bearer = HTTPBearer(auto_error=False)

DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "https://dex-list.vercel.app",
)


def get_cors_origins() -> list[str]:
    configured = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    origins = [*DEFAULT_CORS_ORIGINS, settings.frontend_url, *configured]
    return list(dict.fromkeys(origin for origin in origins if origin))


class AuthSyncRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, version="0.4.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "dex-api"}


@app.get("/api/media/trending")
async def trending(
    media_type: str = Query("all", pattern="^(all|movie|tv)$"),
    time_window: str = Query("week", pattern="^(day|week)$"),
) -> dict:
    try:
        first_page = await tmdb.trending(media_type, time_window)
        results = first_page.get("results", [])
        if first_page.get("total_pages", 1) >= 2:
            second_page = await tmdb.get(f"/trending/{media_type}/{time_window}", {"page": 2})
            results.extend(second_page.get("results", []))
        return {**first_page, "results": results[:24]}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TMDBError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def normalize_username(value: str) -> str:
    return value.strip().lower()


async def username_exists(db: AsyncSession, username: str) -> bool:
    return (await db.execute(select(User.id).where(User.username == normalize_username(username)))).scalar_one_or_none() is not None


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")

    decoded = verify_firebase_token(credentials.credentials)
    firebase_uid = str(decoded.get("uid", ""))
    email = str(decoded.get("email", "")).lower()
    if not firebase_uid or not email:
        raise HTTPException(status_code=401, detail="Firebase account is missing required identity information")

    identity = (
        await db.execute(
            select(AuthIdentity).where(
                AuthIdentity.provider == "firebase",
                AuthIdentity.provider_subject == firebase_uid,
            )
        )
    ).scalar_one_or_none()
    if identity:
        user = await db.get(User, identity.user_id)
        if user:
            return user

    raise HTTPException(status_code=401, detail="Dex account not synchronized")


@app.post("/api/auth/sync", response_model=UserPublic)
async def sync_auth_user(
    payload: AuthSyncRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")

    decoded = verify_firebase_token(credentials.credentials)
    firebase_uid = str(decoded.get("uid", ""))
    email = str(decoded.get("email", "")).lower()
    if not firebase_uid or not email:
        raise HTTPException(status_code=401, detail="Firebase account is missing required identity information")

    identity = (
        await db.execute(
            select(AuthIdentity).where(
                AuthIdentity.provider == "firebase",
                AuthIdentity.provider_subject == firebase_uid,
            )
        )
    ).scalar_one_or_none()
    if identity:
        user = await db.get(User, identity.user_id)
        if not user:
            raise HTTPException(status_code=409, detail="Firebase identity points to a missing Dex account")
        return user

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user:
        if payload.display_name and not user.display_name:
            user.display_name = payload.display_name
    else:
        user = User(
            email=email,
            username=None,
            password_hash=None,
            display_name=payload.display_name or decoded.get("name"),
        )
        db.add(user)
        await db.flush()

    db.add(AuthIdentity(provider="firebase", provider_subject=firebase_uid, user_id=user.id))
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Could not synchronize your Dex account") from None
    return user


@app.get("/api/auth/username/available")
async def username_available(
    username: str = Query(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    return {"available": not await username_exists(db, username)}


@app.post("/api/auth/username", response_model=UserPublic)
async def set_username(
    payload: UsernameRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    username = normalize_username(payload.username)
    if await username_exists(db, username) and user.username != username:
        raise HTTPException(status_code=409, detail="That username is already taken.")
    user.username = username
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken.") from None
    return user


@app.get("/api/me", response_model=UserPublic)
async def me(user: User = Depends(current_user)) -> User:
    return user


@app.post("/api/watches", response_model=WatchPublic, status_code=status.HTTP_201_CREATED)
async def add_watch(payload: WatchCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> Watch:
    watch = Watch(user_id=user.id, **payload.model_dump())
    db.add(watch)
    try:
        await db.commit()
        await db.refresh(watch)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="This title is already in your library") from None
    return watch


@app.get("/api/watches", response_model=list[WatchPublic])
async def list_watches(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[Watch]:
    result = await db.execute(select(Watch).where(Watch.user_id == user.id).order_by(Watch.created_at.desc()))
    return list(result.scalars().all())
