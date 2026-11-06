import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getCachedAuthState, subscribeToAuthSession } from '../lib/authSession';
import { apiFetch } from '../lib/api';
import { AlertCircle, Compass, Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react';

type Media = { id: number; media_type?: 'movie' | 'tv'; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number };
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';

const MIN_LOADING_MS = 800;

type RecommendationItem = {
  id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path?: string | null;
  release_date?: string | null;
  vote_average?: number;
  match_percent?: number | null;
  match_semantics?: string;
  reasons: string[];
};
type RecommendationResponse = {
  personalized: boolean;
  match_score_semantics: string;
  profile_status: {
    watched_titles: number;
    metadata_ready_titles: number;
    pending_titles: number;
    backfill_complete: boolean;
  };
  recent_profile?: {
    half_life_days: number;
    recently_weighted_titles: number;
    all_time_blend: number;
    recent_blend: number;
  };
  slots: {
    safe: RecommendationItem | null;
    adjacent: RecommendationItem | null;
    wildcard: RecommendationItem | null;
  };
};
type BackfillResponse = {
  scanned: number;
  enriched: number;
  skipped: number;
  pending: number;
  pending_watch_ids: string[];
  next_cursor: string | null;
  complete: boolean;
};

async function loadRecommendations(currentUser: User, signal?: AbortSignal): Promise<RecommendationResponse> {
  const response = await apiFetch('/api/recommendations', { signal }, currentUser);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Could not load recommendations.');
  return data as RecommendationResponse;
}

const RecommendationCard: React.FC<{
  item: RecommendationItem | null;
  slot: 'Safe' | 'Adjacent' | 'Wildcard';
  description: string;
  tone: string;
}> = ({ item, slot, description, tone }) => (
  <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#171727]/90 via-[#10101B] to-[#0A0A12]">
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${tone}`}>{slot}</p>
        <p className="mt-1 text-xs text-[#778399]">{description}</p>
      </div>
      <Compass size={16} className={tone} />
    </div>
    {item ? (
      <a href={`/${item.media_type}/${item.id}`} className="group flex gap-4 p-4">
        <div className="h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08]">
          {item.poster_path
            ? <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt={`${item.title} poster`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            : <div className="flex h-full items-center justify-center text-xs text-[#64748B]">No poster</div>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
            {item.release_date && <span>· {item.release_date.slice(0, 4)}</span>}
            {typeof item.vote_average === 'number' && item.vote_average > 0 && <span>· ★ {item.vote_average.toFixed(1)}</span>}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-white group-hover:text-[#C4B5FD]">{item.title}</h3>
          {item.match_percent !== null && item.match_percent !== undefined && (
            <p title={item.match_semantics} className="mt-2 text-xs font-semibold text-emerald-300">Match percentile: {item.match_percent}/100</p>
          )}
          <div className="mt-auto space-y-1 pt-3">
            {item.reasons.slice(0, 2).map((reason, index) => (
              <p key={index} className="line-clamp-2 text-[11px] leading-relaxed text-[#8994A8]">{reason}</p>
            ))}
            <p className="pt-1 text-xs font-semibold text-[#C4B5FD]">Explore title →</p>
          </div>
        </div>
      </a>
    ) : (
      <div className="flex min-h-48 items-center justify-center px-5 py-8 text-center text-xs text-[#64748B]">Not enough candidate titles yet. Add more watched titles or refresh recommendations.</div>
    )}
  </article>
);



const MediaGrid: React.FC<{ items: Media[] }> = ({ items }) => (
  <section className="mt-7 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
    {items.map(item => {
      const title = item.title || item.name || 'Untitled';
      const date = item.release_date || item.first_air_date || '';
      const mediaPath = `/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`;
      return (
        <article key={`${item.media_type || 'media'}-${item.id}`} className="group rounded-xl p-1.5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.025] hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <a href={mediaPath} aria-label={`View ${title}`} className="block">
            <div className="overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/[0.055] transition-all duration-300 group-hover:ring-[#8B5CF6]/25">
              {item.poster_path ? (
                <img src={`${TMDB_IMAGE}${item.poster_path}`} alt={title} loading="lazy" className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-sm text-[#64748B]">No poster</div>
              )}
            </div>
            <h2 className="mt-3 truncate text-sm font-semibold group-hover:text-white">{title}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]">
              <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
              {date && <span>• {date.slice(0, 4)}</span>}
              {typeof item.vote_average === 'number' && item.vote_average > 0 && <span>• {item.vote_average.toFixed(1)}</span>}
            </div>
          </a>
        </article>
      );
    })}
  </section>
);
export const HomePage: React.FC = () => {
  const [items, setItems] = useState<Media[]>([]);
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>('week');
  const [type, setType] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [sessionKnownSignedIn, setSessionKnownSignedIn] = useState(getCachedAuthState() === 'signed_in');
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [backfillCursor, setBackfillCursor] = useState<string | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillError, setBackfillError] = useState('');
  const [backfillResult, setBackfillResult] = useState<BackfillResponse | null>(null);

  useEffect(() => subscribeToAuthSession((currentUser) => { setUser(currentUser); setSessionKnownSignedIn(currentUser !== null); }), []);

  useEffect(() => {
    if (!user) {
      setRecommendations(null);
      setRecommendationsLoading(false);
      setRecommendationError('');
      setBackfillCursor(null);
      setBackfillResult(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setRecommendationsLoading(true);
    setRecommendationError('');
    loadRecommendations(user, controller.signal)
      .then(data => { if (active) setRecommendations(data); })
      .catch(err => {
        if (active && err instanceof Error && err.name !== 'AbortError') {
          setRecommendationError(err.message);
        }
      })
      .finally(() => { if (active) setRecommendationsLoading(false); });

    return () => { active = false; controller.abort(); };
  }, [user]);


  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const normalizedQuery = debouncedSearchQuery.trim();
    if (!normalizedQuery) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    const params = new URLSearchParams({
      query: normalizedQuery,
      media_type: "all",
    });
    setSearchLoading(true);
    setSearchError('');

    apiFetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Search is temporarily unavailable. Please try again.');
        return response.json();
      })
      .then(data => {
        if (active) setSearchResults(Array.isArray(data.results) ? data.results : []);
      })
      .catch(err => {
        if (active && err instanceof Error && err.name !== 'AbortError') {
          setSearchError(err.message);
        }
      })
      .finally(() => {
        if (active) setSearchLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const startedAt = performance.now();
    setLoading(true); setError(''); setItems([]);
    const waitForMinimumLoading = async () => { const remaining = Math.max(0, MIN_LOADING_MS - (performance.now() - startedAt)); if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining)); };
    const load = async () => {
      try {
        const response = await apiFetch(`/api/media/trending?media_type=${type}&time_window=${timeWindow}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load trending titles.');
        const data = await response.json();
        await waitForMinimumLoading(); if (!active) return;
        setItems(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if (!active || (err instanceof Error && err.name === 'AbortError')) return;
        await waitForMinimumLoading(); if (active) setError(err instanceof Error ? err.message : 'Could not load trending titles.');
      } finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; controller.abort(); };
  }, [type, timeWindow]);


  const runBackfillPage = async () => {
    if (!user || backfillLoading) return;
    setBackfillLoading(true);
    setBackfillError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (backfillCursor) params.set('cursor', backfillCursor);
      const response = await apiFetch(`/api/taste/backfill?${params.toString()}`, { method: 'POST' }, user);
      const data = await response.json().catch(() => ({})) as BackfillResponse & { detail?: string };
      if (!response.ok) throw new Error(data.detail || 'Could not build your taste profile.');
      setBackfillResult(data);
      setBackfillCursor(data.next_cursor);
      const refreshed = await loadRecommendations(user);
      setRecommendations(refreshed);
      if (refreshed.profile_status.backfill_complete) setBackfillCursor(null);
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not build your taste profile.');
    } finally {
      setBackfillLoading(false);
    }
  };

  const visible = useMemo(() => items.filter(item => item.poster_path).slice(0, 24), [items]);
  const isSignedIn = user !== null || sessionKnownSignedIn;
  const activeFilter = 'border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.045] text-[#B9A7E8]';
  const inactiveFilter = 'border-white/[0.055] bg-transparent text-[#8490A3] hover:border-white/[0.10] hover:bg-white/[0.018] hover:text-[#AEB7C7]';

  return <div className="min-h-screen bg-transparent text-white">
    <header className="border-b border-white/[0.06]"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:py-6"><a href="/"><img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" /></a><div className="flex items-center gap-2 sm:gap-5"><a href="/search" className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-[#C4B5FD] transition-colors hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/[0.07]"><Search className="h-4 w-4" />Search</a>{isSignedIn && <button type="button" onClick={() => document.getElementById('for-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-[#C4B5FD] transition-colors hover:bg-white/[0.04] sm:inline-flex">For You</button>}{isSignedIn ? <a href="/profile" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]">Profile</a> : <><a href="/sign-up" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7]">Login</a><a href="/sign-up" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white">Sign Up</a></>}</div></div></header>
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-6">
      <section className="mx-auto mb-7 max-w-4xl rounded-3xl border border-white/[0.07] bg-white/[0.025] px-5 py-3.5 sm:px-7 sm:py-4.5">
        <div className="mb-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#A78BFA]">Discover</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Search Movies / Series</h1>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-[#94A3B8]" />
          </div>
          <input
            type="search"
            aria-label="Search movies and series"
            className="block w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 pl-12 pr-12 text-[#E2E8F0] placeholder:text-[#64748B] outline-none transition-all focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
            placeholder="Search movies and series..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
          {(searchLoading || searchQuery.trim() !== debouncedSearchQuery.trim()) && searchQuery.trim() && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4" aria-label="Searching">
              <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
            </div>
          )}
          {!searchLoading && searchQuery && searchQuery.trim() === debouncedSearchQuery.trim() && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#94A3B8] transition-colors hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {isSignedIn && !searchQuery.trim() && (
        <section id="for-you" className="mb-12 scroll-mt-6" aria-labelledby="for-you-heading">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#A78BFA]">
                <Sparkles size={16} />
                <p className="text-xs font-bold uppercase tracking-[0.24em]">Personalized discovery</p>
              </div>
              <h2 id="for-you-heading" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Picked for your taste</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#8994A8]">Three ways to find your next movie or series, based on what you watch and rate.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!user) return;
                setRecommendationsLoading(true);
                setRecommendationError('');
                loadRecommendations(user)
                  .then(setRecommendations)
                  .catch(err => setRecommendationError(err instanceof Error ? err.message : 'Could not refresh recommendations.'))
                  .finally(() => setRecommendationsLoading(false));
              }}
              disabled={recommendationsLoading || !user}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-[#CBD5E1] transition-colors hover:border-[#A78BFA]/30 hover:text-white disabled:cursor-wait disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw size={14} className={recommendationsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {recommendationsLoading && !recommendations && (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]" />)}
            </div>
          )}

          {recommendationError && (
            <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4 text-sm text-rose-200">
              <AlertCircle size={17} className="mt-0.5 shrink-0" /> {recommendationError}
            </div>
          )}

          {recommendations && (
            <>
              {!recommendations.profile_status.backfill_complete && recommendations.profile_status.watched_titles > 0 && (
                <div className="mb-5 rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><Sparkles size={18} /></div>
                      <div>
                        <p className="font-semibold text-white">Finish building your taste profile</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#9AA5B8]">
                          {recommendations.profile_status.pending_titles} watched {recommendations.profile_status.pending_titles === 1 ? 'title needs' : 'titles need'} metadata. Process up to 50 at a time. This does not change your watch statuses.
                        </p>
                        {backfillResult && <p className="mt-2 text-[11px] text-[#A78BFA]">Last batch: {backfillResult.enriched} enriched · {backfillResult.skipped} already ready · {backfillResult.pending} temporarily unavailable</p>}
                        {backfillError && <p role="alert" className="mt-2 text-xs text-rose-300">{backfillError}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={runBackfillPage}
                      disabled={backfillLoading || !user}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:cursor-wait disabled:opacity-60"
                    >
                      {backfillLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {backfillLoading ? 'Building profile…' : backfillCursor ? 'Continue setup' : backfillResult?.pending ? 'Retry unavailable titles' : 'Build my taste profile'}
                    </button>
                  </div>
                </div>
              )}

              {recommendations.profile_status.watched_titles === 0 && (
                <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-[#AAB4C4]">
                  Mark a few titles as <span className="font-semibold text-emerald-300">Watched</span> and rate them to make these recommendations personal.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <RecommendationCard item={recommendations.slots.safe} slot="Safe" description="Closest to your proven taste" tone="text-emerald-300" />
                <RecommendationCard item={recommendations.slots.adjacent} slot="Adjacent" description="Familiar, with a new angle" tone="text-violet-300" />
                <RecommendationCard item={recommendations.slots.wildcard} slot="Wildcard" description="Explore beyond your usual picks" tone="text-sky-300" />
              </div>
              <div className="mt-3 flex flex-col gap-1 text-[10px] text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
                <p>{recommendations.match_score_semantics}</p>
                {recommendations.recent_profile && <p>Recent taste uses a {recommendations.recent_profile.half_life_days}-day half-life.</p>}
              </div>
            </>
          )}
        </section>
      )}

      {searchQuery.trim() ? (
        <section aria-live="polite">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">Search results</p>
              <p className="mt-1 text-sm text-[#94A3B8]">Movies and series matching “{searchQuery.trim()}”</p>
            </div>
            <button type="button" onClick={() => setSearchQuery("")} className="self-start rounded-lg px-3 py-2 text-sm text-[#A78BFA] transition-colors hover:bg-white/[0.04] sm:self-auto">Back to Trending</button>
          </div>
          {searchError && <div role="alert" className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-sm text-red-200">{searchError}</div>}
          {(searchLoading || searchQuery.trim() !== debouncedSearchQuery.trim()) && (
            <section aria-label="Loading search results" className="mt-7 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, index) => <div key={index}><div className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.07]" /><div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" /></div>)}
            </section>
          )}
          {!searchLoading && searchQuery.trim() === debouncedSearchQuery.trim() && !searchError && searchResults.length === 0 && (
            <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-[#94A3B8]">No matching titles found. Try another search or category.</div>
          )}
          {!searchLoading && !searchError && searchResults.length > 0 && searchQuery.trim() === debouncedSearchQuery.trim() && <MediaGrid items={searchResults} /> }
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]/70" /><p className="text-base font-semibold uppercase tracking-[0.28em] text-[#A78BFA]">Trending 🔥</p></div>
            <div className="flex flex-wrap gap-2">
              {(["day", "week"] as const).map(value => <button key={value} onClick={() => setTimeWindow(value)} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${timeWindow === value ? activeFilter : inactiveFilter}`}>{value === "day" ? "Today" : "This week"}</button>)}
              {(["all", "movie", "tv"] as const).map(value => <button key={value} onClick={() => setType(value)} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${type === value ? activeFilter : inactiveFilter}`}>{value === "all" ? "All" : value === "movie" ? "Movies" : "Series"}</button>)}
            </div>
          </div>
          {loading && <section aria-label="Loading trending titles" className="mt-7 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 24 }, (_, index) => <div key={index}><div className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.07]" /><div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" /><div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-white/[0.05]" /></div>)}</section>}
          {!loading && error && <div role="alert" className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-sm text-red-200">{error}</div>}
          {!loading && !error && visible.length === 0 && <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-[#94A3B8]">No trending titles are available right now.</div>}
          {!loading && !error && visible.length > 0 && <MediaGrid items={visible} /> }
        </>
      )}
    </main>
    <footer className="border-t border-white/[0.06] px-6 py-6"><div className="mx-auto flex max-w-7xl justify-between text-xs text-[#64748B]"><span>© 2026 Dex. All rights reserved.</span><div className="flex gap-5"><a href="/about-me">About</a><a href="/privacy-policy">Privacy Policy</a><a href="/terms-of-service">Terms of Service</a><a href="mailto:systemrecord07@gmail.com">Contact</a></div></div></footer>
  </div>;
};
