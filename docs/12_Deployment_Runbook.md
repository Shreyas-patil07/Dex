# Deployment and Production Smoke-Test Runbook

> **Status:** Current source configuration and open production verification  
> **Last updated:** 2026-11-07  
> **Backend source version:** 0.5.1

## 1. Services and ownership

| Component | Host | URL | Configuration |
|---|---|---|---|
| Frontend | Vercel | https://dex-list.vercel.app/ | frontend build and Vite environment variables |
| Backend API | Render | https://dex-connect.onrender.com/ | root render.yaml; rootDir backend |
| Authentication | Firebase | Configured Firebase project | Browser Firebase config plus server-side Admin credentials |
| Persistence | Cloud Firestore | Configured Firebase project | Firebase Admin credentials and project IAM |
| Media catalogue | TMDB | https://www.themoviedb.org/ | Server-only TMDB API key |

The frontend and backend deploy independently. A green Vercel check does not prove that the Render API has deployed the backend commit.

## 2. Render Blueprint source

The current root render.yaml defines one Render web service:

| Setting | Current value |
|---|---|
| Service name | dex-api |
| Runtime | python |
| Branch | main |
| Root directory | backend |
| Build command | pip install -r requirements.txt |
| Start command | uvicorn app.main:app --host 0.0.0.0 --port $PORT |
| Auto deploy trigger | commit |
| Health check path | /api/health |
| Python version | 3.11.11 |

The Blueprint declares TMDB_API_KEY and FIREBASE_SERVICE_ACCOUNT as non-synchronised secret values. The configuration also points GOOGLE_APPLICATION_CREDENTIALS at /etc/secrets/service-account.json. Confirm the appropriate secret values/file are configured in the Render service; never place them in Git.

Render documents branch, autoDeployTrigger and healthCheckPath in the [Blueprint YAML reference](https://render.com/docs/blueprint-spec). HTTP health checks must return a 2xx or 3xx response; see [Render health checks](https://render.com/docs/health-checks).

**Important:** Committing the Blueprint file does not prove that an existing Render service has synced the Blueprint changes. Verify the linked repository, selected branch, root directory, and applied settings in the Render Dashboard.

## 3. Source-level health fingerprint

The current source sets FastAPI version 0.5.1. GET /api/health returns:

~~~json
{
  "status": "ok",
  "service": "dex-api",
  "version": "0.5.1",
  "watch_write_endpoint": "POST /api/watches"
}
~~~

HEAD /api/health returns HTTP 200 with an empty body.

The version reports the running app's FastAPI version. If the route is missing or reports an earlier version, the active process is not running the expected backend source/configuration.

## 4. Deployment procedure

1. Confirm main contains the intended backend commit.
2. Open the Render Dashboard and select the dex-api service.
3. Confirm the linked repository is Shreyas-patil07/Dex and branch is main.
4. Confirm root directory is backend.
5. Confirm the build and start commands match the Blueprint.
6. Confirm the Blueprint changes were applied to the existing service.
7. Confirm required Render secret environment variables and service-account file are configured.
8. Trigger a deploy of the latest main commit if auto deployment did not run.
9. Wait for Render to mark the deploy successful; inspect build/runtime logs if it fails.
10. Run the public health probe and authenticated route smoke tests below.
11. Only after backend route checks pass, retest the website flows.

Do not mark deployment complete based only on a GitHub Actions pass or a Vercel status check.

## 5. Public health probe

Use:

~~~bash
curl -i https://dex-connect.onrender.com/api/health
~~~

Expected: HTTP 200 and JSON containing version 0.5.1 or a later version.

On Windows PowerShell:

~~~powershell
Invoke-RestMethod "https://dex-connect.onrender.com/api/health"
~~~

HEAD probe:

~~~bash
curl -I https://dex-connect.onrender.com/api/health
~~~

Expected: HTTP 200.

## 6. Route smoke tests

These probes distinguish a missing route from an authentication failure. Do not disable auth to make them pass.

### Recommendation route

Unauthenticated route-existence probe:

~~~bash
curl -i https://dex-connect.onrender.com/api/recommendations
~~~

Expected from the current source: HTTP 401 because the route exists and requires a Firebase bearer token. A 404 indicates that the active backend does not expose this route. With a valid Firebase ID token from a signed-in test account, the route should return HTTP 200 and a response with slots.safe, slots.adjacent and slots.wildcard (each may be null).

### Single-watch lookup

Unauthenticated route-existence probe:

~~~bash
curl -i https://dex-connect.onrender.com/api/watches/movie_550
~~~

Expected from the current source: HTTP 401. With a valid account token:
- HTTP 200 if the watch belongs to that account.
- HTTP 404 if it is absent for that account.
- It must not reveal another user's records.

A 405 indicates that GET is not registered for the active route on the deployed service, despite its presence in current main source.

### Watch create method probe

Use a valid-looking payload but omit the bearer token. This is a route/method check only; the expected result is an authentication failure, not a write.

~~~bash
curl -i -X POST https://dex-connect.onrender.com/api/watches \
  -H "Content-Type: application/json" \
  -d '{"tmdb_id":550,"media_type":"movie","title":"Probe only","status":"want_to_watch"}'
~~~

Expected from the current source: HTTP 401. Do not use a real token for an unauthenticated probe.

### Authenticated end-to-end watch flow

Use a dedicated test account and a title safe to add/remove:
1. Open the detail page while signed in.
2. Verify the initial GET /api/watches/{watch_id} returns 200 if already saved or 404 if absent.
3. If absent, click Add to list; POST /api/watches should return 201.
4. Reload the detail page; it should show In your watchlist.
5. Change the status from the list/profile if available and verify the detail label follows the stored status.
6. Attempt a duplicate create only in a test environment; the expected response is 409 and the frontend should re-read status.
7. Remove test data when finished.

### Taste backfill

Only run against a user's real history with their consent:
1. Start with POST /api/taste/backfill?limit=50 and a valid bearer token.
2. Follow next_cursor until complete is true.
3. If pending_watch_ids is non-empty, repeat later without a cursor to retry failed TMDB lookups.
4. Record scanned/enriched/skipped/pending counts and verify profile counters.
5. Do not infer completion from the button click alone; inspect the actual endpoint response.

## 7. Vercel change-aware build filtering

Dex has one frontend application in frontend/ and a separate FastAPI backend in backend/. The repository now includes Vercel ignoreCommand configuration in both root vercel.json and frontend/vercel.json to support either common project-root configuration:

- If the Vercel project Root Directory is the repository root, root vercel.json compares only frontend/.
- If the Vercel project Root Directory is frontend/, frontend/vercel.json compares only the project root (the frontend directory).

The command compares the current commit with its parent. Exit code 0 skips the frontend build; exit code 1 continues the build. If the parent commit cannot be resolved or the diff command fails, the command deliberately proceeds with the build rather than risk publishing stale frontend assets.

**Expected behaviour**
- Documentation-only changes: skip frontend build.
- Backend-only changes (backend/, Render config): skip frontend build.
- Frontend source, public assets, package files or frontend Vercel config changes: run the frontend build.
- Mixed frontend and backend changes: run the frontend build.

**Verify the project root before relying on this.** In Vercel Dashboard open the Dex project → Settings → Build and Deployment → Root Directory. It should be either the repository root or frontend; the corresponding vercel.json above handles both. Confirm the project's ignored build step is not overridden by a conflicting dashboard setting. The vercel.json ignoreCommand overrides the dashboard Ignored Build Step command.

**Quota caveat:** Vercel documents that an ignored build is marked CANCELED and can still count against deployment quotas/concurrent deployment limits. The command prevents the actual build from running, avoiding repeated install/build work and build-minute usage; it is not a guarantee that every canceled deployment event is free of all quota impact. For a strict zero-deployment-event policy, the Vercel Git integration or project deployment settings must be changed in the Vercel Dashboard, or deployment must be triggered selectively through an authenticated CI workflow.

**Validation checklist**
1. Make a docs-only commit and confirm Vercel reports the build as skipped/canceled before install/build starts.
2. Make a backend-only commit and confirm the same.
3. Make a harmless frontend-only change and confirm a normal deployment builds successfully.
4. Confirm the existing production URL remains dex-list.vercel.app.
5. If the root directory differs from the two supported configurations, correct the config before relying on the filter.

## 8. Frontend verification

Confirm the Vercel project has VITE_API_URL set to the intended production API origin and Firebase browser configuration populated. VITE_* variables are public browser configuration; never set Firebase Admin credentials or TMDB secret there.

After the backend checks pass:
- Sign in and load Home.
- Confirm For You loads without a 404 and shows slots or a valid empty/cold-start state.
- Refresh recommendations.
- Run profile backfill if the profile reports pending watched titles.
- Open a recommendation and confirm navigation to the movie/TV detail route.
- Open an already-saved title and check its existing-state label.
- Test a new title and confirm Add to list once, then reload to confirm the duplicate is not offered.
- Check desktop and mobile widths, navigation and provider cards.

## 9. Diagnosis guide

| Observed result | Likely meaning | Action |
|---|---|---|
| /api/health 404 | Wrong service/base URL or stale/different app | Confirm VITE_API_URL and Render service URL |
| Health version older than 0.5.1 | Old backend process/deployment | Inspect Render deploy history and branch |
| GET /api/recommendations returns 404 | Active API revision does not expose current route, or request targets wrong service | Check health version, linked repo/branch/root, deploy commit |
| GET /api/watches/{id} returns 405 | Active API revision does not support the GET method | Deploy matching backend source; do not rewrite frontend method to POST |
| Protected route returns 401 | Route exists but token absent/invalid or Dex profile unsynchronized | Re-authenticate, inspect token flow and POST /api/auth/sync |
| Watch create returns 409 | Record already exists | Fetch current status; do not force duplicate |
| API returns 502 | TMDB or mapped upstream failure | Inspect redacted Render logs and TMDB availability |
| Browser reports CORS/OPTIONS failure | Origin/preflight configuration problem | Check CORS_ORIGINS and actual request headers |
| Vercel green but API routes fail | Frontend deployed; backend may be stale/unhealthy | Verify Render separately |

HTTP 404/405 from the API is not a CORS error. Browser extension console errors (chrome-extension:// URLs, injected content scripts, extension listener warnings) are separate from Dex unless a reproduction occurs with extensions disabled and points to Dex-owned code.

## 10. Known status at the time of this document

### Earlier failure evidence

On 2026-11-07, earlier browser diagnostics showed GET /api/recommendations returning 404 and GET /api/watches/{watch_id} returning 405. The detail page displayed Method Not Allowed. Extension-origin console errors were also present and were not evidence of a Dex backend defect.

### Latest user-provided smoke-test evidence

Subsequent screenshots show:
- The signed-in Home page populated with Safe, Adjacent and Wildcard recommendation cards.
- The media detail page displaying Already watched for an existing title.

This is a successful visual smoke test for those two user-facing paths and supersedes the earlier visible failure state for them. The screenshots do not show the /api/health payload, API version, exact HTTP status codes, a create request for a previously unsaved title, or duplicate-conflict handling. Therefore mark the recommendation display and existing-title lookup as visually verified, but keep full Render/API verification open until those remaining probes pass.

### Remaining verification

1. GET /api/health reports version 0.5.1 or later.
2. Authenticated GET /api/recommendations returns 200.
3. Authenticated GET /api/watches/{watch_id} returns 200 for the saved test title and 404 for a title not in the user's library.
4. POST /api/watches creates a new test title with 201; reload shows its saved state; duplicate create returns 409 and frontend recovers correctly.
5. Taste backfill runs to complete for the test account and pending titles can be retried.
6. Vercel ignoreCommand is verified with docs-only, backend-only and frontend changes; verify the existing project root in Vercel Dashboard.

The root render.yaml points to main and uses /api/health. GitHub Actions and Vercel source status have passed, but neither proves every Render runtime/configuration detail. Keep the production gate open until the remaining checks are captured.

## 11. Incident notes and security

- Never paste Firebase ID tokens, service-account JSON, API keys, or private user notes into issue trackers or logs.
- Use a dedicated test account for destructive watch create/delete checks.
- Redact authorization headers and user identifiers from shared diagnostics.
- Do not make recommendation or watch routes public as a workaround.
- If a deploy fails, preserve relevant redacted build/runtime evidence, correct the service configuration, redeploy and repeat smoke tests.

## 12. Related references

- [Render Blueprint YAML](https://render.com/docs/blueprint-spec)
- [Render Deploys](https://render.com/docs/deploys)
- [Render Health Checks](https://render.com/docs/health-checks)
- [Vercel vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Vercel Ignored Build Step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)
- [GitHub Actions CI](https://github.com/Shreyas-patil07/Dex/actions)
- [Main branch](https://github.com/Shreyas-patil07/Dex/tree/main)
- [Deployment ADR](../ADR/0005-vercel-render-deployment.md)
