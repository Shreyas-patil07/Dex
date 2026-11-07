# Dex API

FastAPI backend for Dex, the entertainment discovery, watch-history, and taste-profile platform.

## Stack

Python 3.11, FastAPI, Uvicorn, Firebase Authentication token verification, Firebase Admin SDK, Cloud Firestore, TMDB via HTTPX, SlowAPI.

## Local development

```bash
cd backend
python -m venv .venv
```

Activate the environment: `.venv\\Scripts\\Activate.ps1` (Windows PowerShell) or `source .venv/bin/activate` (macOS/Linux).

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create `.env` from `.env.example` and configure TMDB_API_KEY, FIREBASE_PROJECT_ID, Firebase Admin credentials, CORS_ORIGINS/FRONTEND_URL, and RATE_LIMIT_STORAGE_URI.

For local Firebase Admin access, use `backend/service-account.json` or set `FIREBASE_SERVICE_ACCOUNT` to the full JSON content. The environment variable takes precedence. Never commit credentials.

Run the API:

```bash
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Authentication

Firebase Authentication is the identity source. Protected requests send `Authorization: Bearer <firebase-id-token>`. Backend verifies token, extracts UID, and scopes profile/watch data to that UID. A Dex profile must be synchronized through `POST /api/auth/sync`.

## Main endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | /api/search | Search TMDB |
| GET | /api/media/trending | Trending |
| GET | /api/media/{media_type}/{tmdb_id} | Details and providers |
| POST | /api/auth/sync | Sync profile |
| GET | /api/auth/username/available | Check username |
| POST | /api/auth/username | Claim username |
| GET | /api/me | Current user |
| GET | /api/watches | List current user's watches |
| POST | /api/watches | Create watch |
| GET | /api/watches/{watch_id} | Read one current-user watch (404 if absent) |
| PATCH | /api/watches/{watch_id} | Update watch |
| DELETE | /api/watches/{watch_id} | Delete watch |
| GET | /api/recommendations | Personalized Safe/Adjacent/Wildcard suggestions |
| POST | /api/taste/backfill | Paginated historical taste metadata backfill |
| GET | /api/watch-statuses | Status options |
| GET, HEAD | /api/health | Health and backend source version |

Live OpenAPI: https://dex-connect.onrender.com/docs

## Taste engine V1

Only watched titles contribute. Current feature groups: genres, keywords, people (movie directors or TV creators), decades. Group weights: 1.0, 1.2, 1.0, 0.35. Rating baseline: 5.5 mapped into signed sentiment [-1, 1]; unrated watched title: +0.15. Each feature group is L2-normalized independently. Exact contributions are stored on watch records and are the source of truth for all-time and recent profile reconstruction. The compact taste/profile document stores counters and profile_version only; no per-feature taste_vectors are written. Local IDF is calculated from the user's watched set plus the current candidate pool; global feature-stat counters are not used. TMDB metadata failure may leave taste metadata pending while watch write succeeds.

Firestore paths:

```text
users/{uid}/taste/profile
users/{uid}/recommendations/current
users/{uid}/watches/{media_type}_{tmdb_id}
tmdb_catalog/{media_type}_{tmdb_id}
```

See [data schema](../docs/06_Protocol_and_Data_Schema.md) and [test strategy](../docs/09_Testing.md).

## Tests

```bash
pip install -r requirements-dev.txt
python -m compileall app tests
pytest -q
```

## Production

Render API: https://dex-connect.onrender.com/  
Deployment configuration: root `render.yaml`. Production secrets must be configured in Render, never committed.


### Historical taste backfill

Call the authenticated `POST /api/taste/backfill?limit=25` endpoint until it returns `complete: true`. Pass the returned `next_cursor` as the `cursor` query parameter to continue. The operation is idempotent and only enriches watched titles that do not already have a current taste contribution. If any titles are returned in `pending_watch_ids`, rerun a pass without a cursor later to retry TMDB failures. Watchlist titles are deliberately excluded.


### Historical profile and recommendations

- `POST /api/taste/backfill?limit=25` incrementally enriches existing watched records. Page size is 1–50 (default 25); the homepage uses 50. Continue with the returned `next_cursor` until `complete` is true. If `pending_watch_ids` is non-empty, rerun from the first page later to retry upstream TMDB failures. Completed records are skipped, making repeat passes idempotent.
- `GET /api/recommendations` is authenticated and rate-limited to 10/minute. It returns Safe, Adjacent, and Wildcard slots. The retriever seeds TMDB item-to-item recommendations/similar from positively rated watched titles, then supplements with multi-page discover and weekly trending. Safe and Adjacent are sampled from weighted top-k primary candidates with MMR diversification; Wildcard is sampled from a novelty-ranked trending pool. Candidate pools are cached for six hours and keyed by the user's profile_version; watch mutations refresh an existing cache in a background task.
- Recommendations combine the all-time signed vector with a 90-day exponential-decay profile (25% recent blend, 75% all-time). Feature IDF is `ln((N+1)/(DF+1)) + 1` and is indexed from the shared TMDB catalogue. Candidate match percentages are percentile ranks within the request's enriched candidate pool, not probabilities of liking a title.
- The recommendation endpoint reports `profile_status.backfill_complete` and the pending/ready counts. A partial profile can produce partial recommendations; finish backfill for full historical coverage.

## Deployment diagnostics

The source API version is currently `0.5.1`. `GET /api/health` returns the version and expected watch write route; `HEAD /api/health` returns 200 without a body. The Render Blueprint sets branch `main`, root directory `backend`, auto-deploy on commit and the health-check path. Repository configuration is not proof that an existing Render service has synced or deployed it.

On 2026-11-07, browser evidence showed the live API returning 404 for `/api/recommendations` and 405 for `GET /api/watches/{watch_id}`. The latest main CI run passed, but the active Render deployment remained unverified. Use [the deployment runbook](../docs/12_Deployment_Runbook.md) before treating production as healthy.
