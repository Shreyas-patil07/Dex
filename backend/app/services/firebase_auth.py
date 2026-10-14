import json
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

    if settings.firebase_service_account.strip():
        try:
            service_account = json.loads(settings.firebase_service_account)
            if not isinstance(service_account, dict):
                raise ValueError("Service account JSON must be an object")
            credential = credentials.Certificate(service_account)
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=503,
                detail="Firebase service account configuration is invalid",
            ) from exc
    else:
        credential_path = Path(settings.google_application_credentials)
        if not credential_path.is_absolute():
            credential_path = Path.cwd() / credential_path

        if not credential_path.is_file():
            raise HTTPException(
                status_code=503,
                detail="Firebase service account is not configured on the server",
            )

        try:
            credential = credentials.Certificate(str(credential_path))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=503,
                detail="Firebase service account configuration is invalid",
            ) from exc

    try:
        return firebase_admin.initialize_app(
            credential,
            {"projectId": settings.firebase_project_id},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Firebase Admin could not be initialized",
        ) from exc


def verify_firebase_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase ID token")

    app = get_firebase_app()
    try:
        return auth.verify_id_token(token, app=app)
    except auth.ExpiredIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Firebase ID token expired. Sign in again.") from exc
    except auth.InvalidIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token") from exc
    except Exception as exc:
        # Token verification can also fail when Firebase's public keys or services
        # are temporarily unreachable. Do not misreport those outages as bad tokens.
        raise HTTPException(
            status_code=503,
            detail="Firebase token verification is temporarily unavailable",
        ) from exc
