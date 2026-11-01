# ADR-0001: Firebase Authentication and UID Ownership

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision owners:** Dex maintainers

## Context

Dex needs account authentication and a stable identity key for user-owned profile, watch, and taste data. The frontend must not be trusted to assert the owner of a protected record.

## Decision

Use Firebase Authentication as the sign-in identity provider. The frontend sends Firebase ID tokens to protected API routes. FastAPI verifies tokens with Firebase Admin and derives the authoritative user UID from verified claims. Firestore user-owned paths are scoped by this UID.

## Consequences

- Credential lifecycle is delegated to Firebase.
- Backend authorization remains mandatory; client-side auth state alone is not authorization.
- Firebase Admin credentials must remain server-side.
- Firebase project configuration, IAM and Firestore Security Rules require independent review.
- Account deletion and revocation workflows must be explicitly maintained.
