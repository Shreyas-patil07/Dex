# Dex

**Your entertainment identity.**

Dex is a movie and series discovery, watch-history, and taste-profiling platform. It brings discovery, viewing records, ratings, and a personal entertainment profile into one place.

> **Documentation status:** Project documentation baseline  
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
├── docs/                       # Product and engineering documents
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
| GET | `/api/health` | Health check |
| GET | `/api/search` | Search movies and TV titles |
| GET | `/api/media/trending` | Trending media |
| GET | `/api/media/{media_type}/{tmdb_id}` | Media details and India provider data |
| POST | `/api/auth/sync` | Synchronize Firebase identity |
| GET | `/api/auth/username/available` | Check username availability |
| POST | `/api/auth/username` | Claim username |
| GET | `/api/me` | Current user profile |
| GET/POST | `/api/watches` | List/create watch records |
| PATCH/DELETE | `/api/watches/{watch_id}` | Update/delete watch record |
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
  model/schema versions and profiled watch counters

users/{firebase_uid}/taste_vectors/{group}/features/{feature_id}
  positive and negative feature sums

tmdb_catalog/{media_type}_{tmdb_id}
  cached TMDB-derived feature metadata
```

## Taste engine V1

Only `watched` records contribute; want-to-watch and in-future records are excluded. Current backend design uses genre, keyword, people (movie directors or TV creators), and decade features. Feature groups are independently L2-normalized. Weights are genres 1.0, keywords 1.2, people 1.0, decades 0.35. A rating baseline of 5.5 maps ratings to signed sentiment in [-1, 1]; unrated watched titles contribute +0.15. Exact contributions are persisted so edits and deletes can reverse them in the same Firestore transaction as the watch mutation.

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
| [10 — Development Log](docs/10_Development_Log.md) | Milestones and changes |
| [ADR index](ADR/README.md) | Durable architecture decisions |

Supporting research: [Research documentation](Research%20documentation/).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Do not commit real `.env` files, service-account credentials, API keys, tokens, or user data.

## License

No license has been added to this repository. Unless a license is explicitly added, the project remains **all rights reserved**. The MIT license from the Template repository has not been copied.
