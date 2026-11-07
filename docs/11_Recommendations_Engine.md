# Recommendation Engine V2

> **Status:** Implemented on feature branch; CI and production validation pending  
> **Algorithm version:** 2  
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
| backend/app/services/taste.py | Feature groups, signed per-watch contribution calculation and profile versioning |
| backend/app/services/tmdb_catalog.py | Shared feature metadata, labels and 180-day cache |
| backend/app/services/recommendations.py | Watch-derived profiles, local IDF, item-to-item retrieval, scoring, explanations, MMR, cache and exploration |
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

Both all-time and recent profiles are rebuilt from each watched record's persisted contribution snapshot. The all-time profile uses the exact stored weights; the recent profile applies a 90-day half-life. This avoids per-feature vector documents and their transaction contention. The compact taste/profile document stores summary counts and a profile_version that increments on watch mutations.

The recency decay uses a 90-day half-life:

weight(age) = 0.5 ^ (age_in_days / 90)

The final relevance score blends:

- 75% all-time profile score.
- 25% recent profile score.

If either component is unavailable, the other usable component is used. If no usable taste signal exists, recommendations fall back to TMDB quality/popularity and match_percent is null.

## 5. Local IDF weighting

Feature rarity is computed per recommendation request from two sets of documents:

- The user's watched titles, using their stored `taste_features` (or contribution feature IDs as a fallback).
- The currently enriched candidate pool.

For each feature group, document frequency is counted across those documents and the IDF value is:

IDF(feature) = ln((N + 1) / (DF + 1)) + 1

Where N is the size of the local watched-plus-candidate document set and DF is the number of those documents containing the feature. This avoids global `tmdb_feature_stats` hot documents and catalogue-wide counter writes. The trade-off is that IDF reflects local discrimination rather than global catalogue rarity.

## 6. Candidate retrieval

The pipeline combines personalized item-to-item retrieval with feature-based discovery and an independent exploration pool.

### Item-to-item retriever

Up to four positively contributing watched titles are selected, prioritizing higher ratings. For each seed, the engine requests TMDB:

- `/{movie|tv}/{id}/recommendations`
- `/{movie|tv}/{id}/similar`

Candidates are tagged with a grounded explanation such as "Because you rated Fight Club 9.0/10". Item-to-item results are prioritized in the primary pool so they are not crowded out by popular discover results.

### Discover fallback / supplement

Genre, keyword and movie-person filters remain as secondary retrieval sources. Each discover query fetches pages 1 and 2 rather than page 1 only. Existing watched or saved titles are excluded.

### Wildcard retriever

Uses a separate TMDB weekly-trending retrieval path. It ranks eligible candidates using catalogue quality/popularity and novelty preference for less represented genres. Up to 12 wildcard candidates are considered before enrichment.

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

The Safe lane returns up to two weighted top-k primary candidates, emphasizing the strongest matches to the user's proven taste.

### Adjacent

The Adjacent lane returns up to two candidates from the remaining primary pool using greedy maximal marginal relevance. Each new pick is diversified against both Safe picks and any earlier Adjacent pick. The implementation uses lambda 0.45:

MMR = lambda * relevance_01 - (1 - lambda) * redundancy

Redundancy is a weighted feature Jaccard similarity to the Safe candidate. Relevance is mapped from signed [-1, 1] into [0, 1] for MMR.

### Wildcard

The Wildcard lane returns up to two candidates from the independent trending pool. It excludes all titles selected in the Safe and Adjacent lanes and uses the novelty-ranked wildcard pool, with a preference for underrepresented genres.

Each lane returns an array and may contain fewer than two titles when its eligible pool is too small. The API exposes these arrays under slot_groups.safe, slot_groups.adjacent and slot_groups.wildcard. For compatibility with older frontend builds, slots.safe, slots.adjacent and slots.wildcard remain as aliases to the first item in each lane (or null). The six items are globally distinct when six eligible candidates exist.

## 8. Versioned cache and exploration

The recommendation cache is stored at `users/{uid}/recommendations/current` and contains candidate pools, response metadata, generation time and the profile_version used to compute them.

- Cache TTL is six hours.
- Every watch create/update/delete and successful taste backfill increments profile_version.
- If a cache exists, watch mutations schedule a background refresh. The next GET also rebuilds if the cache is stale or missing.
- A fresh cache hit does not call TMDB or reread the watch collection.
- Safe returns up to two weighted top-k primary candidates without replacement.
- Adjacent greedily returns up to two candidates using MMR against all picks already made in the Safe and Adjacent lanes.
- Wildcard returns up to two weighted top-k candidates from the novelty-ranked wildcard pool after excluding all Safe and Adjacent selections.
- Sampling is weighted toward the highest-ranked candidates, not uniform random selection.

This provides controlled exploration without rerunning retrieval and enrichment on every Refresh. The first recommendation request after a profile change may still perform the full rebuild if no prior cache existed.

## 9. Response semantics

GET /api/recommendations returns:

- generated_at and algorithm_version.
- personalized flag.
- match_score_semantics.
- profile_status counts and backfill_complete.
- recent_profile parameters.
- slot_groups.safe, slot_groups.adjacent and slot_groups.wildcard (up to two items per lane; six total).
- Backward-compatible slots.safe, slots.adjacent and slots.wildcard aliases (first item per lane).

Each candidate includes TMDB media information, raw_score, match_percent, match_semantics and reasons. Item-to-item candidates can explain which positively rated watch seeded their retrieval.

**match_percent is not a probability.** It is a percentile rank against the candidates enriched for that individual profile version. It can change when the candidate pool changes even when the user's underlying taste profile does not.

## 10. Cold start and incomplete history

- No watched records: UI prompts the user to mark titles watched and rate them.
- Watched records without current TMDB metadata: profile_status.pending_titles is non-zero and the UI exposes Build my taste profile.
- TMDB retrieval unavailable: the API can fail with an upstream error; retry after the upstream service recovers.
- Small histories: signed similarity is sparse and recommendations may be unstable. Do not interpret the slots as a validated personal preference model.
- No complete taste signal: use non-personalized quality/popularity fallback and omit percentile match.

The backfill endpoint is bounded and idempotent. See [Protocol and Data Schema](06_Protocol_and_Data_Schema.md) for request/response details.

## 11. Validation and known limitations

Automated coverage includes rating-to-sentiment, contribution normalization, metadata extraction/cache, stale-cache use, recent profile decay, IDF, signed cosine scoring, percentile ranks, feature Jaccard/MMR, backfill and API authentication/slot contracts.

Unit tests establish deterministic implementation behaviour. They do **not** prove offline ranking quality, user satisfaction, calibration, fairness, popularity bias, or production recommendation availability. A representative evaluation dataset and manual review are still required.

## 12. Operational endpoint

GET /api/recommendations is authenticated and limited to 10 requests per minute. The frontend loads it on the signed-in Home page and offers an explicit Refresh action. A 404 from the live host indicates that the deployed service does not currently expose the route; check the Render source version and deployment before changing client authentication or making the route public.

## 13. Related documents

- [Taste data and API schema](06_Protocol_and_Data_Schema.md)
- [Application flow](04_App_Flow.md)
- [Testing and validation](09_Testing.md)
- [Deployment runbook](12_Deployment_Runbook.md)
