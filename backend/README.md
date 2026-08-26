# Dex Backend

FastAPI backend for Dex — the entertainment identity platform.

## Run locally

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

## Current API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/watches`
- `GET /api/watches`

The initial implementation uses SQLite locally and is ready to switch to PostgreSQL through `DATABASE_URL`.

## Next backend layers

1. TMDB catalog integration
2. Taste-vector computation
3. Recommendation service
4. Profile/statistics aggregation
5. Achievements and progress
6. Social graph and taste matching
7. Redis caching/background jobs
8. Alembic migrations
9. Rate limiting and production observability
