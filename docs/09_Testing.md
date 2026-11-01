# Test Strategy and Validation

> **Status:** Current automated test baseline plus recommended coverage  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Validation objectives

Demonstrate correctness of catalogue endpoints, Firebase identity verification, username ownership, watch-record lifecycle, taste contribution accounting, and frontend build/type integrity. Performance and production reliability targets must be measured, not assumed.

## 2. Test levels

| Level | Scope | Tooling | CI status |
|---|---|---|---|
| Unit | Taste calculations, normalisation, TMDB client behaviour | Pytest | Backend test job |
| API | FastAPI route validation/auth/error behaviour | Pytest and test client | Backend test job |
| Integration | Firestore transaction and Firebase interactions | Fakes/emulators or controlled test project | Extend as required |
| Frontend static | TypeScript correctness | TypeScript compiler | Yes |
| Frontend build | Production bundling | Vite | Yes |
| End-to-end | Real user flows across browser/API | Browser automation | Not established in current CI |
| Performance | Search latency, trending latency, write cost | Load/benchmark tooling | Not established |
| Security | Token validation, cross-user isolation, secret hygiene | Tests and review | Partial |
| Compatibility | Mobile/desktop browser behaviour | Device/browser matrix | Manual / to formalise |

## 3. Acceptance criteria

| Test ID | Requirement | Scenario | Pass criterion |
|---|---|---|---|
| T-001 | FR-001 | Trending by media type/time window | Valid response and invalid filters rejected |
| T-002 | FR-002 | Search query bounds and media filtering | Valid results; bad query rejected |
| T-003 | FR-003 | Valid/invalid media detail identifiers | Correct response or controlled validation error |
| T-004 | FR-004 | Missing/invalid/valid Firebase token | 401 for invalid; UID verified for valid |
| T-005 | FR-006 | Same username claimed by two users | Second distinct user receives conflict |
| T-006 | FR-007 | Create/list/update/delete watch | Correct per-user persistence |
| T-007 | FR-009 | Add watched vs watchlist item | Only watched item changes taste |
| T-008 | FR-010 | Edit/delete a profiled watch | Exact prior contribution is reversed |
| T-009 | FR-010 | Repeated edits and deletes | No vector drift or double subtraction |
| T-010 | NFR-002 | User A requests User B data | Access denied / no cross-user data |
| T-011 | NFR-001 | Secret scan | No credentials in repo or frontend output |

## 4. Test environments and matrix

| Environment | Runtime | Purpose |
|---|---|---|
| Local developer | Node 22 / Python 3.11 | Fast iteration |
| GitHub Actions | Ubuntu, Node 22, Python 3.11 | Repeatable CI |
| Firebase test environment/emulator | Project-specific | Auth/Firestore integration |
| Production | Vercel + Render + Firebase | Smoke checks only; avoid destructive tests |

## 5. Performance and reliability benchmarks

No verified production benchmark values are recorded here. Establish baseline measurements for:

- Trending/search/detail response time (p50/p95).
- TMDB upstream timeout/error rate.
- Firestore reads/writes per watch mutation.
- Taste vector mutation duration and document counts.
- Frontend initial-load/build size.
- Error rates and uptime over a defined period.

Record the hardware/runtime, sample size, warm-up, dataset, and test duration with each result.

## 6. Fault and edge-case testing

| Scenario | Expected behaviour |
|---|---|
| TMDB timeout / non-2xx | Controlled service error; no leaked API key |
| Missing/expired Firebase ID token | 401 |
| User not synchronized | Protected API rejects until sync |
| Username collision under concurrency | One owner only |
| Duplicate watch record | Conflict or idempotent behaviour as implemented |
| Rating outside 0–10 | Validation failure |
| Invalid media type/status | Validation failure |
| TMDB metadata unavailable during taste update | Watch persistence and pending metadata handled consistently |
| Taste edit/delete repeated | No contribution drift |
| Firestore transaction abort | Watch and taste state do not partially commit |
| Rate limit exceeded | Rate-limit response |
| CORS from unknown origin | Browser access not allowed |

## 7. Regression and release gates

- [ ] Backend Pytest suite passes.
- [ ] Python compile check passes.
- [ ] Frontend typecheck passes.
- [ ] Frontend production build passes.
- [ ] Taste contribution reversal and transaction invariants pass.
- [ ] Cross-user access tests pass.
- [ ] Production secrets and allowed origins are reviewed.
- [ ] Known failures and limitations are recorded.

## 8. Results and evidence

- CI: https://github.com/Shreyas-patil07/Dex/actions
- Backend tests: `backend/tests/`
- Taste engine: `backend/app/services/taste.py`
- TMDB service: `backend/app/services/tmdb.py`
- API route implementation: `backend/app/main.py`

## 9. Current CI commands

**Frontend**
```bash
npm ci
npm run typecheck
npm run build
```

**Backend**
```bash
pip install -r requirements-dev.txt
python -m compileall app tests
pytest -q
```
