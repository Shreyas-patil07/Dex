# Architecture Decision Records

This directory records durable technical decisions for Dex.

## When to create an ADR

Create an ADR when a decision materially changes:
- Frontend/backend boundaries or deployment topology.
- Authentication, authorization, identity, or data ownership.
- Storage, persistence, data retention, or schema evolution.
- External API integrations or protocols.
- Taste-model representation, scoring, consistency, or versioning.
- Security, privacy, reliability, or scaling constraints.

Do not create ADRs for routine implementation details.

## Naming

Use sequential numbers and concise kebab-case names:

`0001-firebase-authentication-and-uid-ownership.md`

Never reuse an ADR number. Supersede a decision with a new ADR rather than rewriting historical rationale.

## Lifecycle

- **Proposed:** under discussion.
- **Accepted:** active decision.
- **Rejected:** considered but not selected.
- **Superseded:** replaced by a later ADR.

## Records

- [ADR-0001 — Firebase Authentication and UID ownership](0001-firebase-authentication-and-uid-ownership.md)
- [ADR-0002 — Firestore as application persistence](0002-firestore-as-application-persistence.md)
- [ADR-0003 — TMDB as external media catalogue](0003-tmdb-as-external-media-catalogue.md)
- [ADR-0004 — Incremental taste vectors with reversible contributions](0004-incremental-taste-vectors.md)
- [ADR-0005 — Vercel and Render deployment split](0005-vercel-render-deployment.md)
