# Contributing to Dex

## Before opening a pull request

- Keep changes focused and describe their impact.
- Preserve user-data isolation: derive ownership from verified Firebase identity.
- Preserve watch/taste transaction invariants.
- Add/update tests for behavioural changes.
- Update the owning document when requirements, API contracts, schemas, security, or architecture change.
- Keep environment examples current.
- Never commit .env files, API keys, Firebase service-account files, tokens, private user data, or production exports.
- Link related issues and ADRs.

## Frontend checks

From frontend/:

```bash
npm ci
npm run typecheck
npm run build
```

## Backend checks

From backend/:

```bash
pip install -r requirements-dev.txt
python -m compileall app tests
pytest -q
```

## Documentation conventions

- docs/ contains ten core project documents.
- ADR/ records important technical decisions.
- Keep each fact in one authoritative place; link elsewhere.
- Distinguish implemented behaviour, proposals, assumptions, and unverified production configuration.
- Do not claim performance/security certification without reproducible evidence.

## Pull request scope

Documentation-only changes must not modify application source, tests, dependency manifests, build configuration, or deployment configuration. Separate code changes from documentation refactors.
