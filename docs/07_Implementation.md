# Implementation Status and Roadmap

> **Status:** Main-branch implementation status — 2026-11-07  
> **Owner:** Dex maintainers  
> **Source branch:** main  
> **Current backend source version:** 0.5.1

## 1. Delivery summary

Dex has a deployed frontend and a FastAPI backend. The latest user-provided screenshots now show the signed-in For You section loading Safe, Adjacent and Wildcard recommendation cards, and the media detail page correctly showing an existing title as Already watched. This supersedes the earlier screenshot evidence of 404 for GET /api/recommendations and 405 for GET /api/watches/{watch_id} for these observed UI flows. The live API health version, a new-title Add to list create flow, and full authenticated route smoke tests are still not independently confirmed.

Implementation status and production status are separate. PR #20 (reliability) and PR #21 (Recommendation Engine V2) are merged into main. A feature marked implemented below means that the code exists in main and is covered by automated tests. A user-provided screenshot can confirm a visible UI flow, but does not establish the exact backend version, response status codes, or every edge case.

## 2. Delivered milestones

| Area | Delivered behaviour | Main evidence | Status |
|---|---|---|---|
| Discovery | Trending, search and media details backed by TMDB | backend/app/main.py and TMDB service | Implemented |
| Identity | Firebase token verification, Dex profile sync and normalized unique usernames | Firebase auth service and API tests | Implemented |
| Watch library | User-scoped create/list/update/delete | watch API and regression tests | Implemented |
| Detail-page status | Show Watched / Want to watch / In future choices; load existing status and handle create conflicts | commit 8731aa2; `MediaDetailsPage.tsx`; existing `POST /api/watches` status contract | Implemented in source |
| Taste Engine V2 | Exact per-watch contribution snapshots; all-time and recent profiles rebuilt from watches; no per-feature vector writes | recommendations.py, taste.py; PR #21; 48 backend tests before merge | Implemented |
| Legacy backfill | Authenticated, idempotent cursor pagination, max 50 per page | taste_backfill.py; commit 7b477b1; API tests | Implemented |
| Local IDF | Document frequency computed from this user's watched titles plus the current candidate pool; global counters removed | recommendations.py; PR #21 | Implemented |
| Recommendations V2 | TMDB item-to-item retrieval, discover fallback, local IDF, versioned six-hour candidate cache, weighted top-k sampling and three distinct slots | recommendations.py; PR #21 | Implemented in source; post-merge Render verification pending |
| Homepage For You | Signed-in recommendation section, refresh and historical profile setup | HomePage.tsx; commits c80af93, 4ae1e22, 86b6356 | Implemented in source |
| API deployment diagnostics | GET/HEAD health returns API version and expected watch write route | main.py; commit 477cb23 | Implemented in source |
| Render source alignment | Blueprint sets branch main, backend root, auto deploy and health check | render.yaml; commit 2101f34 | UI flows now work; active source version and service settings still unverified |

The media detail page now offers three explicit save actions for unsaved titles: **Watched**, **Want to watch**, and **In future**. These map to the existing status contract, so no backend schema migration is required. A successful save is replaced by the corresponding existing-status label. The watched path triggers the backend's existing taste metadata/contribution logic; the other two statuses are excluded from taste.

## 3. Recommendation and profile lifecycle

1. When a user marks a title watched, the backend attempts to load shared TMDB feature metadata.
2. If metadata is available, the exact signed contribution is stored on the watch record; profile counters and profile_version are updated transactionally.
3. If metadata is unavailable, the watched record can remain pending; the watch itself is not silently discarded.
4. Legacy watched records are processed using POST /api/taste/backfill with cursor pagination. The endpoint skips records already current and can retry pending records on a later pass.
5. GET /api/recommendations rebuilds all-time and recent profiles from watch contributions, retrieves TMDB item-to-item candidates with discover fallback, enriches candidates, computes local IDF, and caches versioned candidate pools before sampling Safe, Adjacent and Wildcard slots.
6. The signed-in homepage displays the slots and lets the user refresh. One backfill page is run per action, not as an unbounded client loop.

## 4. Current validation evidence

Latest checked commit: 2101f34e2b9408b965b1d92658e424b04a47db9a.  
GitHub Actions run: https://github.com/Shreyas-patil07/Dex/actions/runs/42286609985

- Backend compileall passed.
- Backend Pytest reported 30 passed, 1 warning.
- Frontend npm ci, npm run typecheck and npm run build passed.
- Vercel status check was successful.
- User-provided UI screenshots now show For You populated with Safe, Adjacent and Wildcard recommendations and a media details page showing Already watched. This is a successful visual smoke test for those two paths.
- The current API health version and HTTP response codes were not captured in the latest screenshots. A fresh-title POST /api/watches create flow and complete authenticated CRUD smoke test remain unverified.

Earlier browser diagnostics received on 2026-11-07 reported:
- GET /api/recommendations returned HTTP 404.
- GET /api/watches/{watch_id} returned HTTP 405.
- The detail-page status check therefore displayed Method Not Allowed at that time. The later screenshot showing Already watched demonstrates that the detail-status UI path subsequently became operational for an existing record.
- Console messages from chrome-extension://.../processor.js and content-script MaxListeners warnings originate from a browser extension context and are not evidence of a Dex application defect.

## 5. Immediate next work — release blocker and v0.6 gate

| Priority | Task | Acceptance condition | Status |
|---|---|---|---|
| P0 | Confirm Render service is linked to Shreyas-patil07/Dex, branch main, rootDir backend | Dashboard/service settings match root render.yaml | UI paths operational; dashboard settings unverified |
| P0 | Audit production Firestore Rules and Firebase IAM | Access policy reviewed and evidence recorded; no public/private data leakage | Pending |
| P0 | Define event retention, pause/clear, export and deletion semantics before event collection | Data lifecycle approved and deletion coverage designed | Pending |
| P0 | Stop unnecessary Vercel frontend builds | Docs-only and backend-only commits skip frontend build; frontend changes still build | Config added; live behaviour unverified |
| P0 | Confirm Render Blueprint changes were applied and latest main commit deployed | Render deploy history shows a successful deployment containing 2101f34 or later | Pending |
| P0 | Verify GET /api/health | JSON reports version 0.5.1 or a later source version | Pending |
| P0 | Verify protected recommendation and watch routes | With valid auth: recommendation endpoint returns 200; watch lookup returns 200 or 404, never 405 | UI smoke test passed; exact HTTP codes/version pending |
| P0 | Retest detail-page Add to list flow | Existing title renders existing status; missing title can be created once; duplicate race is handled | Existing-title status confirmed; fresh-title create/duplicate race pending |
| P1 | Backfill actual existing user histories | Run pages until complete; retry pending IDs; verify profile counts match watched records with contributions | Not yet evidenced |
| P1 | Validate recommendation quality with representative histories | Document test users/fixtures, expected relevance, diversity and known failure cases | Pending |
| P1 | Add automated browser tests | Home, For You, detail status, add flow and mobile/desktop smoke checks pass | Pending |

See [Deployment Runbook](12_Deployment_Runbook.md) for exact probes and Render settings.

## 6. Approved v0.6 direction

The approved next release is **Reliability and Discovery Intelligence**. The PR #21 recommendation architecture is now merged; it is a code-level milestone, not proof that the new backend revision has completed its Render deployment. Render verification is the release gate. After production V2 verification and the Firebase Rules/IAM audit, implement first-party recommendation events in Firestore (batched per page view, idempotent, server-derived UID), explicit More like this / Less like this / Not interested feedback, and an offline evaluation harness with 3–5 predeclared fixture profiles. Do not infer dislike from silence or tune model parameters by eye.

The v0.6 event pipeline must not collect tokens or free text and must have retention, pause/clear, export and deletion semantics before production collection. Audit Firestore Rules and IAM first. Keep TMDB as the sole catalogue. Defer Kafka/Flink, vector databases, neural recommenders, social features, streaming, watch parties and gamification.

Detailed scope, event fields, decision register, bias controls and exit gates: [v0.6 Reliability and Discovery Intelligence](13_v0.6_Reliability_and_Discovery_Intelligence.md).

## 7. Engineering backlog

| Priority | Work item | Rationale |
|---|---|---|
| P1 | Production Firebase Security Rules and IAM audit | Rules/config are not represented in the repository |
| P1 | Account export, deletion and retention design | Define lifecycle for users, watches, taste vectors and private notes |
| P1 | Firestore backup and restore exercise | Protect user history and aggregate state |
| P1 | Shared rate-limit store before multi-instance scaling | memory:// counters are per process |
| P1 | Operational metrics and alerting | CI/health alone do not provide production SLO evidence |
| P2 | Taste model offline evaluation | Ranking quality is not established by unit tests |
| P2 | Recommendation cold-start and sparse-history UX review | Small profiles can produce weak or generic recommendations |
| P2 | Accessibility and formal browser support matrix | Responsive utility classes are present; full audit is not evidenced |
| P2 | Dependency/action warning maintenance | Latest CI reports deprecation warnings that should be tracked |

## 8. Definition of done

A delivery is complete only when acceptance criteria are met, tests pass, authentication and data isolation are preserved, taste contribution reversal remains correct, docs are updated, secrets remain protected, and deployment is verified at the correct hosting platform. Do not close a production deployment task based only on GitHub Actions or Vercel status when the backend is hosted separately on Render.

## 9. Work tracking

- Repository: https://github.com/Shreyas-patil07/Dex
- CI: https://github.com/Shreyas-patil07/Dex/actions
- Frontend: https://dex-list.vercel.app/
- Backend: https://dex-connect.onrender.com/
- API docs: https://dex-connect.onrender.com/docs
