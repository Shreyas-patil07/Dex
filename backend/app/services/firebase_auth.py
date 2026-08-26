from functools import lru_cache

import firebase_admin
from firebase_admin import auth
from fastapi import HTTPException


@lru_cache(maxsize=1)
def get_firebase_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        try:
            return firebase_admin.initialize_app()
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Firebase Admin authentication is not configured") from exc


def verify_firebase_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase ID token")
    try:
        return auth.verify_id_token(token, app=get_firebase_app())
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase ID token") from exc
