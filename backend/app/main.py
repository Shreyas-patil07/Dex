from contextlib import asynccontextmanager

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import Base, engine, get_db
from .models import User, Watch
from .schemas import LoginRequest, Token, UserCreate, UserPublic, WatchCreate, WatchPublic
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


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
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
        return await tmdb.trending(media_type, time_window)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TMDBError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/auth/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    user = User(
        email=payload.email.lower(),
        username=payload.username,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
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
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
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
