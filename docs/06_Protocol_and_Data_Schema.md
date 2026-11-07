# Protocol and Data Schema

> **Status:** Maintained contract summary — checked against main source  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-07  
> **Backend source version:** 0.5.1

## 1. Scope and authority

This document summarises browser-to-backend HTTP routes, Firebase bearer-token authentication, Firestore paths, taste state, and recommendation response semantics. The code in backend/app/main.py, Pydantic schemas, service modules, and tests is authoritative. The live OpenAPI page is https://dex-connect.onrender.com/docs; it reflects the currently deployed service and may lag behind main while Render is not serving the latest revision.

## 2. Communication topology

| Producer | Consumer | Transport | Direction |
|---|---|---|---|
| Browser | Firebase Authentication | Firebase SDK / HTTPS | Bidirectional |
| Browser | Dex API | HTTPS JSON REST | Bidirectional |
| Dex API | Firebase Admin | Admin SDK | Request/response |
| Dex API | Cloud Firestore | Admin SDK | Read/write/transaction |
| Dex API | TMDB | HTTPS | Request/response |

## 3. API route inventory

All protected routes require a Firebase ID token in the Authorization Bearer header. The UID is derived from the verified token, not from a client-supplied UID.

| Method | Route | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| GET, HEAD | /api/health | Public | None | Liveness and backend source version |
| GET | /api/search | Public | 30/minute | Search movies/series |
| GET | /api/media/trending | Public | 60/minute | Trending catalogue |
| GET | /api/media/{media_type}/{tmdb_id} | Public | 60/minute | Media details and India provider data |
| POST | /api/auth/sync | Firebase bearer | None | Create/read Dex profile for verified Firebase identity |
| GET | /api/auth/username/available | Public | None | Check normalized username availability |
| POST | /api/auth/username | Protected | None | Claim username |
| GET | /api/watch-statuses | Public | None | Supported watch status values |
| GET | /api/me | Protected | None | Current Dex profile |
| GET | /api/watches | Protected | None | List current user's watch records |
| POST | /api/watches | Protected | None | Create watch record |
| GET | /api/watches/{watch_id} | Protected | None | Fetch one current-user watch record |
| PATCH | /api/watches/{watch_id} | Protected | None | Update watch record |
| DELETE | /api/watches/{watch_id} | Protected | None | Delete watch record |
| GET | /api/recommendations | Protected | 10/minute | Return Safe, Adjacent and Wildcard slots |
| POST | /api/taste/backfill | Protected | 5/minute | Enrich legacy watched records page by page |

Rate limits are applied by SlowAPI using the configured storage backend. The default configuration is memory://; this is not a shared counter across multiple API instances.

## 4. Common request conventions

Protected requests use:

~~~http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
~~~

Search parameters:

| Parameter | Constraint | Default |
|---|---|---|
| query | Required, 1–100 characters | — |
| page | 1–500 | 1 |
| media_type | all, movie, tv | all |

Trending parameters:

| Parameter | Constraint | Default |
|---|---|---|
| media_type | all, movie, tv | all |
| time_window | day, week | week |

Media detail media_type must be movie or tv and tmdb_id must be positive.

## 5. Watch record contract

### Identifier

Watch document IDs are deterministic:

- movie_ followed by the TMDB movie ID
- tv_ followed by the TMDB series ID

Example: movie_550.

### Create request

| Field | Type | Required | Constraint |
|---|---|---:|---|
| tmdb_id | integer | Yes | TMDB identifier |
| media_type | string | Yes | movie or tv |
| title | string | Yes | 1–255 characters |
| status | string | No | watched, want_to_watch, in_future; defaults to want_to_watch |
| rating | number/null | No | 0–10 |
| watched_at | datetime/null | No | ISO-compatible datetime |
| notes | string/null | No | Maximum 2,000 characters |
| poster_path | string/null | No | TMDB image path |
| backdrop_path | string/null | No | TMDB image path |

### Update request

PATCH accepts optional status, rating, watched_at, notes, poster_path and backdrop_path. Pydantic distinguishes omitted fields from explicitly supplied fields; nullable values can be used to clear nullable watch attributes. An empty update returns the current record without mutation.

### Status semantics

| Value | Meaning | Taste effect |
|---|---|---|
| watched | User has watched the title | Contributes when metadata is ready and a non-zero contribution can be built |
| want_to_watch | User wants to watch it | No taste contribution |
| in_future | User plans to watch it later | No taste contribution |

### Watch response

Watch responses include id, tmdb_id, media_type, title, status, rating, watched_at, notes, poster_path, backdrop_path and created_at.

### Duplicate handling and lookup

- POST /api/watches creates a record with HTTP 201.
- A record that already exists returns HTTP 409.
- GET /api/watches/{watch_id} returns HTTP 200 for the current user's record.
- The same lookup returns HTTP 404 when the record is absent or belongs to another user.
- The lookup is intentionally user-scoped; it must never reveal whether a different user's record exists.
- The detail page checks the lookup before showing status choices. If absent, it offers Watched, Want to watch and In future, mapping directly to `watched`, `want_to_watch` and `in_future` in the create body.
- Choosing `watched` sets `watched_at` in the backend if omitted and attempts to load taste metadata/build a contribution. The other two statuses do not contribute to taste.
- If a concurrent create wins after the lookup, the frontend handles HTTP 409 by fetching the current user's record again.

## 6. Recommendation API contract

GET /api/recommendations requires authentication and is limited to 10 requests per minute.

Top-level response:

| Field | Type | Meaning |
|---|---|---|
| generated_at | datetime | Generation timestamp |
| algorithm_version | integer | Recommendation algorithm version; currently 1 |
| personalized | boolean | Whether a usable taste signal exists |
| match_score_semantics | string | Explicit interpretation of match values |
| profile_status | object | Counts of watched, metadata-ready and pending titles; backfill state |
| recent_profile | object | Half-life, recently weighted count and all-time/recent blend |
| slots | object | safe, adjacent and wildcard candidates; any slot can be null |

Profile status fields:

- watched_titles — number of watched records.
- metadata_ready_titles — watched records with ready taste metadata and contribution field.
- pending_titles — watched records not yet ready.
- backfill_complete — true when pending_titles is zero.

Recent profile fields:

- half_life_days — currently 90.
- recently_weighted_titles — count of recent-profile records with feature signal.
- all_time_blend — currently 0.75.
- recent_blend — currently 0.25.

Each non-null slot candidate contains:

| Field | Type | Meaning |
|---|---|---|
| id | integer | TMDB ID |
| media_type | string | movie or tv |
| title | string | Display title |
| poster_path, backdrop_path | string/null | TMDB image paths |
| release_date | string/null | Release date or first air date |
| vote_average | number | TMDB vote average |
| vote_count | integer | TMDB vote count |
| overview | string | Synopsis, possibly empty |
| raw_score | number | Internal signed relevance score |
| match_percent | integer/null | Percentile within this request's enriched candidate pool |
| match_semantics | string | Candidate-pool percentile or not personalized |
| reasons | string[] | Human-readable explanation labels |

Important: match_percent is a within-request candidate-pool percentile, **not** a probability of liking the title, calibrated confidence, or promise of user satisfaction. When no complete taste signal is available, the endpoint can return non-personalized quality/popularity-based candidates and match_percent is null.

## 7. Historical taste backfill contract

POST /api/taste/backfill is authenticated and rate-limited to 5 requests per minute.

| Query parameter | Constraint | Default |
|---|---|---|
| limit | 1–50 | 25 |
| cursor | Existing watch document ID, optional | None |

The homepage uses limit=50. The endpoint processes only watched records.

Response:

~~~json
{
  "scanned": 50,
  "enriched": 47,
  "skipped": 2,
  "pending": 1,
  "pending_watch_ids": ["movie_123"],
  "next_cursor": "tv_456",
  "complete": false
}
~~~

The values above illustrate the shape, not a live result. The actual response reports counts for the requested page.

- scanned: number of records in this page.
- enriched: records enriched successfully.
- skipped: records already current for the taste model.
- pending: records that could not be enriched because TMDB failed.
- pending_watch_ids: IDs to retry later.
- next_cursor: last processed ID when another page exists; otherwise null.
- complete: whether another page remains after this page.

Continue with next_cursor until complete is true. If pending_watch_ids is non-empty, rerun later **without a cursor** to retry pending records. Completed records are skipped, so retry passes are idempotent. The operation does not run in the background and one frontend click processes one page.

## 8. Firestore data model

~~~text
users/{firebase_uid}
  email, username, display_name, tagline, created_at

usernames/{normalized_username}
  firebase_uid, created_at

users/{uid}/watches/{media_type}_{tmdb_id}
  media fields, status, rating, watched_at, notes, artwork paths,
  taste_features, taste_contribution, taste_metadata_status

users/{uid}/taste/profile
  schema_version, model_version, profiled_watch_count,
  profiled_rated_count, profile_version, timestamps

users/{uid}/recommendations/current
  profile_version, generated_at, metadata,
  primary_candidates, wildcard_candidates

tmdb_catalog/{media_type}_{tmdb_id}
  TMDB details, extracted feature IDs, display labels, catalog version,
  fetched_at
~~~

The shared catalogue is an application-wide metadata cache; user watch, taste profile, and recommendation cache records remain UID-scoped. Per-feature taste-vector documents and global tmdb_feature_stats counters are no longer written or read. Existing legacy documents may remain in Firestore and are not currently cleaned up. Treat legacy per-user taste documents as part of export/deletion until a verified cleanup migration has run. See [Data Lifecycle and Privacy Readiness](14_Data_Lifecycle_and_Privacy_Readiness.md) for retention, export, deletion and access-control gaps.

## 9. Taste Engine V2 invariants

- Only watched records contribute.
- Rating baseline is 5.5. Ratings below 5.5 map to negative sentiment; ratings above 5.5 map to positive sentiment, bounded to [-1, 1].
- An unrated watched title contributes a weak positive signal of +0.15.
- Feature groups are genres, keywords, people, and decades.
- Movie people features use directors; TV people features use creators.
- Per-group feature contributions are independently L2-normalized.
- Group weights used by the recommender are genres 1.0, keywords 1.2, people 1.0, decades 0.35.
- The exact contribution snapshot is stored on the watch record.
- Add, edit, status transition and delete operations reverse old deltas and apply new deltas inside the same Firestore transaction as the watch update.
- TMDB metadata failure can leave a watched record in pending state without pretending that its taste contribution was applied.
- Model and schema versions are persisted; change scoring/extraction rules only with an explicit migration strategy.

## 10. Shared cache and errors

TMDB feature metadata cache TTL is 180 days. The in-memory TMDB client cache has endpoint-specific short TTLs and is not a durable source of truth.

| Condition | Expected status/behaviour |
|---|---|
| Missing/invalid bearer token | 401 |
| Unsynchronized Dex profile on protected route | 401 |
| Username already claimed | 409 |
| Duplicate watch create | 409 |
| Missing or other-user watch lookup | 404 |
| Invalid request/query | 422 |
| TMDB upstream failure | 502 where explicitly mapped |
| Rate limit exceeded | 429 |
| Unhandled infrastructure failure | 5xx |

Use runtime OpenAPI for exact response schemas. Do not interpret a 404/405 from the live host as proof of the current main-branch route definition; compare the deployed version in /api/health.

## 11. Versioning and related docs

The HTTP API has no /v1 URL prefix. Coordinate breaking changes with the frontend. Taste model and recommendation algorithm versions are separately versioned.

- [Architecture](03_Architecture.md)
- [Recommendation Engine](11_Recommendations_Engine.md)
- [Deployment Runbook](12_Deployment_Runbook.md)
- [Data Lifecycle and Privacy Readiness](14_Data_Lifecycle_and_Privacy_Readiness.md)
