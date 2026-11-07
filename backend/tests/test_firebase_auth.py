import pytest
from fastapi import HTTPException
from firebase_admin import auth

from app.services import firebase_auth


def configure_firebase_app(monkeypatch):
    app = object()
    monkeypatch.setattr(firebase_auth, "get_firebase_app", lambda: app)
    return app


def test_verify_firebase_token_checks_revocation(monkeypatch):
    app = configure_firebase_app(monkeypatch)
    calls = []

    def fake_verify_id_token(token, app=None, check_revoked=False):
        calls.append((token, app, check_revoked))
        return {"uid": "user-123"}

    monkeypatch.setattr(firebase_auth.auth, "verify_id_token", fake_verify_id_token)

    claims = firebase_auth.verify_firebase_token("valid-token")

    assert claims == {"uid": "user-123"}
    assert calls == [("valid-token", app, True)]


def test_verify_firebase_token_rejects_expired_tokens(monkeypatch):
    configure_firebase_app(monkeypatch)

    def expired(*args, **kwargs):
        raise auth.ExpiredIdTokenError("expired", None)

    monkeypatch.setattr(firebase_auth.auth, "verify_id_token", expired)

    with pytest.raises(HTTPException) as error:
        firebase_auth.verify_firebase_token("expired-token")

    assert error.value.status_code == 401
    assert error.value.detail == "Firebase ID token expired. Sign in again."


@pytest.mark.parametrize(
    "firebase_error",
    [
        auth.RevokedIdTokenError("revoked"),
        auth.UserDisabledError("disabled"),
        auth.UserNotFoundError("missing"),
    ],
    ids=["revoked", "disabled", "deleted-user"],
)
def test_verify_firebase_token_rejects_revoked_or_unavailable_users(
    monkeypatch,
    firebase_error,
):
    configure_firebase_app(monkeypatch)

    def rejected(*args, **kwargs):
        raise firebase_error

    monkeypatch.setattr(firebase_auth.auth, "verify_id_token", rejected)

    with pytest.raises(HTTPException) as error:
        firebase_auth.verify_firebase_token("unusable-token")

    assert error.value.status_code == 401
    assert error.value.detail == "Firebase session is no longer valid. Sign in again."


def test_verify_firebase_token_rejects_invalid_tokens(monkeypatch):
    configure_firebase_app(monkeypatch)

    def invalid(*args, **kwargs):
        raise auth.InvalidIdTokenError("invalid")

    monkeypatch.setattr(firebase_auth.auth, "verify_id_token", invalid)

    with pytest.raises(HTTPException) as error:
        firebase_auth.verify_firebase_token("invalid-token")

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid Firebase ID token"


def test_verify_firebase_token_fails_closed_on_firebase_outage(monkeypatch):
    configure_firebase_app(monkeypatch)

    def unavailable(*args, **kwargs):
        raise RuntimeError("Firebase Auth unavailable")

    monkeypatch.setattr(firebase_auth.auth, "verify_id_token", unavailable)

    with pytest.raises(HTTPException) as error:
        firebase_auth.verify_firebase_token("valid-shaped-token")

    assert error.value.status_code == 503
    assert error.value.detail == "Firebase token verification is temporarily unavailable"
