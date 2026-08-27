# Dex

**Your entertainment identity.**

Dex is a movie and series discovery and watch-history platform. Discover what is trending, build your profile, and keep your entertainment history in one place.

## Live

- Frontend: https://dex-list.vercel.app/
- Backend API: https://dex-connect.onrender.com/
- API docs: https://dex-connect.onrender.com/docs
- Health: https://dex-connect.onrender.com/api/health

## Features

- Browse 24 trending movies and series powered by TMDB
- Filter trending titles by today/week and movie/series
- Firebase Google and email/password authentication
- Link multiple Firebase sign-in methods to one Dex account
- Unique Dex usernames
- Profile and watch-history views
- Cloud Firestore persistence
- Shared client-side navigation with consistent transitions
- Responsive UI with a persistent animated background

## Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Firebase Authentication

### Backend

- FastAPI
- Python 3.11
- Firebase Admin SDK
- Cloud Firestore
- TMDB API

### Hosting

- Vercel — frontend
- Render — backend
- Firebase — authentication and Firestore

## Project structure

```text
Dex/
├── frontend/                 # React + Vite application
├── backend/                  # FastAPI API
├── favicon/                  # Repository favicon/PWA assets
├── Research documentation/   # Product/design research
├── .github/workflows/        # CI
├── render.yaml               # Render backend deployment
├── CONTRIBUTING.md
├── SECURITY.md
├── .editorconfig
└── README.md
```

## Run locally

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` from `.env.example` and set:

```env
VITE_API_URL=http://localhost:8000
```

Also provide the Firebase web configuration values listed in `frontend/.env.example`.

Start:

```bash
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` from `.env.example`.

For local Firebase Admin access, place the service-account JSON at:

```text
backend/service-account.json
```

Start:

```bash
uvicorn app.main:app --reload
```

API docs:

```text
http://localhost:8000/docs
```

## Authentication flow

Firebase Authentication is the source of truth for sessions.

```text
Firebase sign-in
      ↓
Firebase ID token
      ↓
FastAPI verification
      ↓
/api/auth/sync
      ↓
Firestore user document
      ↓
Protected Dex endpoints
```

Protected requests send:

```http
Authorization: Bearer <firebase-id-token>
```

## Firestore data model

```text
users/{firebase_uid}
  email
  username
  display_name
  tagline
  created_at

users/{firebase_uid}/watches/{media_type}_{tmdb_id}
  tmdb_id
  media_type
  title
  status
  rating
  watched_at
  notes
  created_at

usernames/{username}
  firebase_uid
  created_at
```

## API

```text
GET  /api/health
GET  /api/media/trending
POST /api/auth/sync
GET  /api/auth/username/available
POST /api/auth/username
GET  /api/me
POST /api/watches
GET  /api/watches
```

## Environment and secrets

Never commit real environment files or Firebase Admin credentials.

Frontend:

```text
frontend/.env.example
```

Backend:

```text
backend/.env.example
```

Firebase web API keys are client-side configuration. Firebase Admin service-account credentials are private and must remain server-side.

Local databases, credentials, private keys, and environment files are ignored by Git.

## Deployment

Frontend is deployed on Vercel. Backend is deployed on Render. Persistent application data is stored in Cloud Firestore.

`frontend/vercel.json` provides SPA rewrites so direct visits to client-side routes resolve to the Vite entry point.

`render.yaml` defines the production FastAPI service configuration.

## Quality checks

GitHub Actions runs on pushes and pull requests targeting `main`:

- frontend dependency install and production build
- backend dependency install and Python compilation check

Run the frontend build locally with:

```bash
cd frontend
npm ci
npm run build
```

Run the backend syntax check locally with:

```bash
cd backend
python -m compileall app
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

No license has been added. Unless a license is added, all rights are reserved.
