# Test Strategy and Validation

> **Status:** Current automated test baseline with latest main-branch evidence  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-07

## 1. Validation objectives

Verify catalogue endpoints, Firebase identity, username ownership, watch lifecycle, taste contribution accounting, and frontend type/build integrity. Performance/reliability targets must be measured.

## 2. Test levels

| Level | Scope | Tooling | CI status |
|---|---|---|---|
| Unit | Taste calculations, profile reconstruction, ranking metrics, TMDB client | Pytest | Backend job |
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
| T-009 | FR-010 | Repeated edits/deletes | No stale contribution or double reversal |
| T-010 | NFR-002 | Cross-user request | No other user's data |
| T-011 | NFR-001 | Secret scan | No credentials in repo/build |
| T-012 | FR-013 | Read single watch as owner and another user | Owner receives 200; another user receives 404 |
| T-013 | FR-014 | Recommendation endpoint auth/slots | Missing auth is 401; authenticated call returns Safe/Adjacent/Wildcard keys |
| T-014 | FR-015 | Backfill pagination and repeat pass | Cursor and counters correct; repeated run skips completed record |
| T-015 | NFR-004 | API health method/version contract | GET returns JSON version; HEAD returns 200 with no body |
| T-016 | NFR-006 | Offline recommendation evaluation | Fixed synthetic fixtures produce deterministic ranking metrics and pass metric unit tests |

## 4. Environments

| Environment | Runtime | Purpose |
|---|---|---|
| Developer | Node 22 / Python 3.11 | Local iteration |
| GitHub Actions | Ubuntu, Node 22, Python 3.11 | CI |
| Firebase emulator/test project | Configured test identity/data | Auth/Firestore integration |
| Production | Vercel/Render/Firebase | Non-destructive smoke tests |

## 5. Performance and reliability

No verified production performance values are recorded. Measure p50/p95 trending/search/detail latency, TMDB error rate, Firestore reads/writes per mutation, taste update duration, frontend bundle size, and uptime. The offline evaluator provides a small synthetic relevance/diversity regression baseline only; it does not measure production retrieval quality, satisfaction, latency or statistically significant outcomes. Record environment, sample size, warm-up, dataset and duration.

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
- Taste contribution reversal/profile reconstruction invariants pass.
- Cross-user access tests pass.
- Offline synthetic evaluation tests pass before any scoring-weight changes.
- Secrets and allowed origins are reviewed.
- Known limitations are documented.

## 8. Latest merged CI evidence

**Main merge commit:** `0908982512903f3879fa4df3f835b1e1d10d70a2` (PR #21 — Recommendation Engine V2)  
**Workflow run:** [42347709974](https://github.com/Shreyas-patil07/Dex/actions/runs/42347709974)

- Backend: compilation, dependency audit and **48 pytest tests passed**.
- Frontend: typecheck and production build passed.
- Frontend security audit: failed with **7 high-severity dependency findings** in the existing dependency tree. PR #21 did not change frontend dependency versions.
- Vercel preview ignored the backend/docs-only build as configured.
- The user-provided route probes performed before the merges returned health 200/version 0.5.1 and 401 for both unauthenticated protected endpoints. They do not verify the post-merge V2 Render deployment or authenticated operations.

CI passing does not prove the active Render deployment is running the latest main revision. See [Deployment Runbook](12_Deployment_Runbook.md).

## 9. Offline recommendation evaluation

Run from the backend directory:

```bash
python scripts/evaluate_recommendations.py
```

The script reads `backend/evaluation/recommendation_fixtures.json`, makes no TMDB/network calls, and reports macro-averaged NDCG@3, Precision@3, Recall@3, intra-list diversity and positive-feature coverage across five predeclared synthetic profiles. It also emits each profile's top-three deterministic greedy-MMR diagnostic.

The fixture judgements are explicit assumptions. Do not revise them after seeing output merely to improve scores. The evaluator tests the scoring/profile logic against synthetic candidates; it does not evaluate live TMDB retrieval, randomized cache serving, user satisfaction or statistical significance. Use it as a regression baseline, not a performance claim.

## 10. Evidence

- CI: https://github.com/Shreyas-patil07/Dex/actions
- Backend tests: backend/tests/
- Offline evaluator: backend/scripts/evaluate_recommendations.py
- Taste service: backend/app/services/taste.py
- Recommendation service: backend/app/services/recommendations.py
- TMDB client: backend/app/services/tmdb.py
- API: backend/app/main.py

## 11. Current CI commands

Frontend: `npm ci`, `npm run typecheck`, `npm run build`.  
Backend: `pip install -r requirements-dev.lock`, `python -m compileall app tests`, `pytest -q`.  
Offline evaluator: `python scripts/evaluate_recommendations.py`.
