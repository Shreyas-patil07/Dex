from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    username: str | None
    display_name: str | None
    tagline: str | None
    created_at: datetime


class WatchCreate(BaseModel):
    tmdb_id: int = Field(ge=1)
    media_type: str = Field(pattern=r"^(movie|tv)$")
    title: str = Field(min_length=1, max_length=255)
    status: str = Field(default="want_to_watch", pattern=r"^(watched|want_to_watch|in_future)$")
    rating: float | None = Field(default=None, ge=0, le=10)
    watched_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    poster_path: str | None = Field(default=None, max_length=255, pattern=r"^/[A-Za-z0-9._-]+$")
    backdrop_path: str | None = Field(default=None, max_length=255, pattern=r"^/[A-Za-z0-9._-]+$")


class WatchUpdate(BaseModel):
    status: str | None = Field(default=None, pattern=r"^(watched|want_to_watch|in_future)$")
    rating: float | None = Field(default=None, ge=0, le=10)
    watched_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    poster_path: str | None = Field(default=None, max_length=255, pattern=r"^/[A-Za-z0-9._-]+$")
    backdrop_path: str | None = Field(default=None, max_length=255, pattern=r"^/[A-Za-z0-9._-]+$")


class WatchPublic(WatchCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


RESERVED_USERNAMES = frozenset({
    "admin",
    "administrator",
    "api",
    "dex",
    "help",
    "movie",
    "null",
    "privacy-policy",
    "profile",
    "root",
    "search",
    "settings",
    "sign-up",
    "support",
    "system",
    "terms-of-service",
    "tv",
    "undefined",
})


def is_reserved_username(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        (normalized.startswith("__") and normalized.endswith("__"))
        or normalized in RESERVED_USERNAMES
    )


class UsernameRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")

    @field_validator("username")
    @classmethod
    def validate_firestore_document_id(cls, value: str) -> str:
        normalized = value.strip().lower()
        if is_reserved_username(normalized):
            raise ValueError("This username is reserved.")
        return normalized
