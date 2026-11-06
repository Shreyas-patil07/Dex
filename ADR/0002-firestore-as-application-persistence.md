# ADR-0002: Firestore as Application Persistence

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Dex stores user profiles, username ownership, watch history, taste aggregates, and shared media feature metadata.

## Decision

Use Cloud Firestore through Firebase Admin SDK. Store user-owned documents below UID-scoped paths; use a username registry for uniqueness. Use Firestore transactions for watch mutations that must update taste aggregates atomically.

## Consequences

- No relational database is required by current architecture.
- Document paths and transaction boundaries are critical parts of the data model.
- Query patterns, indexes, quotas, costs, and document limits require deliberate design.
- Backup, restore, retention, deletion, and schema migration runbooks are required.
