# Implementation Status and Roadmap

> **Status:** Main-branch implementation status — 2026-11-07  
> **Owner:** Dex maintainers  
> **Source branch:** main  
> **Backend app version:** 0.5.1  
> **Main commit:** `eab2af2a3c9641801d5c639dccd8f612831c4329`

## 1. Delivery summary

Dex is a React/TypeScript frontend and FastAPI backend using Firebase Authentication, Cloud Firestore and TMDB. The current source includes Recommendation Engine V2, an offline synthetic evaluation harness, and a Render source-commit fingerprint on the public health endpoint.

**Code state and production state are separate.** The last user-provided PowerShell route probes were executed before PRs #20 and #21 merged. They returned health 200/version 0.5.1 and 401 for unauthenticated recommendation and watch routes. Those results confirm the older deployment's route/auth behaviour, not that Render has deployed V2. PR #23 adds `source_commit` to `/api/health`; the live value has not yet been confirmed.

## 2. Delivered milestones

| Area | Delivered behaviour | Evidence | Status |
|---|---|---|---|
| Discovery | Trending, search and media details backed by TMDB | FastAPI routes and frontend pages | Implemented |
| Identity | Firebase token verification, profile sync and unique usernames | Firebase Admin auth service; API tests | Implemented |
| Watch library | User-scoped create/list/update/delete and single-watch lookup | `backend/app/main.py`; API tests | Implemented in source |
| Taste Engine V2 | Watch-level signed contribution snapshots; all-time/recent profiles rebuilt from watches; no per-feature vector writes | PR #21; `taste.py`, `recommendations.py` | Implemented |
| Local IDF | Feature rarity computed from watched titles plus current candidate pool; global stats removed | PR #21; `recommendations.py` | Implemented |
| Recommendations V2 | TMDB item-to-item retrieval, discover fallback, six-hour versioned cache, top-k exploration and Safe/Adjacent/Wildcard slots | PR #21; `recommendations.py` | Implemented in source; Render verification pending |
| Historical backfill | Authenticated, idempotent cursor-paginated enrichment, up to 50 records per page | `taste_backfill.py`; API tests | Implemented |
| Offline evaluation | Five synthetic profiles, NDCG/Precision/Recall/diversity metrics and deterministic MMR diagnostic | PR #22; `backend/scripts/evaluate_recommendations.py` | Implemented |
| Deployment fingerprint | Health response reports Render's deployed commit SHA as `source_commit` | PR #23; `/api/health` | Implemented in source; live value pending |
| CI | Backend audit/compile/tests; frontend typecheck/build; npm audit | `.github/workflows/ci.yml`; PR #25 | All jobs green on merge commit `eab2af2` |

The media detail page offers three save actions for unsaved titles: **Watched**, **Want to watch**, and **In future**. The watched path creates taste contribution metadata; the two planned states do not contribute to taste.

## 3. Recommendation and profile lifecycle

1. A watched title is enriched using shared TMDB catalogue metadata when available.
2. The exact signed contribution snapshot is stored on the watch record. Profile counters and `profile_version` are updated transactionally.
3. If TMDB metadata is unavailable, the watch can persist as pending and be retried through the bounded backfill endpoint.
4. Recommendation generation rebuilds all-time and recent profiles from watch snapshots, retrieves item-to-item candidates with discover fallback, computes local IDF, and caches versioned candidate pools.
5. The API samples Safe/Adjacent/Wildcard slots from the cached candidate pools. Match percentages remain candidate-pool percentiles, not probabilities.

## 4. Current validation evidence

**PR #22 evaluation CI:** [run 42348154051](https://github.com/Shreyas-patil07/Dex/actions/runs/42348154051)

- Backend compileall passed.
- Backend Pytest: **55 passed, 1 warning**.
- Backend pip-audit passed.
- Offline evaluator CLI ran successfully and printed five-profile macro metrics.
- Frontend typecheck and production build passed.
- Frontend npm audit now passes after PR #25 upgraded Vite within major 8 and pinned patched transitive `@grpc/grpc-js`, `re2js` and `source-map-js` versions. Firebase remains on major 12; no UI/application source changed.

**PR #23 health fingerprint CI:** [run 42348387889](https://github.com/Shreyas-patil07/Dex/actions/runs/42348387889)

- Backend tests/compile/pip-audit passed.
- Frontend typecheck/build passed.
- The pre-PR25 frontend audit failed on seven existing dependency findings.

**PR #25 dependency remediation CI:** [run 42349337748](https://github.com/Shreyas-patil07/Dex/actions/runs/42349337748)

- Backend compilation, pip-audit, 55 tests and offline evaluator passed.
- Frontend `npm ci`, `npm audit --audit-level=high`, typecheck and production build passed.
- The merge-triggered main CI run [42349393265](https://github.com/Shreyas-patil07/Dex/actions/runs/42349393265) also passed all three jobs.

**Production evidence:** the user-provided PowerShell checks before PRs #20/#21 returned:
- `GET /api/health`: HTTP 200, version 0.5.1.
- Unauthenticated `GET /api/recommendations`: HTTP 401.
- Unauthenticated `GET /api/watches/movie_550`: HTTP 401.

These checks were pre-merge. A new health response must show `source_commit` equal to the expected merged main SHA before claiming the V2 deployment is live. Authenticated operations have not yet been independently verified.

The synthetic evaluator's reported baseline is documented in [Testing and Validation](09_Testing.md). Its fixture grades are assumptions, not independent human judgements or real-user recommendation evidence.

## 5. Release gates and immediate backlog

| Priority | Task | Acceptance condition | Status |
|---|---|---|---|
| P0 | Verify Render service settings and deploy | Render uses repo `Shreyas-patil07/Dex`, branch `main`, root `backend`, correct secrets and expected auto-deploy | Pending external dashboard check |
| P0 | Verify Render source fingerprint | `/api/health.source_commit` equals the latest deployed main commit | Pending post-PR #23 deployment |
| P0 | Verify protected routes after deploy | Unauthenticated recommendation/watch probes return 401; authenticated recommendation returns 200; watch lookup returns 200/404 | Pending |
| P0 | Verify watch lifecycle end to end | Fresh watch create 201; reload persists; duplicate create returns 409 and UI recovers | Pending |
| P1 | Complete historical taste backfill | Follow cursors to `complete=true`; retry pending IDs; reconcile counts | Pending for production account |
| P0 | Audit production Firestore Rules and Firebase IAM | Live rules reviewed; client access denied unless explicitly needed; backend service account least-privilege confirmed | Pending external Firebase/Google Cloud review |
| P1 | Implement account export | Authenticated, versioned, paginated, UID-scoped export with cross-user tests | Not implemented |
| P1 | Implement account deletion | Resumable recursive Firestore deletion, username release and Firebase Auth deletion | Not implemented |
| P1 | Reconcile privacy notice with actual collection | Current/future data distinguished; event purpose, retention and controls explained | Pending review |
| P1 | Recommendation event pipeline | Batched, idempotent, server-UID-derived, retention/clear/export/delete-aware | Blocked by data lifecycle gates |
| P1 | Explicit recommendation feedback | More like this / Less like this / Not interested; do not infer dislike from silence | Blocked by data lifecycle gates |
| P2 | Browser E2E suite | Home/recommendation/detail/watch flows across desktop/mobile | Not established |
| P2 | Frontend dependency security remediation | Resolve high-severity npm audit findings without downgrading Firebase or changing UI | Completed in PR #25; main CI green |

The source-based collection inventory, retention analysis, export/deletion contract and Firebase Rules/IAM checklist are in [Data Lifecycle and Privacy Readiness](14_Data_Lifecycle_and_Privacy_Readiness.md).

## 6. Approved v0.6 build order

1. Complete the post-merge Render verification and authenticated smoke tests.
2. Audit the actual Firebase Firestore Rules and IAM/service-account permissions.
3. Implement account export and resumable account deletion, including legacy per-user taste documents.
4. Approve event purpose, notice/consent, raw-event retention, pause/clear and aggregate deletion.
5. Only then add batched recommendation-event ingestion and explicit card feedback.
6. Use the synthetic evaluator as a regression baseline; do not tune the ranking weights from its authored labels.

Keep the current modular monolith and Firestore architecture. Do not add Kafka, Flink, a vector database, or an online experimentation platform without measured need.

## 7. Definition of done

A delivery is complete only when acceptance criteria are met, tests pass, UID isolation is preserved, watch/taste transaction invariants remain correct, data lifecycle hooks are updated, secrets remain protected, documentation reflects the implementation, and production deployment is verified at the correct host. A green GitHub or Vercel check does not prove Render is serving the same source revision.
