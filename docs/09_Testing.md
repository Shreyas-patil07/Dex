# Test Strategy and Validation

> **Status:** Current automated test baseline plus recommended coverage  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Validation objectives

Verify catalogue endpoints, Firebase identity, username ownership, watch lifecycle, taste contribution accounting, and frontend type/build integrity. Performance/reliability targets must be measured.

## 2. Test levels

| Level | Scope | Tooling | CI status |
|---|---|---|---|
| Unit | Taste calculations, normalisation, TMDB client | Pytest | Backend job |
| API | Route validation/auth/errors | Pytest/test client | Backend job |
| Integration | Firestore transactions/Firebase | Emulator or controlled test project | Extend as needed |
| Frontend static | TypeScript | TypeScript compiler | CI |
| Frontend build | Production bundle | Vite | CI |
| End-to-end | Browser/API journeys | Browser automation | Not established |
| Performance | Search latency, write cost | Load tools | Not established |
| Security | Token/isolation/secrets | Tests and review | Partial |
| Compatibility | Mobile/desktop browser | Browser matrix | Formalise |

## 3. Acceptance tests

| ID | Requirement | Scenario | Pass criterion |
|---|---|---|---|
| T-001 | FR-001 | Trending filters | Valid response; invalid filter rejected |
| T-002 | FR-002 | Search bounds/filter | Valid results; invalid query rejected |
| T-003 | FR-003 | Media IDs | Correct details or controlled error |
| T-004 | FR-004 | Firebase token cases | 401 invalid; verified UID on success |
| T-005 | FR-006 | Concurrent username claims | One distinct owner |
| T-006 | FR-007 | Watch CRUD | Correct per-user persistence |
| T-007 | FR-009 | Watched vs planned | Only watched affects taste |
| T-008 | FR-010 | Edit/delete profiled watch | Prior contribution reversed |
| T-009 | FR-010 | Repeated edits/deletes | No vector drift/double subtraction |
| T-010 | NFR-002 | Cross-user request | No other user's data |
| T-011 | NFR-001 | Secret scan | No credentials in repo/build |

## 4. Environments

| Environment | Runtime | Purpose |
|---|---|---|
| Developer | Node 22 / Python 3.11 | Local iteration |
| GitHub Actions | Ubuntu, Node 22, Python 3.11 | CI |
| Firebase emulator/test project | Configured test identity/data | Auth/Firestore integration |
| Production | Vercel/Render/Firebase | Non-destructive smoke tests |

## 5. Performance and reliability

No verified benchmark values are recorded. Measure p50/p95 trending/search/detail latency, TMDB error rate, Firestore reads/writes per mutation, taste update duration, frontend bundle size, and uptime. Record environment, sample size, warm-up, dataset and duration.

## 6. Fault and edge cases

| Scenario | Expected behaviour |
|---|---|
| TMDB timeout/non-2xx | Controlled error; no secret leak |
| Invalid token | 401 |
| Unsynchronized profile | Protected API rejects |
| Concurrent username claim | One owner |
| Invalid rating/status/media type | Validation error |
| TMDB metadata unavailable | Pending taste metadata handled consistently |
| Repeated taste edit/delete | No aggregate drift |
| Transaction abort | No partial write |
| Rate limit exceeded | Rate-limit response |
| Unknown CORS origin | Browser access not allowed |

## 7. Release gates

- Backend Pytest passes.
- Python compile check passes.
- Frontend typecheck and build pass.
- Taste reversal/transaction invariants pass.
- Cross-user access tests pass.
- Secrets and allowed origins are reviewed.
- Known limitations are documented.

## 8. Evidence

- CI: https://github.com/Shreyas-patil07/Dex/actions
- Backend tests: backend/tests/
- Taste service: backend/app/services/taste.py
- TMDB client: backend/app/services/tmdb.py
- API: backend/app/main.py

## 9. Current CI commands

Frontend: `npm ci`, `npm run typecheck`, `npm run build`.  
Backend: `pip install -r requirements-dev.txt`, `python -m compileall app tests`, `pytest -q`.
