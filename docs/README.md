# Dex documentation index

> **Documentation snapshot:** 2026-11-07  
> **Source branch:** main  
> **Backend source version:** 0.5.1  
> **Production Render state:** Pre-merge 200/401/401 route probes passed; post-merge source commit and authenticated flows still pending

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
| Existing-title state on detail page | Visually verified working | Screenshot shows Already watched; new-title create and duplicate race still need verification |
| Taste Engine V2 | Implemented | Per-watch contributions, profile rebuild, item-to-item retrieval, local IDF and versioned cache |
| Legacy taste backfill | Implemented | authenticated cursor-paginated idempotent endpoint |
| Personalized recommendations | Visually verified working | Screenshot shows Safe/Adjacent/Wildcard cards populated; API version/status code not captured |
| API deployment diagnostics | Implemented in source | GET/HEAD health returns API version and Render source commit SHA |
| Render deployment alignment | Two user-facing API flows now visually working; runtime version still unverified | screenshots plus health/CRUD checks pending; see runbook |
| Production recommendation/watch lookup smoke tests | Not passed on evidence supplied so far | live browser reported recommendation 404 and watch GET 405 |

## Validation snapshot

PR #25's CI and merge-triggered main run passed all jobs: backend compile, pip-audit, 55 tests and evaluator CLI; frontend typecheck/build; and frontend `npm audit --audit-level=high`. PR #25 preserves Firebase 12 and resolves the prior high-severity dependency findings. PR #23 adds the deployed Render commit SHA to the health response. The live Render revision after PR #23 has not yet been independently confirmed; a passing GitHub Actions or Vercel check is not proof of a successful Render deploy.

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
