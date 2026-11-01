# ADR-0003: TMDB as External Media Catalogue

- **Status:** Accepted
- **Date:** 2026-11-02
- **Decision owners:** Dex maintainers

## Context

Dex needs movie and television catalogue data, trending lists, search, media details, credits/videos metadata, and regional watch-provider information.

## Decision

Use TMDB as the external catalogue provider. Backend service modules call TMDB using a server-side API key and cache the feature metadata needed by taste calculations in Firestore.

## Consequences

- Dex does not need to maintain a full media catalogue.
- Availability, latency, quota, response shape, freshness, attribution, branding, and permitted use depend on TMDB.
- Upstream failures must be handled explicitly.
- Provider availability must not be represented as guaranteed playback.
- Current TMDB terms and attribution requirements must be reviewed before release.
