# Technical Requirements Document (TRD)

> **Status:** Baseline — reflects repository configuration  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02  
> **Version:** 1.0

## 1. Technical overview

Dex uses a browser-based React application backed by a Python FastAPI service. Firebase Authentication establishes user identity; the backend verifies Firebase ID tokens and accesses Cloud Firestore using the Firebase Admin SDK. TMDB supplies catalogue metadata. The frontend is hosted on Vercel and the API on Render.

## 2. Platform and runtime constraints

| Area | Requirement / constraint | Rationale | Verification |
|---|---|---|---|
| Client platform | Modern evergreen browser | React/Vite application | Browser testing |
| Frontend runtime | Node.js 22 for CI; Vite dev/build | Matches workflow setup | CI |
| Backend runtime | Python 3.11 | Render and CI configuration | CI/runtime |
| API framework | FastAPI | Async HTTP service and OpenAPI | API tests |
| Identity | Firebase Authentication | User sign-in and ID tokens | Auth tests |
| Persistence | Cloud Firestore | User, watch, username, taste data | Integration tests |
| External metadata | TMDB API v3 | Search, trending, media detail | Service tests |
| Hosting | Vercel and Render | Current production deployment | Deployment checks |
| Network | HTTPS in production | Protect browser/API communications | Configuration review |

## 3. Technology decisions

| Layer | Selected technology | Version / range | Purpose |
|---|---|---|---|
| UI | React | 19.x | Browser interface |
| Language | TypeScript | 7.x configured | Frontend type safety |
| Build/dev | Vite | 8.x | Development and production build |
| Styling | Tailwind CSS | 4.x | UI styling |
| Icons | lucide-react | 1.x declared | Iconography |
| Client auth | Firebase JS SDK | 12.x declared | Authentication |
| API | FastAPI | >=0.116,<1.0 | HTTP API |
| Server | Uvicorn | >=0.35,<1.0 | ASGI runtime |
| Settings | pydantic-settings | >=2.10,<3.0 | Environment configuration |
| Admin | firebase-admin | >=7.1,<8.0 | Token verification / Firestore |
| HTTP | httpx | >=0.28,<1.0 | TMDB client |
| Rate limiting | SlowAPI | >=0.1.9,<1.0 | IP-based endpoint limits |

Versions above reflect declared dependency ranges or package metadata; verify lockfiles and installed versions for exact reproducibility.

## 4. External dependencies and APIs

| Dependency | Used for | Failure behaviour / notes |
|---|---|---|
| Firebase Authentication | User authentication and ID tokens | Protected requests reject missing/invalid tokens |
| Firebase Admin | Verify ID tokens and access Firestore | Backend unavailable if credentials/configuration invalid |
| Cloud Firestore | Persistent user/watch/taste data | Data operations depend on service availability |
| TMDB | Trending, search, details, credits, videos, providers | Backend maps TMDB failures to controlled API errors |
| Vercel | Frontend deployment | SPA route rewrites configured in repository |
| Render | API deployment | Uses `render.yaml` |

Observe TMDB's current API terms, attribution requirements, image usage rules, and rate limits before release changes.

## 5. Engineering constraints

- **Input validation:** Pydantic schemas constrain media type, statuses, ratings, username, title, and notes.
- **Request limits:** API query parameters bound search length/page ranges.
- **Rate limits:** Current routes use SlowAPI with client IP as the key.
- **Data model:** Firestore document/subcollection layout; no relational ORM or SQL database.
- **Taste update integrity:** Stored contributions support reversal of edits/deletions.
- **Scaling:** Configure shared rate-limit storage before multiple API instances.
- **Configuration:** Settings are read from environment / `.env`; frontend exposes only `VITE_*` values.

## 6. Build, tooling, and delivery

### Frontend

Declared scripts include:

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run preview`

### Backend

Install from `backend/requirements.txt`. Development/test dependencies are in `backend/requirements-dev.txt`.

- Run API: `uvicorn app.main:app --reload`
- Compile check: `python -m compileall app tests`
- Tests: `pytest -q`

### CI

`.github/workflows/ci.yml` runs frontend installation, typechecking and build; backend dependency installation, compilation and Pytest. It runs for pushes and pull requests targeting `main`.

## 7. Code conventions

- Keep route orchestration in the API layer and reusable logic in service modules.
- Validate untrusted request data at the API boundary.
- Use verified Firebase UID as the authority for user-scoped data.
- Keep Firebase Admin credentials and TMDB secret on the backend.
- Do not treat public Firebase web configuration as an admin credential.
- Avoid reporting performance targets until measured under documented conditions.
- Keep taste-model scoring constants and versioning explicit.

## 8. Technical risks and unresolved decisions

| Topic | Current position | Confidence | Validation / decision required |
|---|---|---|---|
| Rate-limit store | Defaults to `memory://` | High | Shared store before horizontal scaling |
| Firestore rules | Not visible in repository tree | Unknown | Audit Firebase console rules |
| Taste model versioning | Version metadata exists in taste profile | High | Define migration/rebuild procedure |
| Recommendation ranking | Product intent exists; verify current shipped endpoint/UI | Medium | Separate implemented from planned behaviour |
| User data export/deletion | Not specified here | Unknown | Define lifecycle and test |
| Observability | Managed host logs; no SLO documented | Medium | Add structured metrics/alerts |

## 9. Links

- [PRD](01_PRD.md)
- [Architecture](03_Architecture.md)
- [API and data schema](06_Protocol_and_Data_Schema.md)
- [ADRs](../ADR/README.md)
