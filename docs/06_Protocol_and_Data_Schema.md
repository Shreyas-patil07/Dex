# Protocol and Data Schema

> **Status:** Baseline — current API and Firestore structures  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02  
> **API version:** No explicit URL version prefix currently documented

## 1. Scope and applicability

This document covers browser-to-backend HTTP requests, Firebase bearer-token authentication, Firestore application documents, and the taste-engine feature model. TMDB is an external upstream service.

## 2. Communication topology

| Producer | Consumer | Channel / transport | Direction | Expectations |
|---|---|---|---|---|
| Browser frontend | Firebase Auth | Firebase SDK / HTTPS | Bidirectional | Firebase SDK session semantics |
| Browser frontend | Dex API | HTTPS JSON REST | Bidirectional | HTTP status and JSON contracts |
| Dex API | Firebase Auth/Admin | Admin SDK | Request/response | Verify ID token |
| Dex API | Firestore | Firebase Admin SDK | Request/response/transaction | Document consistency |
| Dex API | TMDB | HTTPS | Request/response | Upstream availability and quota |

## 3. API contracts

The API documentation at https://dex-connect.onrender.com/docs is the runtime contract reference. The routes below are an at-a-glance summary, not a substitute for OpenAPI.

| Method | Route | Authentication | Purpose |
|---|---|---|---|
| HEAD | `/api/health` | Public | Health response |
| GET | `/api/search` | Public | Search TMDB titles |
| GET | `/api/media/trending` | Public | Trending titles |
| GET | `/api/media/{media_type}/{tmdb_id}` | Public | Media details and watch providers |
| POST | `/api/auth/sync` | Firebase bearer token | Sync user profile |
| GET | `/api/auth/username/available` | Public | Username availability |
| POST | `/api/auth/username` | Protected | Claim/update username |
| GET | `/api/watch-statuses` | Public | Enumerate watch states |
| GET | `/api/me` | Protected | Current user |
| GET | `/api/watches` | Protected | Current user's watch records |
| POST | `/api/watches` | Protected | Create watch |
| PATCH | `/api/watches/{watch_id}` | Protected | Update watch |
| DELETE | `/api/watches/{watch_id}` | Protected | Delete watch |

Protected requests include:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### Search parameters

- `query`: required, 1–100 characters.
- `page`: integer 1–500; defaults to 1.
- `media_type`: `all`, `movie`, or `tv`; defaults to `all`.

### Trending parameters

- `media_type`: `all`, `movie`, or `tv`.
- `time_window`: `day` or `week`.

### Watch create schema

| Field | Type | Required | Constraints |
|---|---|---:|---|
| `tmdb_id` | integer | Yes | Positive upstream media ID |
| `media_type` | string | Yes | `movie` or `tv` |
| `title` | string | Yes | 1–255 characters |
| `status` | string | No | `watched`, `want_to_watch`, `in_future`; default `want_to_watch` |
| `rating` | number/null | No | 0–10 |
| `watched_at` | datetime/null | No | Timestamp |
| `notes` | string/null | No | Maximum 2,000 characters |
| `poster_path` | string/null | No | TMDB image path |
| `backdrop_path` | string/null | No | TMDB image path |

Watch update accepts optional status, rating, watched date, notes, poster path, and backdrop path. The precise patch semantics must be checked in the current route/schema and tests.

## 4. Domain and Firestore models

### User

`users/{firebase_uid}`

| Field | Meaning |
|---|---|
| `email` | Firebase-verified account email |
| `username` | Dex username |
| `display_name` | Profile display name |
| `tagline` | Optional profile tagline |
| `created_at` | User creation timestamp |

### Username registry

`usernames/{normalized_username}`

- `firebase_uid`: owner UID.
- `created_at`: registry creation timestamp.

Username input is 3–20 characters and constrained to letters, digits, and underscore; the backend normalizes to lowercase.

### Watch record

`users/{uid}/watches/{media_type}_{tmdb_id}`

Fields include TMDB ID, media type, title, status, optional rating/date/notes, artwork paths, created timestamp, and taste metadata/contribution snapshot used to reverse scoring changes.

### Taste profile

`users/{uid}/taste/profile`

Stores profile/model schema information and counters used to track which watch records have been profiled.

### Taste feature vectors

`users/{uid}/taste_vectors/{group}/features/{feature_id}`

Stores positive and negative all-time feature sums. Feature groups currently include genres, keywords, people (movie directors or TV creators), and decades.

### Shared TMDB catalogue cache

`tmdb_catalog/{media_type}_{tmdb_id}`

Stores shared TMDB-derived feature metadata. Current backend documentation describes a 180-day cache lifetime; verify the implementation when changing cache policy.

## 5. Taste model and consistency

- Only `watched` records contribute; watchlist/future statuses are excluded.
- A fixed rating baseline of 5.5 maps ratings to signed sentiment in `[-1, 1]`.
- An unrated watched title contributes +0.15.
- Feature groups are L2-normalized independently before storing the exact contribution on the watch record.
- Feature-group weights: genres 1.0, keywords 1.2, people 1.0, decades 0.35.
- Edits/deletes reverse the exact stored contribution in the same Firestore transaction as the watch mutation.
- If TMDB metadata is unavailable during a watch write, the watch can persist with taste metadata pending; a later metadata-dependent mutation can retry lookup.

These are current backend design details. Treat scoring constants as model-versioned configuration, not universal truths about user preference.

## 6. Error model

| Condition | Expected HTTP class |
|---|---|
| Missing/invalid bearer token | 401 |
| Username conflict | 409 |
| Invalid request/query | 422 |
| TMDB upstream failure | 502 where mapped by route |
| Rate limit exceeded | SlowAPI rate-limit response |
| Unexpected infrastructure failure | 5xx |

Use the response body from the current endpoint/OpenAPI definition as the precise machine-readable contract.

## 7. Persistence, retention, and operations

Firestore is the primary application store. Data is partitioned by Firebase UID for user-owned records; shared TMDB catalogue metadata is stored separately. The repository does not define a formal backup schedule, retention schedule, data export specification, or migration runbook. These are operational gaps to resolve before making stronger data-retention promises.

## 8. Versioning

The URL currently does not use an explicit `/v1` namespace. Coordinate contract changes with frontend releases. For future breaking changes, consider an explicit API versioning strategy and version the taste-model schema independently.
