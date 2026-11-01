# Application and Operational Flow

> **Status:** Baseline — current principal journeys  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Entry points and actors

| Actor | Entry point | Goal | Prerequisite |
|---|---|---|---|
| Visitor | Home | Browse trending titles | Browser/network |
| Visitor | Search | Find title | Search query |
| Visitor | Media details | Inspect media | Valid media ID |
| User | Sign-in | Establish account | Firebase-supported sign-in |
| User | Profile | Review identity/history | Authenticated session |
| User | Watch management | Record viewing activity | Authenticated API access |

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

### Watch mutation

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as Backend
    participant DB as Firestore
    U->>UI: Add to list
    UI->>UI: Obtain Firebase ID token
    UI->>API: POST /api/watches
    API->>API: Verify token and validate payload
    API->>DB: Persist watch and taste state
    DB-->>API: Commit
    API-->>UI: Result
    UI-->>U: Show success/error
```

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
