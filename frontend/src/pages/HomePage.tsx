import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getCachedAuthState, subscribeToAuthSession } from '../lib/authSession';
import { Loader2, Search, X } from 'lucide-react';

type Media = { id: number; media_type?: 'movie' | 'tv'; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number };
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MIN_LOADING_MS = 800;


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

  useEffect(() => subscribeToAuthSession((currentUser) => { setUser(currentUser); setSessionKnownSignedIn(currentUser !== null); }), []);

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

    fetch(`${API_BASE}/api/search?${params.toString()}`, { signal: controller.signal })
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
        const response = await fetch(`${API_BASE}/api/media/trending?media_type=${type}&time_window=${timeWindow}`, { signal: controller.signal });
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

  const visible = useMemo(() => items.filter(item => item.poster_path).slice(0, 24), [items]);
  const isSignedIn = user !== null || sessionKnownSignedIn;
  const activeFilter = 'border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.045] text-[#B9A7E8]';
  const inactiveFilter = 'border-white/[0.055] bg-transparent text-[#8490A3] hover:border-white/[0.10] hover:bg-white/[0.018] hover:text-[#AEB7C7]';

  return <div className="min-h-screen bg-transparent text-white">
    <header className="border-b border-white/[0.06]"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:py-6"><a href="/"><img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" /></a><div className="flex items-center gap-2 sm:gap-5"><a href="/search" className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm font-medium text-[#C4B5FD] transition-colors hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/[0.07]"><Search className="h-4 w-4" />Search</a>{isSignedIn ? <a href="/profile" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]">Profile</a> : <><a href="/sign-up" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7]">Login</a><a href="/sign-up" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white">Sign Up</a></>}</div></div></header>
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
