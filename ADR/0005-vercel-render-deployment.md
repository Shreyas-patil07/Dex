# ADR-0005: Vercel Frontend and Render Backend

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Dex separates the browser interface from API and privileged backend operations.

## Decision

Deploy the frontend on Vercel and FastAPI backend on Render. Configure runtime settings and secrets through each platform. Keep Render service definition in root `render.yaml`.

## Consequences

- Frontend and backend release lifecycles are independent.
- CORS and API base URL must align across environments.
- Backend credentials must never be present in browser-visible variables.
- Render's memory rate-limit store is not shared across instances; configure shared storage before scaling.
- Deployment smoke tests should verify API health and critical account/watch flows.
