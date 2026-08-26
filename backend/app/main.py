from contextlib import asynccontextmanager
import re

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import Base, engine, get_db
from .models import AuthIdentity, User, Watch
from .schemas import GoogleCredential, LoginRequest, PasswordCreate, Token, UserCreate, UserPublic, WatchCreate, WatchPublic
from .security import create_access_token, decode_access_token, hash_password, verify_password
from .services.tmdb import TMDBError, TMDBService


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
tmdb = TMDBService(settings.tmdb_api_key, settings.tmdb_base_url)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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
        total_pages = first_page.get("total_pages", 1)
        if total_pages >= 2:
            second_page = await tmdb.get(
                f"/trending/{media_type}/{time_window}",
                {"page": 2},
            )
            results.extend(second_page.get("results", []))
        return {**first_page, "results": results[:24]}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TMDBError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def unique_username(db_usernames: set[str], email: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@", 1)[0])[:24] or "user"
    username = base
    index = 1
    while username.lower() in db_usernames:
        username = f"{base[:24-len(str(index))]}{index}"
        index += 1
    return username


async def find_unique_username(db: AsyncSession, email: str) -> str:
    result = await db.execute(select(User.username))
    existing = {row[0].lower() for row in result.all()}
    return unique_username(existing, email)


@app.post("/api/auth/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    user = User(
        email=payload.email.lower(),
        username=payload.username,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
    )
    identity = AuthIdentity(provider="email", provider_subject=payload.email.lower(), user=user)
    db.add(user)
    db.add(identity)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email or username already exists") from None
    return user


@app.post("/api/auth/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> Token:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_access_token(user.id))


@app.post("/api/auth/google", response_model=Token)
async def google_auth(payload: GoogleCredential, db: AsyncSession = Depends(get_db)) -> Token:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google authentication is not configured")
    try:
        info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from None

    provider_subject = info.get("sub")
    email = str(info.get("email", "")).lower()
    verified = bool(info.get("email_verified"))
    if not provider_subject or not email or not verified:
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    result = await db.execute(
        select(AuthIdentity).where(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject == provider_subject,
        )
    )
    identity = result.scalar_one_or_none()
    if identity:
        return Token(access_token=create_access_token(identity.user_id))

    existing_user_result = await db.execute(select(User).where(User.email == email))
    existing_user = existing_user_result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="A Dex account already uses this email. Sign in with email first, then connect Google from Account Settings.",
        )

    username = await find_unique_username(db, email)
    user = User(
        email=email,
        username=username,
        password_hash=None,
        display_name=info.get("name"),
    )
    identity = AuthIdentity(provider="google", provider_subject=provider_subject, user=user)
    db.add(user)
    db.add(identity)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Could not create the Dex account") from None
    return Token(access_token=create_access_token(user.id))


async def current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    try:
        user_id = decode_access_token(token)
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.post("/api/auth/google/link", response_model=UserPublic)
async def link_google(
    payload: GoogleCredential,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google authentication is not configured")
    try:
        info = id_token.verify_oauth2_token(payload.credential, google_requests.Request(), settings.google_client_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from None

    provider_subject = info.get("sub")
    email = str(info.get("email", "")).lower()
    if not provider_subject or email != user.email.lower() or not info.get("email_verified"):
        raise HTTPException(status_code=400, detail="The Google account email must match your Dex email")

    result = await db.execute(
        select(AuthIdentity).where(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject == provider_subject,
        )
    )
    existing_identity = result.scalar_one_or_none()
    if existing_identity and existing_identity.user_id != user.id:
        raise HTTPException(status_code=409, detail="This Google account is already linked to another Dex account")
    if not existing_identity:
        db.add(AuthIdentity(provider="google", provider_subject=provider_subject, user_id=user.id))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="This Google account is already linked") from None
    return user


@app.post("/api/auth/password", response_model=UserPublic)
async def set_password(
    payload: PasswordCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    user.password_hash = hash_password(payload.password)
    if not any(identity.provider == "email" for identity in user.identities):
        db.add(AuthIdentity(provider="email", provider_subject=user.email.lower(), user_id=user.id))
    await db.commit()
    await db.refresh(user)
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
