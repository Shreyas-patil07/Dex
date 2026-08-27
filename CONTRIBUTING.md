# Contributing to Dex

## Development setup

Dex has two applications:

- `frontend/` — React + Vite
- `backend/` — FastAPI

Run each application separately using the instructions in the root README.

## Before opening a change

- Keep secrets out of Git.
- Do not commit local databases or Firebase service-account files.
- Keep Firebase Authentication as the authentication source of truth.
- Keep persistent user/watch data in Cloud Firestore.
- Keep frontend API calls pointed at the configured `VITE_API_URL`.
- Update documentation when routes, environment variables, or deployment behavior changes.

## Commit scope

Keep commits focused. Prefer messages such as:

```text
fix auth session redirect
add watch history endpoint
refine trending card loading
```

## Pull requests

Describe:

- what changed
- why it changed
- how it was tested
- any environment or deployment changes

Do not include credentials, service-account JSON, local databases, or personal user data in pull requests.
