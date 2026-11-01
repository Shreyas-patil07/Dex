# Security and Privacy Design

> **Status:** Baseline with outstanding verification items  
> **Owner:** Dex maintainers  
> **Last updated:** 2026-11-02

## 1. Security objectives and scope

Protect account identity, private profile data, watch history, user notes, taste data, service credentials, and API availability. The security boundary includes the browser, Firebase Authentication, FastAPI, Firestore, TMDB, Vercel, and Render.

This document records repository-observable controls. It is not a penetration-test report or a claim that all production Firebase rules have been audited.

## 2. Assets and trust boundaries

| Asset | Classification | Protection requirement |
|---|---|---|
| Firebase Admin service-account JSON | Secret | Server-only secret storage; never commit |
| TMDB API key | Secret | Server-side environment variable |
| Firebase ID token | Sensitive credential | HTTPS; verify server-side; never log |
| Email/profile data | Personal data | UID-scoped access and minimisation |
| Watch notes/history | Personal data | Enforce per-user authorization |
| Taste profile/vectors | Personal data / inferred preference data | User-scoped access and controlled retention |
| TMDB metadata | Third-party data | Respect TMDB terms and attribution |
| Rate-limit resources | Operational asset | Limit abuse and exhaustion |

## 3. Threat model

| Threat | Boundary | Risk | Current / required mitigation |
|---|---|---|---|
| Spoofing | Browser → API | Forged identity | Verify Firebase ID token with Admin SDK |
| IDOR / cross-user access | API → Firestore | High | Resolve UID from token; never trust caller-supplied owner ID |
| Username race | Concurrent account claims | Medium | Registry document creation and conflict handling |
| Secret disclosure | Repository / frontend build | High | Keep admin and TMDB secrets on backend; audit history and build output |
| TMDB abuse | Public API routes | Medium | SlowAPI limits, bounded inputs |
| Denial of service | API / upstream | Medium | Rate limits, bounded page/query inputs, timeouts |
| Data tampering | Watch and taste state | High | Pydantic validation and transactional mutation |
| Information disclosure | Logs/errors | Medium | Redact tokens, notes, email where unnecessary |
| Dependency compromise | CI/build | Medium | Dependency updates, review, CI |

## 4. Identity, authentication, and authorization

- Firebase Authentication is the client sign-in provider.
- The frontend sends a Firebase ID token in a Bearer authorization header for protected calls.
- The API verifies the token server-side.
- The backend extracts the verified UID and uses it as the owner key.
- A user must be synchronized to a Dex user document before protected profile access.
- Username claims are normalized and protected against duplicate ownership.

**Required audit:** Verify that every watch/profile endpoint obtains the target UID from verified credentials and cannot access another UID by changing a path/body parameter. Also review Firestore security rules and Firebase project IAM directly; those settings are not represented in this source tree.

## 5. Network and communication security

- Production frontend/API should use HTTPS.
- CORS is configured from backend settings; production allowlist should contain only expected origins.
- TMDB requests originate from the backend so its API key is not exposed to browser code.
- Do not treat a Firebase-authenticated request as safe until its token is verified.
- Public search/trending/details endpoints are rate-limited in the current API.

## 6. Data protection and privacy

- Collect only profile and watch data needed for Dex features.
- Do not log Firebase tokens, service account JSON, API keys, or user notes.
- Document retention and deletion behaviour for account deletion, watch history, taste vectors, and cached shared data.
- Provide a clear user-facing privacy notice that matches actual collection and processing.
- Review whether taste profiles should be exportable and erasable with the source watch records.
- Avoid exposing taste inferences as sensitive or definitive personal traits.

The repository includes a privacy-policy page; its text must be reviewed against current backend behaviour and applicable legal obligations.

## 7. Platform and supply-chain security

- Use `.env.example` placeholders; real `.env` files and Firebase service-account files must remain ignored.
- Store production secrets in Render secret environment variables/files.
- Only VITE-prefixed variables are exposed to browser code; never put admin credentials or TMDB secret in them.
- Review dependency changes and GitHub Actions actions.
- Pin or constrain production dependencies and use lockfiles where applicable.
- Keep security reports out of public issue threads.

## 8. Security verification

| Control | Verification method | Acceptance condition |
|---|---|---|
| Invalid token rejection | API tests | 401 |
| User isolation | Cross-UID API tests | No data returned or modified |
| Username uniqueness | Concurrent claim tests | At most one owner |
| Secret hygiene | Git history and build scan | No real credentials |
| Input validation | Schema/API tests | Invalid payloads rejected |
| Rate limiting | Route tests/load test | Configured limit enforced |
| Taste transaction integrity | Regression tests | Watch and contributions commit/rollback together |
| Firestore rules | Firebase console review | Rules match authorization model |

## 9. Incident response

1. Triage and scope the affected service/data.
2. Revoke compromised Firebase credentials or rotate TMDB/Firebase Admin secrets.
3. Disable or restrict impacted routes if needed.
4. Preserve relevant logs without copying secrets or unnecessary personal data.
5. Patch, test, deploy, and validate.
6. Notify affected users or authorities when legally required.
7. Record the root cause and prevention work.

## 10. Open security questions

| Question | Next action |
|---|---|
| Are production Firestore security rules least-privilege? | Audit Firebase console rules |
| Are account deletion and full data erasure implemented? | Trace API and Firebase workflows; document gaps |
| Are logs redacted consistently? | Review Render logs and application exceptions |
| Is rate limiting adequate for multi-instance operation? | Configure shared storage before scaling |
| Is the privacy policy aligned with actual taste processing? | Legal/product review |

## 11. Legal and data dependencies

- Dex repository currently has no license file; all rights are reserved by default.
- TMDB is a third-party data provider. Follow current terms, branding, attribution, and image requirements.
- This documentation does not grant rights to media assets or third-party data.
- Do not copy the Template repository's MIT license into Dex without a deliberate licensing decision.
