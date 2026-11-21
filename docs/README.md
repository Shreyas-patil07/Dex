# Dex documentation index

> **Documentation snapshot:** 2026-11-21  
> **Source baseline:** main commit `2e97c3e91a5c2ceec4c9f98b0db334430f4550aa`  
> **Backend source version:** 0.5.1  
> **CI evidence:** Run `42365087448` passed all three jobs; 65 backend tests passed  
> **Production Render state:** Latest live source commit and authenticated end-to-end flows remain unverified

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
| Audit stored data, retention, export, deletion and Firebase access controls | [14 — Data Lifecycle and Privacy Readiness](14_Data_Lifecycle_and_Privacy_Readiness.md) |
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
| Existing-title state on detail page | Implemented; limited screenshot evidence | User screenshot dated 2026-11-07 showed Already watched; the current live API revision and fresh-title create flow still need verification |
| Taste Engine V2 | Implemented | Per-watch contributions, profile rebuild, item-to-item retrieval, local IDF and versioned cache |
| Legacy taste backfill | Implemented | authenticated cursor-paginated idempotent endpoint |
| Taste DNA profile | Implemented | Authenticated, read-only `GET /api/taste/profile`; Profile page displays positive, lower-rated and recent signals plus coverage |
| Personalized recommendations | Implemented; limited screenshot evidence | Source and tests expose Safe/Adjacent/Wildcard slots; user screenshot dated 2026-11-07 showed populated cards, but no current live HTTP result is recorded |
| API deployment diagnostics | Implemented in source | GET/HEAD health returns API version and Render source commit SHA |
| Render deployment alignment | Not independently verified | Latest source fingerprint, API route behavior and authenticated CRUD flow must be checked against the active Render deploy; see runbook |
| Production recommendation/watch lookup smoke tests | Pending current live verification | Earlier user-provided browser evidence reported recommendation 404 and watch GET 405 before later screenshot evidence; neither confirms the current deployed SHA |

## Validation snapshot

The latest recorded main-branch workflow is [CI run 42365087448](https://github.com/Shreyas-patil07/Dex/actions/runs/42365087448), for commit `2e97c3e91a5c2ceec4c9f98b0db334430f4550aa` (2026-11-07). All three jobs passed: backend dependency audit, compilation, 65 Pytest tests and offline recommendation evaluation; frontend typecheck and production build; and frontend high-severity npm audit. Pytest emitted one Starlette/httpx deprecation warning. PR #25's dependency remediation remains in main. PR #23's health source-commit fingerprint is present in source, but the live Render response has not been independently verified. CI passing does not prove Firebase, TMDB, or the active Render deployment works end-to-end.

See [testing evidence](09_Testing.md) and [deployment diagnostics](12_Deployment_Runbook.md).

## Documentation maintenance rules

1. Update the relevant document in the same change as an API, Firestore, taste-model, user-flow, deployment, or security change.
2. Add a dated entry to the development log with commit/PR/test evidence. Do not reconstruct undocumented history as fact.
3. Keep implementation status separate from production deployment status.
4. Label proposed targets and unverified controls as such. Never present an unrun end-to-end test as a pass.
5. Keep the Vercel deployment filter aligned with the actual project root directory; test docs-only, backend-only and frontend commits before relying on it.
6. Keep secrets, Firebase tokens, service-account JSON, and real user data out of documentation and screenshots.

## Repository links

- [Root README](../README.md)
- [Backend guide](../backend/README.md)
- [Frontend guide](../frontend/README.md)
- [Architecture Decision Records](../ADR/README.md)
- [Changelog](../CHANGELOG.md)
- [CI workflow](../.github/workflows/ci.yml)
