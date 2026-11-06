# Changelog

Notable changes to Dex. Dates use YYYY-MM-DD.

## [Unreleased]

### Production verification update
- User screenshots confirm the For You recommendation cards are populated and the media detail page displays Already watched for an existing record. This supersedes the earlier visible 404/405 state for those UI paths; exact API version, HTTP codes, fresh-title create and duplicate handling remain to be verified.

### Product direction and delivery controls
- Approved v0.6 Reliability and Discovery Intelligence plan, gated on production Render verification.
- Added recommendation event instrumentation, explicit feedback, offline evaluation, security and data-lifecycle workstreams to the roadmap (planning only; not implemented).
- Added change-aware Vercel ignoreCommand configuration so docs-only and backend-only commits can skip frontend builds; frontend changes continue to build.
- Documented Vercel canceled-deployment quota caveat and manual validation steps.

### Product and backend
- Added user-scoped single-watch lookup so media details can show an existing watch status and avoid duplicate adds.
- Added paginated, idempotent historical taste metadata backfill for watched titles.
- Added shared TMDB catalogue document-frequency indexing and personalized Safe, Adjacent, and Wildcard recommendation slots.
- Added 90-day recent-profile weighting, IDF scoring, MMR diversification, explanation labels and candidate-pool percentile semantics.

### Frontend
- Added the signed-in Home page For You section, recommendation refresh, cold-start guidance and one-page taste-profile backfill action.
- Added existing watch status labels to media detail pages.

### Operations
- Added API health response version 0.5.1 and expected watch write route for deployment diagnostics.
- Configured Render Blueprint to deploy branch main, use backend as root directory, auto-deploy on commit and health-check /api/health.
- Render live deployment remains unverified; see docs/12_Deployment_Runbook.md.

### Documentation
- Expanded product, technical, architecture, flow, UI, protocol/schema, implementation, security and testing documentation to reflect shipped code.
- Added a documentation index, recommendation-engine specification and deployment runbook.
- Added dated development evidence and latest CI results.
