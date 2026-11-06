# Recommendation Engine V1

> **Status:** Implemented in main; production route verification pending  
> **Algorithm version:** 1  
> **Last updated:** 2026-11-07

## 1. Purpose

The recommendation engine turns a user's watched titles and ratings into three different discovery suggestions:

- **Safe:** the strongest available relevance match to the user's learned taste.
- **Adjacent:** a relevant title selected with an explicit diversity trade-off against the Safe pick.
- **Wildcard:** a title drawn from a separate popularity/trending retrieval path, encouraging exploration beyond the user's most represented genres.

The engine returns suggestions, not predictions of individual behaviour. Match values are candidate-pool percentile ranks and must not be described as probabilities.

## 2. Source modules

| Module | Responsibility |
|---|---|
| backend/app/services/taste.py | Feature groups, signed contribution calculation, contribution reversal and versioning |
| backend/app/services/tmdb_catalog.py | Shared feature metadata, labels, 180-day cache and document-frequency indexing |
| backend/app/services/recommendations.py | Recent profile, IDF, retrieval, scoring, explanations, MMR and slot assembly |
| backend/app/main.py | Authenticated GET /api/recommendations route |
| frontend/src/pages/HomePage.tsx | For You section, cards, refresh and profile backfill UI |
| backend/tests/test_taste.py | Scoring, recent profile, IDF, MMR and service tests |
| backend/tests/test_api.py | Auth, route and slot contract regression test |

## 3. Input profile

Only records with status watched contribute. The engine uses:

- Genres.
- Keywords.
- People: movie directors or TV creators.
- Decades.

Want-to-watch and in-future records are excluded. Each watch stores the exact taste contribution snapshot used to update aggregate vectors. This makes later edits and deletes reversible.

### Signed rating signal

Rating baseline is 5.5:

- For rating r below 5.5: (r - 5.5) / 5.5.
- For rating r at or above 5.5: (r - 5.5) / (10 - 5.5).
- An unrated watched title contributes +0.15.
- The resulting signal is signed and bounded to [-1, 1].

Feature weights are independently L2-normalized within each group. The recommender combines group scores with these weights:

| Feature group | Weight |
|---|---:|
| Genres | 1.0 |
| Keywords | 1.2 |
| People | 1.0 |
| Decades | 0.35 |

The current model/schema version is 1. A future change to feature extraction or contribution semantics requires versioning and a migration/rebuild plan.

## 4. All-time and recent taste

The all-time profile is maintained incrementally in Firestore. The recent profile is rebuilt from stored contribution snapshots during recommendation generation; it does not rewrite watch history.

The recency decay uses a 90-day half-life:

weight(age) = 0.5 ^ (age_in_days / 90)

The final relevance score blends:

- 75% all-time profile score.
- 25% recent profile score.

If either component is unavailable, the other usable component is used. If no usable taste signal exists, recommendations fall back to TMDB quality/popularity and match_percent is null.

## 5. IDF weighting

Common features are less discriminative than rare ones. The shared TMDB catalogue maintains:

- tmdb_feature_stats/{group}.document_count — number of catalogue documents indexed for the feature group.
- tmdb_feature_stats/{group}/features/{feature_id}.document_frequency — number of indexed catalogue items containing that feature.

The IDF value is:

IDF(feature) = ln((N + 1) / (DF + 1)) + 1

Where N is the indexed catalogue document count for the group and DF is the feature document frequency. Frequencies are updated transactionally and are indexed once per catalogue entry for each feature-stats version. If an entry's feature snapshot changes, old feature frequencies are decremented and new frequencies incremented.

## 6. Candidate retrieval

The pipeline separates primary taste-related retrieval from exploratory retrieval.

### Primary retriever

Uses TMDB discovery filters based on profile genres, keywords and movie people, with multiple values combined within filter queries as supported by TMDB. It selects an initial candidate pool, enriches selected candidates with catalogue features/labels, and computes full signed relevance across all four feature groups.

Current implementation bounds the primary ranked candidate set at 18 before enrichment.

### Wildcard retriever

Uses a separate TMDB weekly-trending retrieval path. It ranks eligible candidates using catalogue quality/popularity and then applies a novelty preference for less represented genres in the user's taste profile. Up to 12 wildcard candidates are considered before enrichment.

Already watched or otherwise saved titles are excluded from both candidate pools.

Candidate enrichment concurrency is bounded at four requests. TMDB metadata is reused from the shared catalogue cache when fresh.

## 7. Scoring and diversification

For each enriched candidate:

1. Compute a signed cosine similarity per feature group between the user's positive-minus-negative profile evidence and the candidate feature set.
2. Apply IDF feature weights.
3. Combine available group scores using the group weights.
4. Blend all-time and recent scores.
5. Generate human-readable reasons from cached TMDB feature labels.
6. Calculate a mid-rank percentile across the current request's enriched candidate pool.

### Safe

The Safe slot is the highest raw relevance candidate in the primary pool.

### Adjacent

The Adjacent slot is selected from the remaining primary candidates using maximal marginal relevance. The implementation uses lambda 0.45:

MMR = lambda * relevance_01 - (1 - lambda) * redundancy

Redundancy is a weighted feature Jaccard similarity to the Safe candidate. Relevance is mapped from signed [-1, 1] into [0, 1] for MMR.

### Wildcard

The Wildcard slot is selected from the independent trending pool. It is penalized for overlap with already selected slots and receives a novelty preference for underrepresented genres.

Slots can be null when no eligible candidate is available.

## 8. Response semantics

GET /api/recommendations returns:

- generated_at and algorithm_version.
- personalized flag.
- match_score_semantics.
- profile_status counts and backfill_complete.
- recent_profile parameters.
- slots.safe, slots.adjacent and slots.wildcard.

Each candidate includes TMDB media information, raw_score, match_percent, match_semantics and reasons.

**match_percent is not a probability.** It is a percentile rank against the candidates enriched for that individual request. It can change when the candidate pool changes even when the user's underlying taste profile does not. A value of 90 therefore does not mean a 90% likelihood of liking the title.

## 9. Cold start and incomplete history

- No watched records: UI prompts the user to mark titles watched and rate them.
- Watched records without current TMDB metadata: profile_status.pending_titles is non-zero and the UI exposes Build my taste profile.
- TMDB retrieval unavailable: the API can fail with an upstream error; retry after the upstream service recovers.
- Small histories: signed similarity is sparse and recommendations may be unstable. Do not interpret the slots as a validated personal preference model.
- No complete taste signal: use non-personalized quality/popularity fallback and omit percentile match.

The backfill endpoint is bounded and idempotent. See [Protocol and Data Schema](06_Protocol_and_Data_Schema.md) for request/response details.

## 10. Validation and known limitations

Automated coverage includes rating-to-sentiment, contribution normalization, metadata extraction/cache, stale-cache use, recent profile decay, IDF, signed cosine scoring, percentile ranks, feature Jaccard/MMR, backfill and API authentication/slot contracts.

Unit tests establish deterministic implementation behaviour. They do **not** prove offline ranking quality, user satisfaction, calibration, fairness, popularity bias, or production recommendation availability. A representative evaluation dataset and manual review are still required.

## 11. Operational endpoint

GET /api/recommendations is authenticated and limited to 10 requests per minute. The frontend loads it on the signed-in Home page and offers an explicit Refresh action. A 404 from the live host indicates that the deployed service does not currently expose the route; check the Render source version and deployment before changing client authentication or making the route public.

## 12. Related documents

- [Taste data and API schema](06_Protocol_and_Data_Schema.md)
- [Application flow](04_App_Flow.md)
- [Testing and validation](09_Testing.md)
- [Deployment runbook](12_Deployment_Runbook.md)
