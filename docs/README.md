# Dex documentation index

> **Documentation snapshot:** 2026-11-07  
> **Source branch:** main  
> **Backend source version:** 0.5.1  
> **Production Render state:** Recommendation and existing-watch UI flows visually verified; full API/version verification pending

This directory documents the product, software architecture, API/data contracts, security model, test evidence, implementation state, recommendation model, and deployment workflow. The repository source and automated tests are authoritative when a document and the implementation differ.

## Start here

| Need | Document |
|---|---|
| Understand what Dex should do | [01 — Product Requirements](01_PRD.md) |
| Understand the stack and constraints | [02 — Technical Requirements](02_TRD.md) |
| Understand components and data flows | [03 — System Architecture](03_Architecture.md) |
| Trace the user journeys | [04 — Application Flows](04_App_Flow.md) |
| Understand current screens and interaction states | [05 — UI / UX Brief](05_UI_Design_Brief.md) |
| Find API routes, payloads and Firestore paths | [06 — Protocol and Data Schema](06_Protocol_and_Data_Schema.md) |
| See delivered work and outstanding tasks | [07 — Implementation Plan](07_Implementation.md) |
| Review identity, authorization and privacy boundaries | [08 — Security and Privacy](08_Security.md) |
| Review automated checks and known test gaps | [09 — Testing and Validation](09_Testing.md) |
| Follow chronological implementation evidence | [10 — Development Log](10_Development_Log.md) |
| Understand the ranking algorithm and score semantics | [11 — Recommendation Engine](11_Recommendations_Engine.md) |
| Deploy and smoke-test production services | [12 — Deployment Runbook](12_Deployment_Runbook.md) |

## Current implementation snapshot

| Area | Main-branch status | Evidence |
|---|---|---|
| Discovery/search/details | Implemented | frontend pages and public TMDB-backed API routes |
| Firebase identity and Dex profiles | Implemented | auth sync, token verification and username registry |
| Watchlist/history CRUD | Implemented | user-scoped watch endpoints and regression tests |
| Existing-title state on detail page | Visually verified working | Screenshot shows Already watched; new-title create and duplicate race still need verification |
| Taste Engine V1 | Implemented | signed incremental vectors, reversible transaction contributions |
| Legacy taste backfill | Implemented | authenticated cursor-paginated idempotent endpoint |
| Personalized recommendations | Visually verified working | Screenshot shows Safe/Adjacent/Wildcard cards populated; API version/status code not captured |
| API deployment diagnostics | Implemented in source | GET/HEAD health endpoint returns API version |
| Render deployment alignment | Two user-facing API flows now visually working; runtime version still unverified | screenshots plus health/CRUD checks pending; see runbook |
| Production recommendation/watch lookup smoke tests | Not passed on evidence supplied so far | live browser reported recommendation 404 and watch GET 405 |

## Validation snapshot

The latest verified GitHub Actions run associated with main commit 2101f34e2b9408b965b1d92658e424b04a47db9a completed successfully:

- Backend compile check passed.
- Backend Pytest: 30 passed, 1 warning.
- Frontend dependency install, TypeScript check and production build passed.
- Vercel commit status was successful.
- Render's active deployment was not independently confirmed. A passing frontend check must not be treated as proof that Render is serving the same backend revision.

See [testing evidence](09_Testing.md) and [deployment diagnostics](12_Deployment_Runbook.md).

## Documentation maintenance rules

1. Update the relevant document in the same change as an API, Firestore, taste-model, user-flow, deployment, or security change.
2. Add a dated entry to the development log with commit/PR/test evidence. Do not reconstruct undocumented history as fact.
3. Keep implementation status separate from production deployment status.
4. Label proposed targets and unverified controls as such. Never present an unrun end-to-end test as a pass.
5. Keep the Vercel deployment filter aligned with the actual project root directory; test docs-only, backend-only and frontend commits before relying on it.
5. Keep secrets, Firebase tokens, service-account JSON, and real user data out of documentation and screenshots.

## Repository links

- [Root README](../README.md)
- [Backend guide](../backend/README.md)
- [Frontend guide](../frontend/README.md)
- [Architecture Decision Records](../ADR/README.md)
- [Changelog](../CHANGELOG.md)
- [CI workflow](../.github/workflows/ci.yml)
