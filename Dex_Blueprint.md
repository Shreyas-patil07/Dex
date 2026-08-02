# Dex — Blueprint (v1.0)

A taste-tracking and recommendation platform for movies & series. One taste vector, derived from what you watch, powers recommendations, badges, leaderboards, and profile theming — instead of four separate systems each guessing independently.

This is the canonical spec. It reconciles the PRD and the earlier system design conversation — every place they disagreed is resolved once, on the record, in §11.

---

## 01 · Vision & Metrics

**North star:** reduce content discovery time from 20+ minutes to under 2, by building a taste model accurate enough to trust — not just log against. 100K MAU in 12 months, driven by organic sharing, not paid acquisition.

| Metric | Target | Window |
|---|---|---|
| Discovery time | < 2 min | 6mo post-onboarding |
| Day-30 retention | 40% | 6mo post-launch |
| Recommendation relevance | 70% marked relevant/watched within 30 days | 6 months |
| Badge engagement | 60% of users earn ≥3 | 3 months |
| Daily watches logged | 50,000/day | 12 months |
| Profile sharing rate | 25% | 6 months |

---

## 02 · Personas

| | Arjun — Completionist | Priya — Efficient Discoverer | Rohan — Social Competitor |
|---|---|---|---|
| **Behavior** | 5–8 films/week, chases director filmographies | 2–3 shows/week, wants the right pick fast | Watches as a social activity |
| **Needs** | Completionism tracking, nuanced sub-genre vector, leaderboard standing | Fast/accurate recs, visible "why," one-tap logging | Shareable profile card, leaderboards, visible progress |
| **Fails today because** | No platform quantifies diverse taste or rewards dedication | Recommendations feel random and unexplained | Profiles are boring and static |

---

## 03 · Scope

**In scope — v1**
- Movies + Series (unified catalog)
- 4 watch statuses (`watched`, `want_to_watch`, `in_queue`, `watched_disliked`) with per-season granularity for series
- Taste vector engine (single source of truth for all downstream features)
- Content-based recommendations with a diversity slice
- Badges — 5 categories, tiered + dynamic rarity
- Global + country leaderboards
- Auto-evolving profile theme

**Out of scope — v1**
- Anime (different taxonomy — Phase 3)
- Social/friend features, including Taste Twins (Phase 2 — see §11)
- Written reviews (Letterboxd's territory)
- Streaming auto-tracking (no public APIs exist)
- Native mobile apps (PWA first)

---

## 04 · Data Model

Postgres as the sole store. JSONB for flexible fields, `pgvector` for taste/genre vectors so similarity search is a native indexed query, not application-level math.

```
Film        { id, tmdb_id, title, type, release_date, runtime_min, genres[], source }
FilmVector  { film_id, weights vector(N), method: order_heuristic | llm }   # pgvector column
Grouping    { id, type: director|franchise|actor|studio, key, items[], filters }

User        { id, email, country_code, created_at }
WatchStatus { id, user_id, film_id, status, season_number, progress, watched_at }

TasteVector    { user_id, vector vector(N), updated_at }                   # pgvector column
GenrePairScore { user_id, genre_a, genre_b, score }

BadgeRule   { id, category, grouping_ref, filter, threshold, tier }
UserBadge   { user_id, badge_rule_id, tier, rarity_pct, earned_at, progress }

RecCache     { user_id, film_id, match_score, reason, method, computed_at }
RankSnapshot { metric, scope, user_id, value, rank, percentile }
ProfileTheme { user_id, accent, secondary, layout[], pinned_badges[], auto_generated }
ActivityEvent{ id, user_id, type, payload, created_at }
```

---

## 05 · Taste Engine (the hub)

Every other engine reads from this — one place to fix genre-weighting quality, one place negative signal is applied, one event triggers all four downstream updates.

```
        WatchStatus write (watched / watched_disliked)
                       │
                       ▼
                TASTE ENGINE  ← single source of truth
        (nudge incrementally on write,
         full recompute in weekend batch)
          │        │        │        │
          ▼        ▼        ▼        ▼
       Badges    Recs     Theme   Leaderboard
```

**Weighting formula** — computed once per film at ingestion:
```
weight(position i, total n) = (n - i) / sum(1..n)

affinity[genre] += Σ weight(genre) across watched films, normalized to 100%
affinity[genre] -= Σ weight(genre) across watched_disliked films × 1.5   # negative signal weighted heavier
```

**Recency decay** (from PRD):

| Watch age | Weight multiplier |
|---|---|
| < 30 days | 3.0× |
| < 90 days | 2.0× |
| < 1 year | 1.5× |
| older | 1.0× |

**Cold start:** vector considered "established" at ≥5 logged watches. Below that, serve trending + onboarding genre picks instead.

---

## 06 · Feature Engines

**Badges** — 5 categories: Completionist, Enthusiast, Explorer, Loyalty, Rank. Tiered bronze/silver/gold by threshold, *plus* a dynamic rarity label (Common → Legendary, by % of users who hold it). Evaluated incrementally on write — only badges touching that film's director/genre/franchise/actor, not a full scan of every rule per event.

**Recommendations** — content-based only for v1 (no collaborative filtering; needs scale Dex doesn't have yet). Candidate scoring via `pgvector` cosine similarity against `TasteVector`, plus a combo boost for top genre pairs and a penalty for disliked genres. 15–20% of the feed is reserved as diversity picks from weak dimensions.

**Leaderboards** — global + per-country, with a minimum of 50 active users per country before that scope goes live. Minimum 20 logged watches to appear (anti-gaming). Default view leads with a quality metric, not raw hours. Feeds the Rank badge category directly.

**Profile theme** — real-time evolution on dominant-genre shift, guarded by a 3–5 point margin to prevent flicker. Manual overrides freeze that field permanently (`auto_generated = false`).

---

## 07 · Architecture

**Real-time path:**
```
POST /watch-status → write → respond 200 immediately → async:
  nudge TasteVector → re-check relevant badges → re-rank cached recs
  → update theme if margin exceeded → write ActivityEvent for any hit
```

**Weekly batch** (Sat 02:00):
```
refresh Groupings from TMDB → full recompute: TasteVector, badge rarity %,
  recommendation candidates, RankSnapshot, Taste Twins matching*
```
*Taste Twins matching is precomputed here but the surfaced feature ships in Phase 2, per scope.*

**Read path:** a single aggregated `GET /profile/{id}` — Redis first, Postgres on cache miss. Avoids the frontend waterfalling five separate calls on page load.

---

## 08 · Tech Stack — $0 to launch

Every layer below runs on its **free tier**. Chosen for the strongest free option per layer, not the cheapest paid one.

| Layer | Choice | Free tier |
|---|---|---|
| Backend | FastAPI (Python) | open source, runs anywhere |
| Database | PostgreSQL 16 + pgvector | **Supabase free** — 500MB, pgvector included, pauses after 1wk idle |
| Cache / queue broker | Redis | **Upstash free** — 10K commands/day |
| Background jobs | Celery + Beat | open source, runs on the same free compute as the API |
| Search | Meilisearch | open source, **self-hosted** (not Meilisearch Cloud) |
| Frontend hosting | Next.js on Vercel | **Vercel Hobby (free)** — SSR + edge caching included |
| API/worker hosting | Render free web service | sleeps after 15min idle (cold-start tradeoff, see below) |
| Animation / charts | Framer Motion + Recharts | open source |
| Auth | Supabase Auth | included in the same free Supabase project |
| Catalog data | TMDB API | free with attribution, 40 req/10s |
| CDN / DNS | Cloudflare | free tier |
| Error tracking | Sentry | free tier — 5K events/month |
| CI/CD | GitHub Actions | free (unlimited public repos, 2,000 min/mo private) |

**Honest tradeoff:** Render's free tier sleeps, Upstash throttles at a few thousand commands/day. Neither blocks building or a beta launch — both are one-click paid upgrades ($5–10/mo) the moment real usage justifies it. Nothing here needs re-architecting to upgrade, just a plan change.

---

## 09 · API

| Endpoint | Purpose |
|---|---|
| `POST /watch-status` | Log/update a status; fires the taste-engine fan-out |
| `GET /profile/{id}` | Aggregated: taste vector, stats, badges, theme, recs, rank — one call |
| `GET /recommendations` | Ranked feed + diversity slice + match explanation |
| `GET /content/search` | Meilisearch-backed catalog search |
| `GET /leaderboard` | Filterable by metric + scope, current user always shown |
| `GET /activity` | Unified feed: badge unlocks, theme shifts, rank changes |

---

## 10 · Roadmap

| Phase | Weeks | Ships |
|---|---|---|
| Foundation | 1–3 | Auth, catalog ingestion, search |
| Taste Engine | 4–6 | Watch logging, vector compute — everything else depends on this |
| Recommendations | 7–8 | pgvector scoring, diversity slice, explanations |
| Gamification | 9–11 | Badges, leaderboards, rarity % |
| Theme + Polish | 12–14 | Auto-theming, profile cards, perf pass |
| Beta | 15–16 | QA, accessibility pass, launch |

---

## 11 · Decisions Reconciled

Every place the PRD and the earlier system design doc disagreed, resolved once, here:

| Decision | Resolution |
|---|---|
| **Profile theming cadence** | Real-time w/ margin guard wins over PRD's flat 24h delay — matches the explicit "keeps updating every time you watch" requirement. |
| **Batch cadence** | Weekly wins over PRD's daily — was an explicit earlier choice, and keeps compute inside free-tier limits. |
| **Backend language** | FastAPI wins over PRD's Node/tRPC — matches real prior experience, not a template assumption. |
| **SSR vs SPA** | Next.js SSR wins — the PRD's own 25% profile-share target needs working social preview cards, which a pure SPA undermines. |
| **Taste Twins / social** | Cut from v1 — conflicts with the PRD's explicit "prove single-player value first" scope call. Moved to Phase 2, where the PRD already had a slot for taste comparison. |
| **Badge rarity** | PRD's population-based rarity (Common→Legendary) layered *on top of* the design doc's category/tier structure — both kept, not either/or. |
| **Genre vector derivation** | Order-heuristic formula (§05) adopted — closes PRD Open Question #1, which was blocking. |
| **TV granularity** | Per-season status with series-level rollup — closes PRD Open Question #6. |
| **Enterprise NFRs** | SOC2, multi-AZ failover, 1B-row scale, full distributed tracing — deferred to a "Phase 2+ / at scale" appendix. |
| **Cost model** | Every layer swapped to its strongest *free* tier instead of paid defaults — $0 to build and run pre-launch, each with a clear upgrade trigger when a specific limit is actually hit. |

---

## 12 · Top Risks

| Risk | Mitigation |
|---|---|
| **Bus factor of 1** | Solo dev — mitigate with clean module boundaries and this doc staying current. |
| **Genre-vector accuracy** | Order-heuristic is a launch compromise. Every film's `method` field is tagged so LLM-based reprocessing can target the most-watched films first. |
| **Sparse negative signal** | Users may skip "disliked." Track logging rate in beta; add a post-watch nudge if <10% ever use it. |

---

*Dex — Blueprint v1.0 · reconciles Dex_PRD.md and the earlier system design conversation · this is the source of truth going forward*
