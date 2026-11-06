# ADR-0004: Incremental Taste Vectors with Reversible Contributions

- **Status:** Accepted — V1 implementation
- **Date:** 2026-11-02

## Context

Recomputing all viewing history after every watch edit is wasteful. Updating aggregates without retaining the exact prior contribution can create drift on edit/delete.

## Decision

Maintain incremental taste vectors from watched media. Persist exact contribution snapshots on watch records. On edit/delete, reverse the stored contribution and apply replacement within the same Firestore transaction as the watch mutation.

V1 features: genres, keywords, people (movie directors or TV creators), and decades. Each group is independently L2-normalized. Weights: genres 1.0, keywords 1.2, people 1.0, decades 0.35. Rating baseline 5.5 maps sentiment to [-1, 1]; unrated watched title contributes +0.15.

## Consequences

- Watch and vector state commit/rollback together.
- Watch documents retain derived contribution metadata.
- Scoring constants and extraction rules must be versioned.
- Tests must cover status transitions, repeated edits, delete, duplicate operations, and failed transactions.
- Taste vectors are inferred preference summaries, not objective psychological profiles.
