from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    username: str | None
    display_name: str | None
    tagline: str | None
    created_at: datetime


class WatchCreate(BaseModel):
    tmdb_id: int
    media_type: str = Field(pattern=r"^(movie|tv)$")
    title: str = Field(min_length=1, max_length=255)
    status: str = Field(default="want_to_watch", pattern=r"^(watched|want_to_watch|in_future)$")
    rating: float | None = Field(default=None, ge=0, le=10)
    watched_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class WatchUpdate(BaseModel):
    status: str | None = Field(default=None, pattern=r"^(watched|want_to_watch|in_future)$")
    rating: float | None = Field(default=None, ge=0, le=10)
    watched_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class WatchPublic(WatchCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


class UsernameRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
