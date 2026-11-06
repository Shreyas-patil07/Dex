# Development Log

Keep entries factual and chronological. Dates below use the project owner's local calendar date (Asia/Kolkata) where applicable. Commit links are the primary evidence for repository changes. A code commit is not automatically evidence of a successful production deployment.

## Entry format

### YYYY-MM-DD — Title

- **Type:** Milestone / Experiment / Change / Issue / Release
- **Summary:** What changed.
- **Evidence:** Commit, PR, issue, test, report.
- **Outcome:** Verified result.
- **Next action:** Follow-up.

---

## Entries

### 2026-11-07 — Live discovery and existing-watch UI flows confirmed working

- **Type:** Production smoke test / User-provided evidence
- **Summary:** New screenshots show the signed-in Home page successfully populated with Safe, Adjacent and Wildcard recommendation cards. A separate media detail screenshot shows the existing-title status as Already watched. This supersedes the earlier visible 404/405 failure state for these two observed UI paths.
- **Evidence:** User-provided screenshots: Home page with all three recommendation slots populated; The Dark Knight detail page showing Already watched. The screenshots do not expose the API response codes or deployed /api/health version.
- **Outcome:** Visual smoke test passed for recommendation rendering and existing-watch status display. Do not claim complete production verification yet.
- **Next action:** Capture GET /api/health version; verify authenticated route responses; test adding a genuinely new title (201), reloading to confirm existing state, and handling duplicate 409; then record whether Vercel ignoreCommand skipped the next docs-only build.

### 2026-11-07 — v0.6 direction approved and Vercel build filtering added

- **Type:** Product decision / Deployment-cost optimization
- **Summary:** Adopted the Dex Upgrade Brief as the product direction. v0.6 is Reliability and Discovery Intelligence, gated on live Render verification. Added a plan covering first-party batched recommendation events, explicit feedback, offline evaluation, Firebase Rules/IAM audit and data lifecycle controls. Added Vercel ignoreCommand configuration at repository and frontend roots so docs-only and backend-only changes can skip the frontend build while frontend changes still build.
- **Evidence:** [v0.6 plan](13_v0.6_Reliability_and_Discovery_Intelligence.md); Vercel configuration in vercel.json and frontend/vercel.json; [Vercel ignoreCommand documentation](https://vercel.com/docs/project-configuration/vercel-json).
- **Outcome:** Configuration and plan are committed in source. Vercel project root and live skip behaviour have not yet been verified from the Vercel Dashboard. Vercel documents that ignored builds are canceled deployments and may still count against deployment quotas, even though the build itself is skipped.
- **Next action:** Confirm Vercel Root Directory and test docs-only, backend-only and frontend-code commits; verify Render before starting v0.6 event implementation.

### 2026-11-07 — Render API deployment mismatch documented

- **Type:** Issue / Operations
- **Summary:** Browser diagnostics showed GET /api/recommendations returning 404 and GET /api/watches/{watch_id} returning 405 from the deployed dex-connect.onrender.com host. Main source contains both authenticated routes. The Method Not Allowed message shown under Add to list is consistent with the detail page's initial GET status lookup failing; it does not prove that POST /api/watches is failing.
- **Evidence:** User-provided browser DevTools screenshots; main source route declarations in backend/app/main.py; API tests for recommendations and user-scoped watch lookup.
- **Outcome:** Production Render revision cannot yet be treated as aligned with main. Browser extension content-script errors in the same console are external to Dex.
- **Next action:** Confirm Render service repository, branch, root directory, Blueprint synchronization and active successful deploy; then run the authenticated smoke tests in 12_Deployment_Runbook.md.

### 2026-11-07 — Render branch and health-check configuration

- **Type:** Operations / Configuration
- **Summary:** Set Render Blueprint service branch to main, rootDir to backend, autoDeployTrigger to commit, and healthCheckPath to /api/health.
- **Evidence:** [Commit 2101f34](https://github.com/Shreyas-patil07/Dex/commit/2101f34e2b9408b965b1d92658e424b04a47db9a); root render.yaml.
- **Outcome:** Configuration is present in the repository and GitHub CI passed. This does not confirm the existing Render service has synced the Blueprint or completed a deployment.
- **Next action:** Verify Dashboard and live /api/health response. See [Render Blueprint reference](https://render.com/docs/blueprint-spec).

### 2026-11-07 — API health version fingerprint

- **Type:** Change / Diagnostics
- **Summary:** FastAPI version set to 0.5.1. GET /api/health returns service/version and the expected watch write endpoint; HEAD remains supported for health checks.
- **Evidence:** [Commit 477cb23](https://github.com/Shreyas-patil07/Dex/commit/477cb239e0883619f0cbee73185d9ab4e05b1414); backend/tests/test_api.py.
- **Outcome:** Local/API test contract and source identify the backend revision during deployment smoke testing.
- **Next action:** Verify the live Render health response reports 0.5.1 or newer.

### 2026-11-07 — Homepage personalized discovery integration

- **Type:** Product milestone
- **Summary:** Added signed-in For You shortcut and Picked for your taste section. It loads recommendations, exposes refresh, shows Safe/Adjacent/Wildcard cards, handles no-history state and exposes a one-page-at-a-time taste backfill action.
- **Evidence:** [Commit c80af93](https://github.com/Shreyas-patil07/Dex/commit/c80af93814ba093229f3760b947cc419ca5a9eb6), [type-check correction 4ae1e22](https://github.com/Shreyas-patil07/Dex/commit/4ae1e22692afa2356fd65da566ded47bed77c6b7), [navigation correction 86b6356](https://github.com/Shreyas-patil07/Dex/commit/86b635697a9e7a2127405970d90d741adca3039e).
- **Outcome:** Frontend implementation and CI build/typecheck are green. Live recommendations remain dependent on Render serving the matching API route.
- **Next action:** Verify For You with a signed-in account after backend deployment; execute legacy backfill where needed.

### 2026-11-07 — Recommendation pipeline and regression coverage

- **Type:** Backend milestone
- **Summary:** Added personalized Safe/Adjacent/Wildcard candidate slots, signed scoring, recent taste profile, feature IDF weighting, candidate-pool percentile semantics and MMR diversification.
- **Evidence:** [Pipeline  faf006b](https://github.com/Shreyas-patil07/Dex/commit/faf006b8558366dad71e2f6cf98066b7de046a86); [tests 127a48f](https://github.com/Shreyas-patil07/Dex/commit/127a48f28fb20fbb9c1675a1171f26a6f5e424e8); [finalization b66bd4f](https://github.com/Shreyas-patil07/Dex/commit/b66bd4f1dccefe48ffa0b24ed6cc303725e8c9f9).
- **Outcome:** Backend implementation and tests are in main. Candidate percentile is explicitly not a probability of liking a title.
- **Next action:** Evaluate recommendation quality using representative histories and live API results.

### 2026-11-07 — Shared catalogue feature statistics

- **Type:** Data/indexing change
- **Summary:** Added shared document-frequency counters so recommendation scoring can use inverse document frequency for common versus rare features.
- **Evidence:** [Commit 183aa13](https://github.com/Shreyas-patil07/Dex/commit/183aa13450cbb252cbefb1a6dcc49b328288a191); backend/app/services/tmdb_catalog.py.
- **Outcome:** Feature index is versioned and transactionally adjusted when a catalogue item's indexed features change.
- **Next action:** Monitor index correctness as the shared catalogue grows.

### 2026-11-07 — Paginated historical taste backfill

- **Type:** Backend milestone
- **Summary:** Added POST /api/taste/backfill. The endpoint processes watched records in bounded pages, skips already-current contributions, resumes with a cursor and returns pending IDs for later retry.
- **Evidence:** [Commit 7b477b1](https://github.com/Shreyas-patil07/Dex/commit/7b477b1765289f393e5add201a643ffe0b041dd4); backend/app/services/taste_backfill.py; API regression test.
- **Outcome:** Backfill is idempotent and reuses transactional watch/taste updates. The repository contains the mechanism; completion against real user history has not been evidenced.
- **Next action:** Execute per-user backfill after Render deploy and verify completion/pending results.

### 2026-11-07 — Existing watch status on media details

- **Type:** UX / API change
- **Summary:** Added authenticated GET /api/watches/{watch_id}, user-scoped lookup and detail-page labels for Already watched, In your watchlist and Planned for later. A 409 create race re-reads the user's status.
- **Evidence:** [Commit 806a536](https://github.com/Shreyas-patil07/Dex/commit/806a536c23346428547b57a73a00ac4d9da13d44); backend/tests/test_api.py; frontend/src/pages/MediaDetailsPage.tsx.
- **Outcome:** The source and API tests cover per-user status and cross-user 404 behaviour. Current production browser evidence still shows a 405 for this GET route.
- **Next action:** Retest on the live Render revision.

### 2026-11-07 — Project documentation baseline merged

- **Type:** Documentation milestone
- **Summary:** Merged the initial project documentation set and architecture decision records into main.
- **Evidence:** [Documentation merge commit b0d93bc](https://github.com/Shreyas-patil07/Dex/commit/b0d93bc8eda1b802918c0f9e77c6098038022878); initial docs commit 52bf31c.
- **Outcome:** Product, technical, architecture, flow, UI, data, implementation, security and testing documents established.
- **Next action:** Maintain documents alongside implementation and record verified progress.

### 2026-10-31 — Taste Engine V1 foundation

- **Type:** Backend milestone
- **Summary:** Added transactional taste profiles, shared TMDB feature metadata cache and reversible watch contributions.
- **Evidence:** [Commit cf454433](https://github.com/Shreyas-patil07/Dex/commit/cf4544333a2b708dca2710caa9ba6f7196d88a2f); taste service and tests.
- **Outcome:** Watched-only signed feature vectors are maintained transactionally; legacy watches require backfill to become recommendation-ready.
- **Next action:** Continue versioning extraction/scoring rules and evaluate recommendation quality.

### 2026-11-07 — Latest CI validation

- **Type:** Validation
- **Summary:** GitHub Actions run 42286609985 completed successfully for commit 2101f34e2b9408b965b1d92658e424b04a47db9a.
- **Evidence:** [CI run 42286609985](https://github.com/Shreyas-patil07/Dex/actions/runs/42286609985).
- **Outcome:** Backend compileall passed; Pytest reported 30 passed and 1 warning; frontend npm ci, typecheck and build passed; Vercel status was success. Render live deploy was not verified.
- **Next action:** Complete Render smoke testing and close the production API mismatch only after live route checks pass.
