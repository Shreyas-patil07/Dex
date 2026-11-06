# ADR-0001: Firebase Authentication and UID Ownership

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Dex requires account authentication and a stable identity key for user-owned profile, watch, and taste data. The browser must not assert ownership of a protected record.

## Decision

Use Firebase Authentication as sign-in identity provider. Frontend sends Firebase ID tokens to protected API routes. FastAPI verifies tokens with Firebase Admin and derives authoritative UID from verified claims. User-owned Firestore paths are scoped to that UID.

## Consequences

- Firebase manages credential lifecycle.
- Client auth state alone is not authorization.
- Firebase Admin credentials remain server-only.
- Firebase project IAM and Firestore Security Rules require independent review.
- Account deletion and token revocation workflows must be specified.
