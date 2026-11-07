# Security and Privacy Design

> **Status:** Maintained security design with outstanding production verification items  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-07

## 1. Objectives and scope

Protect Firebase identity, private profile data, watch history/notes, taste data, service credentials, and API availability. Boundaries include browser, Firebase, FastAPI, Firestore, TMDB, Vercel, and Render. This is not a penetration-test report or proof that production Firebase rules have been audited.

## 2. Assets

| Asset | Classification | Protection |
|---|---|---|
| Firebase Admin service-account JSON | Secret | Server-only |
| TMDB API key | Secret | Backend environment |
| Firebase ID token | Sensitive credential | HTTPS; verify server-side; never log |
| Email/profile | Personal data | UID-scoped access |
| Watch notes/history | Personal data | Per-user authorization |
| Taste profile and watch contribution snapshots | Inferred preference data | User-scoped access/retention |
| TMDB metadata | Third-party data | Follow terms/attribution |

## 3. Threat model

| Threat | Boundary | Mitigation |
|---|---|---|
| Spoofed identity | Browser → API | Firebase Admin token verification with revocation checking |
| Stolen/revoked session | Browser → API | Check ID-token revocation and account disabled state on every protected request |
| Cross-user access / IDOR | API → Firestore | Derive UID from verified token; single-watch lookup returns 404 for an absent or other-user record |
| Username race | Concurrent claims | Registry create/conflict handling |
| Secret disclosure | Repo/build | Keep privileged secrets server-side |
| TMDB abuse | Public routes | Rate limits and bounded inputs |
| Denial of service | API/upstream | Rate limiting, timeouts and limits |
| Data tampering | Watch/taste | Schema validation and transactions |
| Information disclosure | Logs/errors | Redact tokens, notes, secrets |
| Supply-chain compromise | CI/dependencies | Dependency review and CI |

## 4. Identity and authorization

Firebase Authentication is the client sign-in provider. Frontend sends an ID token in the Bearer header. API verifies the token with Firebase Admin and derives UID from verified claims. User must be synchronized to a Dex profile before protected access. Username claims are normalized and collision-guarded. Watch listing, single-watch lookup, mutations, recommendations, and taste backfill are protected and derive the owner from the verified UID; clients cannot choose another user's Firestore path.

### 4.1 ID-token revocation enforcement

Every protected API request calls Firebase Admin verify_id_token with check_revoked=True. This validates the token and checks the associated Firebase Auth user record for revoked refresh tokens or a disabled account before accepting the identity. Revoked, expired, invalid, disabled-account, and missing-user credentials return HTTP 401 and require the client to reauthenticate. If Firebase Auth cannot complete verification (for example, an upstream/network failure), the API fails closed with HTTP 503 rather than accepting an unchecked token.

Revocation checking performs an additional Firebase Auth user lookup for each protected request. The API middleware caches the verified claims only for the lifetime of that single HTTP request so route dependencies do not repeat the lookup within the same request; it does not cache claims across requests.

Revoking refresh tokens is a separate administrative action. Firebase Admin auth.revoke_refresh_tokens(uid) invalidates refresh sessions and prevents new ID tokens from being minted from those sessions, while an already-issued ID token may remain usable until expiry unless the API checks revocation. Do not expose token revocation as a public user-controlled API without an explicit account/session-management design.

**Required audit:** Verify every watch/profile endpoint uses the verified UID and cannot access another UID by changing request parameters. Review Firebase Security Rules and project IAM directly; these settings are not represented in the repository tree.

## 5. Network security

- Production frontend/API should use HTTPS.
- CORS allowlist must contain only expected origins.
- TMDB requests originate server-side.
- Never trust client auth state without backend token verification.
- Public catalogue endpoints are rate-limited.

## 6. Data protection and privacy

Minimise collected data. Never log ID tokens, service account JSON, API keys, or private notes. Recommendation Engine V2 rebuilds taste profiles from per-watch contribution snapshots; per-feature taste_vectors are no longer active, though legacy Firestore documents may remain. Define retention/deletion for accounts, watches, contribution snapshots, recommendation caches and shared TMDB metadata. Align the public privacy notice with actual collection and processing. Do not present taste inference as definitive personal traits.

## 7. Platform and supply chain

Keep real env files/service accounts ignored. Store production secrets in Render secret variables/files. VITE_* variables are client-visible; no admin secrets or TMDB secret may be exposed. Review dependencies and GitHub Actions. Keep vulnerability reports private.

## 8. Verification

| Control | Verification | Acceptance |
|---|---|---|
| Invalid token | API tests | 401 |
| Expired token | API tests | 401 |
| Revoked token | Firebase Admin verification with check_revoked=True; API tests | 401 |
| Disabled/deleted Auth user | Firebase Admin verification; API tests | 401 |
| Firebase Auth verification outage | API tests | 503; protected request denied |
| User isolation | Cross-UID tests for watch list and single-watch lookup | No cross-user read/write |
| Username uniqueness | Concurrent tests | One owner |
| Secret hygiene | Git history/build scan | No real secrets |
| Input validation | Schema/API tests | Invalid payload rejected |
| Rate limits | Route/load tests | Configured cap enforced |
| Taste transaction | Regression tests | No partial watch/vector mutation |
| Firestore rules | Firebase console review | Least privilege |

## 9. Incident response

Triage scope; revoke affected users' refresh tokens using a trusted Firebase Admin environment; restrict affected routes if needed; preserve redacted evidence; patch/test/deploy; notify users/authorities where legally required; document root cause. After revocation, the deployed API must use revocation checking to reject already-issued tokens before their natural expiry.

## 10. Open security questions

| Question | Action |
|---|---|
| Are production Firestore rules least-privilege? | Audit Firebase console |
| Are account deletion/data erasure complete? | Trace API and Firebase workflows |
| Are logs consistently redacted? | Review Render logs/errors |
| Is rate limiting multi-instance safe? | Shared storage before scaling |
| Does privacy policy reflect taste processing? | Legal/product review |

## 11. Deployment verification boundary

A passing GitHub Actions run or Vercel status does not prove that the Render API process is running the same source revision. Production checks must verify the /api/health source version and exercise protected watch/recommendation routes with an authenticated account. On 2026-11-07, user-provided PowerShell output confirmed Render was serving commit 4632854e8994b641b2054b921e9fca4d96056ee5, and authenticated GET /api/me, GET /api/watches, GET /api/watches/{watch_id}, and GET /api/recommendations requests returned successfully. These observations confirm those routes at that deployment, not every route or edge case. See [Deployment Runbook](12_Deployment_Runbook.md). Do not weaken authentication or make personal recommendation routes public to work around missing production routes.

## 12. Data lifecycle readiness

The browser Firebase module currently uses Firebase Authentication only; the backend uses the Firebase Admin SDK for Firestore. No Firestore Rules file is tracked in the repository, and the live Firebase project's Rules/IAM settings have not been audited. Firestore Rules do not constrain privileged Admin SDK calls. Verify UID-scoped backend authorization and least-privilege service-account IAM separately. There is no account-wide export or deletion endpoint/worker. See [Data Lifecycle and Privacy Readiness](14_Data_Lifecycle_and_Privacy_Readiness.md) for the collection inventory, legacy-document handling, retention policy and release gates. Recommendation-event ingestion must remain blocked until those gates are satisfied.

## 13. Legal and data dependencies

Dex has no license file; absent an explicit license, all rights are reserved. TMDB is a third-party provider; follow current terms, attribution, branding, and image requirements. This documentation grants no rights to media or third-party data. Do not copy the Template repository's MIT license into Dex without a deliberate decision.
