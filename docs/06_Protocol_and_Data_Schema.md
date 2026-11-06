# Protocol and Data Schema

> **Status:** Baseline — current API and Firestore structures  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Scope

Covers browser-to-backend HTTP, Firebase bearer-token authentication, Firestore models, and taste features. TMDB is an external upstream dependency.

## 2. Communication topology

| Producer | Consumer | Transport | Direction |
|---|---|---|---|
| Browser | Firebase Auth | SDK/HTTPS | Bidirectional |
| Browser | Dex API | HTTPS JSON REST | Bidirectional |
| Dex API | Firebase Auth/Admin | Admin SDK | Request/response |
| Dex API | Firestore | Admin SDK | Request/response/transaction |
| Dex API | TMDB | HTTPS | Request/response |

## 3. API contracts

Live OpenAPI: https://dex-connect.onrender.com/docs. This route inventory is a summary, not a replacement for runtime schema.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| HEAD | /api/health | Public | Health |
| GET | /api/search | Public | Search TMDB |
| GET | /api/media/trending | Public | Trending |
| GET | /api/media/{media_type}/{tmdb_id} | Public | Media details/providers |
| POST | /api/auth/sync | Firebase bearer | Sync profile |
| GET | /api/auth/username/available | Public | Username availability |
| POST | /api/auth/username | Protected | Claim username |
| GET | /api/watch-statuses | Public | Status options |
| GET | /api/me | Protected | Current profile |
| GET/POST | /api/watches | Protected | Read/create watches |
| PATCH/DELETE | /api/watches/{watch_id} | Protected | Update/delete watch |

Protected request header:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Search parameters: query required (1–100 chars), page 1–500 (default 1), media_type all/movie/tv (default all). Trending parameters: media_type all/movie/tv and time_window day/week.

### Watch create schema

| Field | Type | Required | Constraint |
|---|---|---:|---|
| tmdb_id | integer | Yes | Positive upstream media ID |
| media_type | string | Yes | movie or tv |
| title | string | Yes | 1–255 chars |
| status | string | No | watched, want_to_watch, in_future |
| rating | number/null | No | 0–10 |
| watched_at | datetime/null | No | Timestamp |
| notes | string/null | No | Max 2,000 chars |
| poster_path | string/null | No | TMDB image path |
| backdrop_path | string/null | No | TMDB image path |

Update schema accepts optional status, rating, watched date, notes, poster path, backdrop path. Confirm null/omission semantics from runtime contract and tests.

## 4. Firestore models

### User: users/{firebase_uid}
email, username, display_name, tagline, created_at.

### Username registry: usernames/{normalized_username}
firebase_uid, created_at. Backend normalizes username to lowercase; validation is 3–20 characters, letters/digits/underscore.

### Watch: users/{uid}/watches/{media_type}_{tmdb_id}
TMDB ID, media type, title, status, optional rating/date/notes, artwork paths, creation timestamp, and taste contribution snapshot needed for reversal.

### Taste profile: users/{uid}/taste/profile
Profile/model schema versions and counters tracking profiled watch records.

### Taste vectors: users/{uid}/taste_vectors/{group}/features/{feature_id}
Positive and negative all-time feature sums. Groups: genres, keywords, people (movie directors or TV creators), decades.

### Shared cache: tmdb_catalog/{media_type}_{tmdb_id}
TMDB-derived feature metadata. Backend documentation describes a 180-day cache; verify code when changing cache policy.

## 5. Taste model and consistency

- Only watched records contribute.
- Rating baseline is 5.5; rating sentiment maps to [-1, 1].
- Unrated watched title contribution is +0.15.
- Feature groups are L2-normalized independently.
- Current group weights: genres 1.0, keywords 1.2, people 1.0, decades 0.35.
- Exact contribution is stored on each watch so edits/deletes can reverse it.
- Watch mutation and vector change occur in the same Firestore transaction.
- TMDB metadata failure may leave contribution pending while the watch write succeeds; later metadata-dependent operations can retry.

These scoring values are V1 implementation details and should be model-versioned. Taste is an inferred preference summary, not an objective psychological profile.

## 6. Errors

| Condition | Expected class |
|---|---|
| Missing/invalid bearer token | 401 |
| Username conflict | 409 |
| Invalid request/query | 422 |
| TMDB upstream failure | 502 where mapped |
| Rate limit exceeded | SlowAPI response |
| Infrastructure failure | 5xx |

Use current OpenAPI for exact response bodies.

## 7. Persistence and lifecycle

Firestore is the application store. User data is nested under UID-scoped paths; shared TMDB feature metadata has a separate cache path. A formal backup, restore, retention, export, and deletion runbook is not established in this documentation.

## 8. Versioning

The API currently has no explicit /v1 URL prefix. Coordinate breaking changes with frontend deployment. Version the taste model independently from the HTTP API.
