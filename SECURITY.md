# Security Policy

## Scope

Dex handles Firebase identity, profile information, watch history, taste-derived data, and external-service credentials.

## Supported versions

| Version | Supported |
|---|---|
| Current default branch | Best-effort security fixes |
| Older commits/releases | No guarantee |

## Reporting a vulnerability

Do not report vulnerabilities in public issues. Use GitHub's **Report a vulnerability** feature under the repository Security tab when available. Include a clear description, impact, reproduction steps, affected commit/component, and suggested mitigation.

Do not include real user data, passwords, Firebase ID tokens, service-account JSON, or API keys.

## Response

Maintainers should acknowledge reports, assess severity and affected data, coordinate containment/remediation, rotate compromised credentials where required, and publish an advisory when appropriate. No formal response-time SLA has been established.

## Operational reminders

- Keep Firebase Admin credentials and TMDB keys server-side.
- Verify Firebase tokens for protected routes.
- Scope Firestore access to verified UID.
- Review Firebase Security Rules and IAM independently of this repository.
- Redact credentials and personal notes from application logs.
