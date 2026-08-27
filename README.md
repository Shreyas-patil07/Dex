# Dex

**Your entertainment identity.**

Dex is a movie and series discovery and watch-history platform. Discover what is trending, build your profile, and keep your entertainment history in one place.

## Live

- Frontend: https://dex-list.vercel.app/
- Backend API: https://dex-connect.onrender.com/
- API docs: https://dex-connect.onrender.com/docs

## What Dex does

- Browse trending movies and series powered by TMDB
- Filter trending titles by day/week and movie/series
- Create an account with Firebase Authentication
- Sign in with Google or email/password
- Link Google and email/password authentication to the same account
- Choose a unique Dex username
- View your profile and watch history
- Store user and watch data in Cloud Firestore

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

## Project structure

```text
Dex/
├── frontend/          # React + Vite application
├── backend/           # FastAPI API
├── favicon/           # Favicon and PWA assets
├── Research documentation/
├── render.yaml        # Render backend deployment
└── README.md
```

## Run locally

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` from `.env.example` and add your Firebase web configuration plus:

```env
VITE_API_URL=http://localhost:8000
```

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

Create `backend/.env` from `.env.example` and configure your TMDB key and Firebase project settings.

For local Firebase Admin access, keep the service-account file at:

```text
backend/service-account.json
```

Start the API:

```bash
uvicorn app.main:app --reload
```

## Authentication

Firebase Authentication is the source of truth for sign-in sessions. The frontend sends a Firebase ID token to FastAPI, and FastAPI verifies it with the Firebase Admin SDK.

After authentication, `/api/auth/sync` creates or updates the corresponding Firestore user document. Protected endpoints then use the Firebase UID to access the user's data.

## Data model

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

## Environment variables

Never commit real `.env` files or Firebase service-account credentials.

Frontend variables are defined in `frontend/.env.example`.
Backend variables are defined in `backend/.env.example`.

## Deployment

The frontend is deployed on Vercel and the API is deployed on Render. The backend does not use SQLite; persistent application data is stored in Cloud Firestore.

Render uses `render.yaml` for the production service configuration.

## Security notes

- Firebase web API keys are public configuration values and are injected through Vite environment variables.
- Firebase Admin service-account credentials are private and must never be committed to Git.
- Local databases, environment files, and service-account files are ignored by Git.
- Treat previously exposed credentials or data as compromised and rotate them when necessary.

## License

No license has been added yet. All rights reserved unless a license is added to this repository.
