# Architecture Decision Records

Record durable technical decisions that materially affect frontend/backend boundaries, authentication, data ownership, persistence, APIs, taste scoring, security, privacy, reliability, and deployment.

## When to create an ADR

Create one when a decision is difficult to reverse or changes a major technology, protocol, storage model, deployment topology, trust assumption, consistency guarantee, or operational constraint. Do not use ADRs for routine implementation details.

## Naming and lifecycle

Use sequential numbers and concise kebab-case names. Never reuse a number; supersede decisions instead of rewriting history.

Statuses: Proposed, Accepted, Rejected, Superseded.

## Records

- [ADR-0001 — Firebase Authentication and UID ownership](0001-firebase-authentication-and-uid-ownership.md)
- [ADR-0002 — Firestore application persistence](0002-firestore-as-application-persistence.md)
- [ADR-0003 — TMDB external media catalogue](0003-tmdb-as-external-media-catalogue.md)
- [ADR-0004 — Incremental taste vectors](0004-incremental-taste-vectors.md)
- [ADR-0005 — Vercel and Render deployment](0005-vercel-render-deployment.md)
