# Technical Requirements Document (TRD)

> **Status:** Baseline — reflects repository configuration  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Technical overview

Dex uses a React browser client backed by a Python FastAPI service. Firebase Authentication establishes identity; FastAPI verifies Firebase ID tokens and accesses Cloud Firestore using Firebase Admin. TMDB supplies catalogue metadata. Vercel and Render host the frontend and backend.

## 2. Platform and runtime constraints

| Area | Requirement | Verification |
|---|---|---|
| Client | Modern browser | Browser testing |
| Frontend tooling | Node 22 in CI, Vite | CI |
| Backend | Python 3.11 | CI/runtime |
| API | FastAPI + Uvicorn | API tests |
| Identity | Firebase Authentication | Auth tests |
| Persistence | Cloud Firestore | Integration tests |
| Catalogue | TMDB API v3 | Service tests |
| Hosting | Vercel + Render | Deployment checks |
| Network | HTTPS in production | Configuration review |

## 3. Technology decisions

| Layer | Technology | Declared range / version | Purpose |
|---|---|---|---|
| UI | React | 19.x | Browser interface |
| Language | TypeScript | 7.x | Frontend type safety |
| Build | Vite | 8.x | Dev/build |
| Styling | Tailwind CSS | 4.x | Styling |
| Icons | lucide-react | 1.x | Iconography |
| Client auth | Firebase JS SDK | 12.x | Authentication |
| API | FastAPI | >=0.116,<1.0 | HTTP API |
| Server | Uvicorn | >=0.35,<1.0 | ASGI |
| Settings | pydantic-settings | >=2.10,<3.0 | Environment config |
| Admin | firebase-admin | >=7.1,<8.0 | Auth/Firestore |
| HTTP | httpx | >=0.28,<1.0 | TMDB client |
| Rate limit | SlowAPI | >=0.1.9,<1.0 | Route limits |

Exact installed versions should be confirmed from dependency lockfiles/runtime.

## 4. External dependencies

| Dependency | Purpose | Failure considerations |
|---|---|---|
| Firebase Auth/Admin | Identity and token verification | Invalid config rejects protected access |
| Firestore | User/watch/taste persistence | Operations depend on service availability |
| TMDB | Trending/search/details/credits/videos/providers | Upstream quota, latency, schema changes |
| Vercel | Frontend hosting | Deployment/SPA routing |
| Render | API hosting | Runtime/secret configuration |

Respect TMDB current terms, attribution, branding, image and rate-limit requirements.

## 5. Engineering constraints

- Pydantic validates request boundaries.
- Search query/page/media type inputs are bounded.
- SlowAPI limits public endpoints by client IP.
- Firestore is the application store; there is no relational ORM.
- Watch/taste mutations must preserve transaction integrity.
- Frontend variables prefixed with VITE_ are browser-visible.
- Shared rate-limit storage is required before horizontally scaling API instances.

## 6. Build and delivery

Frontend scripts: dev, build, typecheck, preview. Backend uses requirements.txt and requirements-dev.txt. CI runs frontend install/typecheck/build and backend dependency install/compileall/Pytest on pushes and pull requests targeting main.

## 7. Code conventions

Keep route orchestration in API layer and reusable logic in services. Derive user ownership from verified Firebase UID. Keep Firebase Admin/TMDB secrets server-side. Keep taste scoring constants and model versions explicit. Do not claim unmeasured performance guarantees.

## 8. Technical risks and unresolved decisions

| Topic | Current position | Confidence / action |
|---|---|---|
| Rate-limit store | memory:// default | High; shared store before scaling |
| Firestore rules | Not in source tree | Unknown; audit Firebase console |
| Taste model versioning | Version metadata exists | High; document migration/rebuild |
| Recommendation ranking | Product intent exists; verify shipped surface | Validate current API/UI |
| Data export/deletion | Not specified here | Define lifecycle |
| Observability/SLO | Host logs/health/CI; no SLO | Add metrics/alerts |

## 9. Links

- [PRD](01_PRD.md)
- [Architecture](03_Architecture.md)
- [Data schema](06_Protocol_and_Data_Schema.md)
- [ADRs](../ADR/README.md)
