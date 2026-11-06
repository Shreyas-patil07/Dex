# ADR-0003: TMDB as External Media Catalogue

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Dex requires movie/TV catalogue metadata, trending lists, search, media details, credits/videos, and regional watch-provider information.

## Decision

Use TMDB as external catalogue provider. Backend services call TMDB using a server-side API key and cache metadata used for taste feature extraction in Firestore.

## Consequences

- Dex does not need to maintain the full catalogue.
- Availability, quota, latency, response shape, freshness, attribution, branding, and permitted use depend on TMDB.
- Upstream failures must be handled explicitly.
- Provider availability is not a guarantee of playback.
- Current TMDB terms and attribution requirements must be reviewed before release.
