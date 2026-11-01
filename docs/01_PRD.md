# Product Requirements Document (PRD)

> **Status:** Baseline — requirements inferred from current product and implementation  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02  
> **Version:** 1.0

## 1. Overview

- **Product name:** Dex
- **One-line description:** An entertainment identity platform for discovering movies and series, recording viewing history, and understanding personal taste.
- **Product type:** Web application with API backend.
- **Primary platforms:** Modern desktop and mobile browsers.

## 2. Problem statement

Entertainment activity is fragmented across streaming services, search engines, notes, and memory. A conventional watchlist records titles but does not provide a consolidated, evolving representation of an individual's viewing history and preferences.

Dex aims to combine discovery, personal watch records, profile identity, and taste analysis in one user-controlled service.

## 3. Goals and non-goals

### Goals

- **G-01:** Let users discover trending movies and TV titles using TMDB data.
- **G-02:** Let users search titles and inspect useful metadata.
- **G-03:** Provide Firebase-backed sign-in and a Dex profile with a unique username.
- **G-04:** Let authenticated users create, inspect, update, and delete watch records.
- **G-05:** Derive taste signals from watched media and maintain them as watch records change.
- **G-06:** Provide responsive web access and deployed frontend/API services.

### Non-goals

- **NG-01:** Hosting, streaming, downloading, or redistributing film/series content.
- **NG-02:** Replacing streaming-provider subscriptions or guaranteeing availability.
- **NG-03:** Claiming perfect or deterministic recommendations from limited watch history.
- **NG-04:** Managing payments, subscriptions, or social messaging in the current baseline.
- **NG-05:** Treating a title marked want-to-watch or in-future as already watched for taste scoring.

## 4. Users and use cases

| User / stakeholder | Need | Context | Priority |
|---|---|---|---|
| Visitor | Browse trending/search media | No Dex account required for public discovery | P0 |
| Registered user | Maintain watch history and profile | Authenticated browser session | P0 |
| Registered user | Understand viewing taste | Depends on recorded watched titles | P1 |
| Maintainer | Operate and improve platform | Deployment, Firebase, TMDB, tests | P1 |

### Primary use cases

1. A visitor browses trending movies or series to find something to watch.
2. A visitor searches for a title and opens its details.
3. A user signs in and synchronizes their Firebase identity with a Dex profile.
4. A user claims a unique username.
5. A user records a title as watched, want-to-watch, or in-future.
6. A user adds an optional rating, watched date, or note to a watch record.
7. A user edits or removes a watch record and expects the taste profile to be adjusted consistently.
8. A user views their profile and entertainment history.

## 5. Scope

### Current scope

- Trending catalogue discovery.
- Search for movie and television media.
- Media details, credits/videos metadata, and watch-provider response for India where returned by TMDB.
- Firebase sign-in and token verification by the backend.
- Unique normalized usernames and user profile data.
- Watch-record CRUD.
- Taste profile feature extraction and incremental updates.
- Deployed frontend and API.

### Later scope / validate before committing

- Rich recommendation ranking and explainability.
- Additional user-facing taste visualisations.
- Expanded social/community features.
- More explicit account export/deletion workflows.
- Multi-region provider availability and localisation.

### Out of scope

- Video playback and content licensing.
- Scraping private streaming accounts.
- Storing streaming credentials.
- Claiming that third-party watch-provider data is exhaustive.

## 6. Functional requirements

| ID | Requirement | Priority | Acceptance condition |
|---|---|---|---|
| FR-001 | The system shall show trending movies and series. | MUST | API returns media results for supported media types and time windows. |
| FR-002 | The system shall allow title search. | MUST | Search accepts a bounded query and returns movie/TV results. |
| FR-003 | The system shall provide a details view for a valid movie/TV identifier. | MUST | Detail response includes TMDB metadata and India provider data when present. |
| FR-004 | The system shall authenticate users through Firebase Authentication. | MUST | Protected API requests require a valid Firebase ID token. |
| FR-005 | The system shall synchronize a verified Firebase identity to a Dex user record. | MUST | A valid first sync creates a user document; subsequent syncs reuse it. |
| FR-006 | The system shall enforce unique normalized usernames. | MUST | Two distinct users cannot successfully claim the same normalized username. |
| FR-007 | The system shall let an authenticated user maintain watch records. | MUST | Create, list, update, and delete operations persist under the authenticated user. |
| FR-008 | The system shall validate watch fields and allowed status values. | MUST | Invalid media types, statuses, ratings, and oversized text are rejected. |
| FR-009 | Only watched titles shall contribute to the taste profile. | MUST | Want-to-watch and in-future items do not increment taste contributions. |
| FR-010 | Watch edits/deletions shall reverse stored taste contributions before applying new contributions. | MUST | Mutation and corresponding vector changes are transactionally consistent. |
| FR-011 | The system shall expose a health endpoint. | MUST | `GET /api/health` returns HTTP 200 when the API process is serving requests. |
| FR-012 | The frontend shall support responsive discovery and account workflows. | SHOULD | Core pages remain usable at supported mobile and desktop widths. |

## 7. Non-functional requirements

| ID | Quality attribute | Target / constraint | Verification |
|---|---|---|---|
| NFR-001 | Security | Firebase tokens verified server-side; admin credentials server-only | Auth tests and configuration review |
| NFR-002 | Data isolation | User data reads/writes scoped to verified UID | API tests and code review |
| NFR-003 | Integrity | Watch mutation and taste contribution changes remain consistent | Transaction tests |
| NFR-004 | Availability | Frontend/API hosted on managed platforms | Deployment health checks |
| NFR-005 | Maintainability | Feature code separated into services, routes, and schemas | Review repository structure |
| NFR-006 | Performance | Bound external API inputs and apply route rate limits | Load and API tests |
| NFR-007 | Privacy | Avoid logging credentials and unnecessary personal data | Logging/security review |

No numeric latency or availability SLA is currently asserted. Establish baselines before defining SLOs.

## 8. Success metrics

These are proposed metrics, not measured production values.

| Metric | Baseline | Target | Measurement method | Evaluation window |
|---|---|---|---|---|
| Successful trending requests | TBD | Establish baseline | API telemetry | 30 days |
| Search success/error rate | TBD | Establish baseline | API telemetry | 30 days |
| Watch mutation success rate | TBD | Establish baseline | Structured metrics | 30 days |
| Taste profile consistency | TBD | 100% mutation invariant in tests | Reconciliation tests | Per release |
| Frontend build reliability | Current CI | All main-branch builds pass | GitHub Actions | Per commit |

## 9. Constraints and dependencies

- **Identity:** Firebase Authentication.
- **Persistence:** Cloud Firestore.
- **Media metadata:** TMDB API and its terms/attribution requirements.
- **Hosting:** Vercel and Render.
- **Runtime:** Python 3.11; Node 22 in CI.
- **Secrets:** Firebase Admin service-account JSON and TMDB API key must be server-side.
- **Rate limits:** The configured in-memory rate-limit backend is single-instance oriented.
- **Assumption:** TMDB data can be incomplete, unavailable, or delayed.

## 10. Risks and open questions

| ID | Risk / question | Impact | Mitigation / next action |
|---|---|---|---|
| R-001 | TMDB outage or quota limits | Discovery/detail requests may fail | Return controlled errors; monitor failures |
| R-002 | In-memory rate limiting across multiple instances | Limits diverge across workers | Configure shared Redis storage before scaling |
| R-003 | Taste model bias from sparse histories | Low-quality inferred profile | Expose evidence/coverage and validate model |
| R-004 | Firestore rule/config drift | Data exposure or service failure | Review rules and service-account permissions |
| R-005 | Provider availability changes | Stale/incomplete watch guidance | Attribute data and avoid guarantee language |
| R-006 | User deletion/export lifecycle not fully documented | Privacy/compliance risk | Specify and test retention/deletion procedures |

## 11. Release acceptance

- Critical API and taste-engine regression tests pass.
- Frontend typecheck and production build pass.
- Secrets and production origins are configured correctly.
- Firestore security rules and Firebase project configuration are reviewed.
- Known third-party limitations and licence/attribution obligations are documented.
- Deployment health checks pass.

## 12. Traceability

- Technical constraints: [02_TRD.md](02_TRD.md)
- Architecture: [03_Architecture.md](03_Architecture.md)
- API and Firestore schema: [06_Protocol_and_Data_Schema.md](06_Protocol_and_Data_Schema.md)
- Testing: [09_Testing.md](09_Testing.md)
