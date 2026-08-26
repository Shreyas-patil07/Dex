from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=80)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    username: str
    display_name: str | None
    tagline: str | None
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=1)


class PasswordCreate(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class WatchCreate(BaseModel):
    tmdb_id: int
    media_type: str = Field(pattern=r"^(movie|tv)$")
    title: str = Field(min_length=1, max_length=255)
    status: str = Field(default="watched", pattern=r"^(watched|want_to_watch|in_queue|watched_disliked)$")
    rating: float | None = Field(default=None, ge=0, le=10)
    watched_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class WatchPublic(WatchCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class UsernameRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
