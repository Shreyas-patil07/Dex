from functools import lru_cache
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException

from ..config import settings


@lru_cache(maxsize=1)
def get_firebase_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    credential_path = Path(settings.google_application_credentials)
    if not credential_path.is_absolute():
        credential_path = Path.cwd() / credential_path

    if not credential_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Firebase service account file not found: {credential_path}",
        )

    try:
        cred = credentials.Certificate(str(credential_path))
        return firebase_admin.initialize_app(
            cred,
            {"projectId": settings.firebase_project_id},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Firebase Admin initialization failed: {exc}",
        ) from exc


def verify_firebase_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase ID token")

    try:
        return auth.verify_id_token(token, app=get_firebase_app())
    except auth.ExpiredIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Firebase ID token expired. Sign in again.") from exc
    except auth.InvalidIdTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase ID token: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Firebase token verification failed: {exc}") from exc
