# Dex

**Your entertainment identity.**

Dex is a movie and series discovery, watch-history, and taste-profiling platform. It brings discovery, viewing records, ratings, and a personal entertainment profile into one place.

> **Documentation status:** Maintained engineering docs — updated 2026-11-07  
> **Backend source version:** 0.5.1  
> **Production API status:** Render deployment still requires live verification  
> **Frontend:** https://dex-list.vercel.app/  
> **Backend API:** https://dex-connect.onrender.com/  
> **API docs:** https://dex-connect.onrender.com/docs

## Product capabilities

- Discover trending movies and television series through TMDB.
- Search titles and filter by media type.
- View media details, credits/videos, and streaming availability in India when returned by TMDB.
- Authenticate with Firebase.
- Create a unique Dex username and profile.
- Track watched, want-to-watch, and in-future titles with optional ratings, dates, and notes.
- Maintain an evolving taste profile derived from watched titles.
- Generate personalized Safe, Adjacent, and Wildcard recommendations for signed-in users.
- Backfill historical watched titles into the taste model with a paginated, idempotent operation.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Client identity | Firebase Web SDK / Authentication |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Persistence | Cloud Firestore via Firebase Admin SDK |
| Media data | TMDB API via HTTPX |
| Rate limiting | SlowAPI |
| Hosting | Vercel (frontend), Render (backend) |

## Repository structure

```text
Dex/
├── .github/                    # CI workflow and PR template
├── ADR/                        # Architecture Decision Records
├── docs/                       # Product, engineering, recommendation and operations docs
│   ├── README.md                 # Documentation index and current status
│   ├── 11_Recommendations_Engine.md
│   └── 12_Deployment_Runbook.md
├── Research documentation/     # Supporting product/design research
├── backend/
│   ├── app/services/             # Firebase auth, TMDB, taste engine
│   ├── app/main.py               # FastAPI routes and application setup
│   ├── app/config.py             # Backend settings
│   ├── app/firestore.py           # Firestore access
│   ├── app/schemas.py             # Request/response models
│   ├── tests/
│   └── README.md
├── frontend/
│   ├── public/
│   ├── src/components/
│   ├── src/lib/                   # Firebase and auth-session helpers
│   ├── src/pages/
│   └── README.md
├── render.yaml
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

## Local development

### Prerequisites

- Node.js 22 and npm
- Python 3.11
- Git
- Firebase project configuration
- TMDB API key

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Start the development server:

```bash
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
```

Activate the environment.

**Windows PowerShell**
```powershell
.venv\\Scripts\\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install and configure:

```bash
pip install -r requirements.txt
```

Create `backend/.env` from `.env.example`. Configure the TMDB API key, Firebase project, Firebase Admin service account, and allowed CORS origins. For local Firebase Admin access, use `backend/service-account.json` or set `FIREBASE_SERVICE_ACCOUNT` to the full JSON contents. The environment variable takes precedence. Never commit credentials.

Start the API:

```bash
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## API overview

| Method | Route | Purpose |
|---|---|---|
| GET/HEAD | `/api/health` | Public health check and source API version |
| GET | `/api/search` | Search movies and TV titles |
| GET | `/api/media/trending` | Trending media |
| GET | `/api/media/{media_type}/{tmdb_id}` | Media details and India provider data |
| POST | `/api/auth/sync` | Synchronize Firebase identity |
| GET | `/api/auth/username/available` | Check username availability |
| POST | `/api/auth/username` | Claim username |
| GET | `/api/me` | Current user profile |
| GET | `/api/watches` | List current user's watch records |
| POST | `/api/watches` | Create a watch record |
| GET | `/api/watches/{watch_id}` | Read one current-user watch record (404 when absent) |
| PATCH/DELETE | `/api/watches/{watch_id}` | Update/delete watch record |
| GET | `/api/recommendations` | Authenticated Safe/Adjacent/Wildcard recommendations |
| POST | `/api/taste/backfill` | Paginated historical watched-title metadata backfill |
| GET | `/api/watch-statuses` | Supported watch statuses |

Protected requests send `Authorization: Bearer <firebase-id-token>`. The live OpenAPI document is the definitive contract.

## Firestore data model

```text
users/{firebase_uid}
  email, username, display_name, tagline, created_at

users/{firebase_uid}/watches/{media_type}_{tmdb_id}
  title, status, rating, watched_at, notes, artwork paths,
  taste contribution snapshot

usernames/{normalized_username}
  firebase_uid, created_at

users/{firebase_uid}/taste/profile
  model/schema versions, profiled watch counters, profile_version

users/{firebase_uid}/recommendations/current
  cached candidate pools and metadata keyed by profile_version

tmdb_catalog/{media_type}_{tmdb_id}
  cached TMDB-derived feature metadata and display labels
```

## Taste engine V1

Only `watched` records contribute; want-to-watch and in-future records are excluded. Current backend design uses genre, keyword, people (movie directors or TV creators), and decade features. Feature groups are independently L2-normalized. Weights are genres 1.0, keywords 1.2, people 1.0, decades 0.35. A rating baseline of 5.5 maps ratings to signed sentiment in [-1, 1]; unrated watched titles contribute +0.15. Exact contributions are persisted so edits and deletes can reverse them in the same Firestore transaction as the watch mutation.

## Personalized recommendations

The authenticated `GET /api/recommendations` endpoint returns three slots: `safe` (highest relevance), `adjacent` (relevance/diversity trade-off), and `wildcard` (separate weekly-trending retrieval with novelty bias). The V2 scorer rebuilds all-time and recent profiles from persisted per-watch contributions (90-day half-life), uses local IDF over the watched set plus candidate pool, and retrieves candidates from TMDB item-to-item recommendations/similar endpoints before popularity-based discover fallback. A versioned six-hour candidate cache serves weighted top-k exploration; watch mutations invalidate and refresh an existing cache in the background. `match_percent` is a percentile within the request's enriched candidate pool, **not** a probability that the user will like a title. See [Recommendation Engine](docs/11_Recommendations_Engine.md).

Existing watched titles may require `POST /api/taste/backfill?limit=50` after deployment. Continue with the returned `next_cursor` until `complete` is true; rerun from the first page later to retry TMDB-pending records. Backfill is authenticated, rate-limited, idempotent, and excludes non-watched titles.

## Quality checks

**Frontend**
```bash
cd frontend
npm ci
npm run typecheck
npm run build
```

**Backend**
```bash
cd backend
pip install -r requirements-dev.txt
python -m compileall app tests
pytest -q
```

CI runs frontend typechecking/build and backend compilation/tests on pushes and pull requests targeting `main`.

## Deployment

- Frontend: Vercel — https://dex-list.vercel.app/
- Backend: Render — https://dex-connect.onrender.com/
- Identity and persistence: Firebase Authentication and Cloud Firestore.
- Render Blueprint: root `render.yaml` specifies `branch: main`, `rootDir: backend`, `autoDeployTrigger: commit`, and `healthCheckPath: /api/health`.
- Backend source version 0.5.1 is committed on `main`. The Render service's active deployment has **not yet been verified** against this source revision; do not treat a successful GitHub/Vercel check as proof of a successful Render deploy.

For deployment verification commands and expected HTTP codes, see the [Deployment Runbook](docs/12_Deployment_Runbook.md).

The backend defaults to `memory://` for rate-limit storage. Use shared storage such as Redis before running multiple backend instances. Never expose Firebase Admin credentials or TMDB secrets through frontend `VITE_*` variables.

## Documentation

| Document | Responsibility |
|---|---|
| [01 — PRD](docs/01_PRD.md) | Product goals, users, scope, requirements |
| [02 — TRD](docs/02_TRD.md) | Runtime, stack, technical constraints |
| [03 — Architecture](docs/03_Architecture.md) | Components, deployment, data flows |
| [04 — App Flow](docs/04_App_Flow.md) | User journeys and state transitions |
| [05 — UI Design](docs/05_UI_Design_Brief.md) | UX and screen inventory |
| [06 — Protocol and Data](docs/06_Protocol_and_Data_Schema.md) | API, Firestore and taste model |
| [07 — Implementation](docs/07_Implementation.md) | Delivery plan and backlog |
| [08 — Security](docs/08_Security.md) | Threats, identity, privacy |
| [09 — Testing](docs/09_Testing.md) | Verification strategy |
| [10 — Development Log](docs/10_Development_Log.md) | Chronological implementation and validation record |
| [11 — Recommendation Engine](docs/11_Recommendations_Engine.md) | Recommendation retrieval, scoring, slots, and semantics |
| [12 — Deployment Runbook](docs/12_Deployment_Runbook.md) | Render/Vercel configuration and production smoke tests |
| [13 — v0.6 Plan](docs/13_v0.6_Reliability_and_Discovery_Intelligence.md) | Approved release scope, decisions, evidence and gates |
| [Documentation index](docs/README.md) | Start here; current implementation and evidence |
| [ADR index](ADR/README.md) | Durable architecture decisions |

Supporting research: [Research documentation](Research%20documentation/).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Do not commit real `.env` files, service-account credentials, API keys, tokens, or user data.

## License

No license has been added to this repository. Unless a license is explicitly added, the project remains **all rights reserved**. The MIT license from the Template repository has not been copied.
