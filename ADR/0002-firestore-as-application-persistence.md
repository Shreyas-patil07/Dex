# ADR-0002: Firestore as Application Persistence

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision owners:** Dex maintainers

## Context

Dex stores user profiles, username ownership, watch history, taste-profile aggregates, and cached shared media features.

## Decision

Use Cloud Firestore through the Firebase Admin SDK. Store user-owned documents under UID-scoped paths and use a username registry for globally unique usernames. Use Firestore transactions for watch mutations that must update taste aggregates atomically.

## Consequences

- No separate relational database is required by the current architecture.
- Document paths and transaction boundaries become part of the data model.
- Query patterns, indexes, quotas, read/write cost, and document limits require deliberate design.
- Backup, restore, retention, deletion, and schema migration procedures must be maintained.
