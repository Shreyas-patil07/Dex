# Product Requirements Document (PRD)

> **Status:** Maintained specification — reflects current main-branch implementation  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Overview

Dex is an entertainment identity web platform for discovering movies and series, recording viewing history, and understanding personal taste.

## 2. Problem statement

Entertainment activity is fragmented across streaming services, search engines, notes, and memory. Dex combines media discovery, personal watch records, profile identity, and taste analysis in one service.

## 3. Goals and non-goals

### Goals
- Discover trending movies and TV titles using TMDB.
- Search titles and inspect metadata.
- Provide Firebase-backed sign-in and a unique Dex profile.
- Maintain authenticated watch records.
- Derive signed taste signals from watched media and maintain them incrementally.
- Generate explainable Safe, Adjacent, and Wildcard recommendations.
- Migrate legacy watched records into the taste profile through safe, repeatable backfill.
- Provide responsive web access with deployed frontend/API.

### Non-goals
- Hosting, streaming, downloading, or redistributing content.
- Replacing streaming subscriptions or guaranteeing provider availability.
- Claiming perfect recommendations from limited watch history.
- Treating want-to-watch or in-future records as watched for taste scoring.

## 4. Users and use cases

| User | Need | Context | Priority |
|---|---|---|---|
| Visitor | Browse trending/search media | Public discovery | P0 |
| Registered user | Maintain watch history/profile | Authenticated | P0 |
| Registered user | Understand viewing taste | Recorded watched titles | P1 |
| Maintainer | Operate service | Deployments, Firebase, TMDB, tests | P1 |

Primary journeys: browse trending titles; search/open a title; sign in and synchronize profile; claim unique username; create/update/delete a watch; inspect profile/history.

## 5. Scope

Current: trending, search, media details, Firebase authentication, normalized unique usernames, profile/watch CRUD, taste feature extraction and incremental updates, historical taste backfill, personalized three-slot recommendations, per-title library status lookup, Vercel/Render configuration.

Potential future scope (not a commitment): taste visualisations, expanded social features, account export/deletion, recommendation-quality evaluation, and broader regional provider coverage.

Out of scope: video playback, content licensing, scraping private streaming accounts, and storing streaming credentials.

## 6. Functional requirements

| ID | Requirement | Priority | Acceptance condition |
|---|---|---|---|
| FR-001 | Show trending movies/series | MUST | Supported media type/time-window results |
| FR-002 | Search titles | MUST | Bounded query returns media results |
| FR-003 | Show media details | MUST | TMDB metadata and provider data when present |
| FR-004 | Authenticate with Firebase | MUST | Protected API requires valid Firebase ID token |
| FR-005 | Sync Firebase identity to Dex profile | MUST | First sync creates; later syncs reuse profile |
| FR-006 | Enforce unique normalized usernames | MUST | Distinct users cannot claim same name |
| FR-007 | Maintain watch records | MUST | CRUD scoped to authenticated user |
| FR-008 | Validate watch fields | MUST | Invalid type/status/rating/text rejected |
| FR-009 | Only watched titles affect taste | MUST | Other statuses do not contribute |
| FR-010 | Reverse taste contributions on edit/delete | MUST | Watch and vectors mutate atomically |
| FR-011 | Expose health endpoint | MUST | GET /api/health returns HTTP 200 |
| FR-012 | Support responsive core flows | SHOULD | Core pages usable on mobile/desktop |
| FR-013 | Read one user's watch entry | MUST | `GET /api/watches/{watch_id}` returns only the authenticated user's entry; absent/other-user entry returns 404 |
| FR-014 | Generate personalized discovery slots | SHOULD | Authenticated recommendations return Safe, Adjacent, and Wildcard slots with explicit score semantics |
| FR-015 | Backfill historical watched titles | MUST | Idempotent cursor pagination enriches only watched records and applies each taste contribution transactionally |

## 7. Non-functional requirements

| ID | Attribute | Constraint | Verification |
|---|---|---|---|
| NFR-001 | Security | Verify tokens server-side; admin credentials server-only | Auth/config review |
| NFR-002 | Isolation | Scope user data by verified UID | API tests |
| NFR-003 | Integrity | Watch/taste mutations consistent | Transaction tests |
| NFR-004 | Availability | Managed frontend/API hosting | Health checks |
| NFR-005 | Maintainability | Services/routes/schemas separated | Architecture review |
| NFR-006 | Performance | Bound inputs and rate-limit public routes | Load/API tests |
| NFR-007 | Privacy | Avoid logging credentials/unneeded data | Logging review |

No numeric latency or availability SLA is asserted; measure baselines first.

## 8. Success metrics

Proposed, not measured: trending/search error rates, watch mutation success, taste reconciliation correctness, and main-branch build reliability. Establish baselines before targets.

## 9. Constraints and dependencies

Firebase Authentication, Cloud Firestore, TMDB terms/attribution, Vercel, Render, Python 3.11, Node 22 in CI, server-side Firebase Admin/TMDB secrets, and single-instance limits of in-memory rate-limit storage.

## 10. Risks and open questions

| Risk | Impact | Next action |
|---|---|---|
| TMDB outage/quota | Discovery/detail failures | Controlled errors and monitoring |
| In-memory limits across instances | Divergent counters | Shared Redis before scaling |
| Sparse-history taste bias | Weak profiles | Evaluate model and expose coverage |
| Backend deployment drift | Frontend calls routes missing from the active API revision | Health/version endpoint, Render branch/build config, authenticated smoke tests |
| Firestore rule/config drift | Exposure/service failure | Audit production rules and IAM |
| Provider data changes | Stale/incomplete availability | Avoid guarantees |
| Data export/deletion unclear | Privacy risk | Specify and test lifecycle |

## 11. Release acceptance

Critical API/taste tests pass; frontend typecheck/build pass; production secrets/origins are correct; Firestore rules/IAM are reviewed; third-party/legal obligations are documented; health checks pass.

## 12. Traceability

- [TRD](02_TRD.md)
- [Architecture](03_Architecture.md)
- [API and data schema](06_Protocol_and_Data_Schema.md)
- [Testing](09_Testing.md)
- [Recommendation Engine](11_Recommendations_Engine.md)
- [Deployment Runbook](12_Deployment_Runbook.md)
