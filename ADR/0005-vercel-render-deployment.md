# ADR-0005: Vercel Frontend and Render Backend

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Dex separates the browser interface from API and privileged backend operations.

## Decision

Deploy the frontend on Vercel and FastAPI backend on Render. Configure runtime settings and secrets through each platform. Keep Render service definition in root `render.yaml`.

The current Blueprint declares the `main` branch, `backend` root directory, `autoDeployTrigger: commit`, and `/api/health` as the service health check. The API health response includes the running FastAPI application version so the live process can be compared with source.

## Consequences

- Frontend and backend release lifecycles are independent.
- CORS and API base URL must align across environments.
- Backend credentials must never be present in browser-visible variables.
- Render's memory rate-limit store is not shared across instances; configure shared storage before scaling.
- Deployment smoke tests should verify API health and critical account/watch flows.
- A successful Vercel status or GitHub Actions run is not proof that the Render backend deployed the same commit.
- Existing Render services must sync/apply Blueprint changes in the Render Dashboard; a committed render.yaml alone does not establish current service state.
- Verify the backend version and authenticated recommendation/watch routes after every deployment that changes API contracts.
