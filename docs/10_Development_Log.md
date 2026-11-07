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

### 2026-11-07 — Frontend dependency audit remediated

- **Type:** Security / Dependency maintenance
- **Summary:** Updated Vite within major version 8 and added npm overrides for patched transitive dependencies: `@grpc/grpc-js@1.14.6`, `re2js@2.8.7` and `source-map-js@1.2.2`. Firebase remains on major version 12. No frontend UI/application source changed and no forced Firebase downgrade was used.
- **Evidence:** [PR #25](https://github.com/Shreyas-patil07/Dex/pull/25); merge commit [eab2af2](https://github.com/Shreyas-patil07/Dex/commit/eab2af2a3c9641801d5c639dccd8f612831c4329); [PR CI run 42349337748](https://github.com/Shreyas-patil07/Dex/actions/runs/42349337748); [main CI run 42349393265](https://github.com/Shreyas-patil07/Dex/actions/runs/42349393265).
- **Outcome:** `npm ci`, `npm audit --audit-level=high`, frontend typecheck and production build passed. Main-branch backend compilation, pip-audit, Pytest and offline evaluator also passed. All three main CI jobs are green.
- **Next action:** Confirm Render's `/api/health.source_commit` matches the deployed main revision; complete authenticated production smoke tests.

### 2026-11-07 — Render health source fingerprint merged

- **Type:** Deployment diagnostics
- **Summary:** Added `source_commit` to GET /api/health using Render's documented `RENDER_GIT_COMMIT` environment variable. The field is null outside Render when the variable is absent. HEAD /api/health remains bodyless.
- **Evidence:** [PR #23](https://github.com/Shreyas-patil07/Dex/pull/23); merge commit [a5c96b1](https://github.com/Shreyas-patil07/Dex/commit/a5c96b12d4d292b62420cd12d130d34f42faa1cb); [Render environment variables](https://render.com/docs/environment-variables).
- **Outcome:** Backend tests/compile/pip-audit and frontend typecheck/build passed. The then-existing seven-high npm audit findings were remediated in PR #25. The live source_commit has not yet been captured.
- **Next action:** After Render deploys main, confirm the returned source_commit matches the deployed main SHA and run authenticated smoke tests.

### 2026-11-07 — Data lifecycle and privacy source audit

- **Type:** Security / Data governance
- **Summary:** Audited the current repository for stored user data, Firebase client usage, account export/deletion support, legacy recommendation data and the proposed event pipeline. Added a source-based collection inventory and implementation gates. No behavioural-event collection was introduced.
- **Evidence:** [Data Lifecycle and Privacy Readiness](14_Data_Lifecycle_and_Privacy_Readiness.md); `frontend/src/lib/firebase.ts`; `backend/app/firestore.py`; `backend/app/main.py`; `backend/app/services/tmdb_catalog.py`; `frontend/src/pages/PrivacyPolicy.tsx`.
- **Outcome:** The frontend currently uses Firebase Authentication without Firestore client SDK calls. Backend Firestore access uses the Firebase Admin SDK. No Rules file is tracked; live Firebase Rules/IAM have not been inspected. There is no account-wide export/delete endpoint. V2 ignores legacy taste_vectors/global feature stats but no production cleanup ran. Recommendation event storage is not implemented. The Privacy Policy includes some activity/social/device categories not demonstrated by current source; reconcile with actual production processing before event collection.
- **Next action:** Review the live Firebase project's Rules and service-account IAM; approve retention, consent/pause/clear and deletion policy; implement export and resumable deletion before adding recommendation-event writes.

### 2026-11-07 — Recommendation Engine V2 merged

- **Type:** Architecture / Recommendation engine
- **Summary:** Merged PR #21 after reconciling it with the merged reliability PR #20. V2 adds TMDB item-to-item retrieval from highly rated watches, keeps multi-page discover as fallback, rebuilds all-time and recent profiles from per-watch contribution snapshots, removes per-feature taste-vector reads/writes and global feature-stat counters, and caches enriched candidate pools for six hours using profile_version.
- **Evidence:** [PR #21](https://github.com/Shreyas-patil07/Dex/pull/21); merge commit [0908982](https://github.com/Shreyas-patil07/Dex/commit/0908982512903f3879fa4df3f835b1e1d10d70a2); conflict-resolution commit [7b99666](https://github.com/Shreyas-patil07/Dex/commit/7b99666a788898164562e6b0b7e9d25aeacc5be5).
- **Outcome:** PR validation passed backend tests (48), Python compilation, backend dependency audit, frontend typecheck and frontend production build. The frontend npm audit remains failing with seven high-severity findings inherited from the existing dependency tree; PR #21 did not change frontend dependency versions. Merge-triggered main CI passed backend and frontend jobs; the security audit job failed for the same reason.
- **Next action:** Verify the active Render deployment is running the merged main revision, then complete authenticated recommendation/watch/backfill smoke tests. Do not infer production success from the merge or CI.

### 2026-11-07 — Public production route-existence probes captured

- **Type:** Production smoke test / User-provided terminal evidence
- **Summary:** Before PR #20 and PR #21 were merged, the user ran GET /api/health, GET /api/recommendations without a token, and GET /api/watches/movie_550 without a token.
- **Evidence:** PowerShell output supplied in chat at 2026-11-07 06:26 UTC: health returned HTTP 200 and version 0.5.1; both protected routes returned HTTP 401 with "Authentication required".
- **Outcome:** This proves that the old deployed service had the route declarations and required authentication at that time. It does not verify the merged V2 backend deployment or any authenticated operation.
- **Next action:** Repeat health and protected-route checks after Render deploys the merged main commit; then use a signed-in test account for recommendation 200, watch lookup 200/404, watch create 201, duplicate 409 and backfill completion.

### 2026-11-07 — Offline recommendation evaluation harness started

- **Type:** Evaluation / Test infrastructure
- **Summary:** Added five synthetic, predeclared profiles covering sparse history, mixed genres, explicit negative preferences, recent preference shifts and anime-heavy taste. The evaluator scores with the production V2 all-time/recent scoring functions, reports NDCG@3, Precision@3, Recall@3, intra-list diversity and positive-feature coverage, and includes a deterministic greedy MMR ranking diagnostic.
- **Evidence:** backend/evaluation/recommendation_fixtures.json; backend/scripts/evaluate_recommendations.py; backend/tests/test_recommendation_evaluation.py.
- **Outcome:** Synthetic fixtures avoid personal data and TMDB calls. CI reported 55 backend tests passing and executed the CLI. The five-profile baseline produced relevance-only macro NDCG@3 1.0000 / Precision@3 1.0000 / Recall@3 0.9000 / diversity 0.8013; greedy MMR produced NDCG@3 0.9966 / Precision@3 0.6667 / Recall@3 1.0000 / diversity 0.9286. These are fixture-alignment diagnostics, not independent relevance labels or real-world quality evidence.
- **Next action:** Keep the synthetic report as a regression baseline. Collect no behavioural events until privacy/data-lifecycle gates are satisfied.

### 2026-11-07 — Media detail page status selection

- **Type:** UX / Frontend change
- **Summary:** Replaced the single Add to list action for unsaved titles with three explicit choices: Watched, Want to watch, and In future. Each action sends the corresponding existing backend status. The selected button displays Saving while the request is pending; after success the UI shows the saved status.
- **Evidence:** [Commit 8731aa2](https://github.com/Shreyas-patil07/Dex/commit/8731aa2d65741c849b4204437c9a1ff45c6398cb); frontend/src/pages/MediaDetailsPage.tsx; backend/app/schemas.py WatchCreate status validation.
- **Outcome:** No backend schema migration was needed. The existing watched create path sets watched_at and attempts taste metadata/contribution creation; want_to_watch and in_future are non-contributing statuses. CI verifies typecheck/build; live click-flow still requires browser confirmation.
- **Next action:** Test all three choices with a dedicated account, including reload, status rendering, taste contribution for Watched and no contribution for the other two.

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


### 2026-11-07 — Added Watching library status

- **Type:** Feature / Watch lifecycle
- **Summary:** Added a fourth watch status, `watching`, to represent titles currently in progress. It is available from media details and the profile library, and can be selected when moving an existing record between lists.
- **Taste behaviour:** A Watching record does not fetch or contribute taste metadata. Moving it to Watched sets the completion timestamp, loads metadata and creates the normal taste contribution transactionally.
- **Validation:** Added an API regression test covering creation as Watching and transition to Watched.
