# Application and Operational Flow

> **Status:** Maintained flow specification — current principal journeys  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-07

## 1. Entry points and actors

| Actor | Entry point | Goal | Prerequisite |
|---|---|---|---|
| Visitor | Home | Browse trending titles | Browser/network |
| Visitor | Search | Find title | Search query |
| Visitor | Media details | Inspect media | Valid media ID |
| User | Sign-in | Establish account | Firebase-supported sign-in |
| User | Profile | Review identity/history | Authenticated session |
| User | Watch management | Record viewing activity and inspect current list state | Authenticated API access |
| User | For You | Refresh Safe/Adjacent/Wildcard suggestions and build taste history | Signed-in home page |

## 2. Primary journeys

### Discovery

```mermaid
flowchart TD
    A[Open Dex] --> B[Load trending titles]
    B --> C{Succeeded?}
    C -- Yes --> D[Render catalogue]
    C -- No --> E[Show recoverable error]
    D --> F[Filter media type/time]
    F --> G[Open title details]
```

### Account and profile

```mermaid
flowchart TD
    A[Open sign-in] --> B[Firebase authentication]
    B --> C{Identity established?}
    C -- No --> D[Show auth error]
    C -- Yes --> E[Obtain ID token]
    E --> F[POST /api/auth/sync]
    F --> G{Dex profile exists?}
    G -- No --> H[Create user document]
    G -- Yes --> I[Return existing profile]
    H --> J[Continue]
    I --> J
```

### Watch detail and status selection flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Detail page
    participant API as Backend
    participant DB as Firestore
    U->>UI: Open movie/series detail
    UI->>API: GET /api/watches/{media_type}_{tmdb_id} + token
    API->>DB: Read only users/{verified_uid}/watches/{id}
    alt Entry exists
      API-->>UI: 200 + saved status
      UI-->>U: Show Already watched / In your watchlist / Planned for later
    else Entry absent
      API-->>UI: 404
      UI-->>U: Show three status choices
      U->>UI: Choose Watched / Want to watch / In future
      UI->>API: POST /api/watches with selected status + token
      API->>DB: Transactionally create watch and taste state
      API-->>UI: 201 created or 409 conflict
    end
```

Status choices map to the existing API values:
- Watched → `watched`; sets watched time and attempts to build a taste contribution.
- Want to watch → `want_to_watch`; saved in the watchlist, no taste contribution.
- In future → `in_future`; saved as a later plan, no taste contribution.

### For You and profile backfill

```mermaid
flowchart TD
    A[Signed-in Home page] --> B[GET /api/recommendations]
    B --> C{Taste metadata pending?}
    C -- Yes --> D[Show profile setup and Build my taste profile]
    D --> E[POST /api/taste/backfill?limit=50]
    E --> F{next_cursor exists?}
    F -- Yes --> G[Continue setup with cursor]
    G --> E
    F -- No --> H[Refresh recommendations]
    C -- No --> I[Render Safe / Adjacent / Wildcard]
    H --> I
    I --> J[Open recommended media detail]
```

The backfill button runs one bounded page per click. It is not a background batch job.

## 3. Watch state model

| Status | Meaning | Taste contribution |
|---|---|---|
| watched | User has watched title | Included |
| want_to_watch | User intends to watch | Excluded |
| in_future | User plans to watch later | Excluded |

A status transition can change whether an item contributes to taste. Reverse an old contribution before applying a new one.

## 4. Alternate and failure flows

| Scenario | Expected behaviour |
|---|---|
| TMDB failure | Recoverable error/retry |
| Invalid media identifier | Validation/not-found state |
| User not signed in | Prompt authentication |
| Invalid ID token | API returns 401 |
| Username taken | API returns 409 |
| Duplicate watch | Conflict/idempotent response as implemented |
| Firestore unavailable | Do not show false success |
| TMDB taste metadata unavailable | Watch may persist with taste update pending |
| Request cancellation/navigation | Avoid stale UI updates where implemented |

## 5. Lifecycle and ownership

Firebase SDK owns client session state. Backend owns authorization and Firestore operations. UID is derived from verified credentials. FastAPI lifespan starts/closes TMDB client. Watch mutations must keep source record and taste contributions consistent.

## 6. Traceability

| Flow | PRD requirements | Verification |
|---|---|---|
| Trending/search | FR-001, FR-002 | API tests |
| Media details | FR-003 | Media tests |
| Sign-in/sync | FR-004, FR-005 | Auth tests |
| Username | FR-006 | Collision tests |
| Watch CRUD | FR-007, FR-008 | API tests |
| Taste mutation | FR-009, FR-010 | Taste regression tests |
| Existing library status | FR-013 | User-scoped GET watch API tests |
| For You | FR-014 | Authenticated recommendation API tests and manual browser checks |
| Historical profile backfill | FR-015 | Pagination/idempotency/vector update tests |
