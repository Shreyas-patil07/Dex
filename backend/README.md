# Dex API

The backend for Dex, an entertainment identity platform.

## Stack

- FastAPI
- Firebase Authentication
- Firebase Admin SDK
- Cloud Firestore
- TMDB API

## Local development

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` from `.env.example` and provide your TMDB key and Firebase configuration.

For local Firebase Admin access, place the Firebase service-account file at:

```text
backend/service-account.json
```

Start the API:

```bash
uvicorn app.main:app --reload
```

API docs:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/api/health
```

## Production

The API is deployed on Render:

```text
https://dex-connect.onrender.com
```

Production uses Cloud Firestore for user and watch data. No SQLite database file is required.

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

Authentication is handled by Firebase. Protected endpoints expect a Firebase ID token in the `Authorization: Bearer <token>` header.
