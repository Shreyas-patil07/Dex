import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getCachedAuthState, subscribeToAuthSession } from '../lib/authSession';

type Media = { id: number; media_type?: 'movie' | 'tv'; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number };
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MIN_LOADING_MS = 800;

export const HomePage: React.FC = () => {
  const [items, setItems] = useState<Media[]>([]);
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>('week');
  const [type, setType] = useState<'all' | 'movie' | 'tv'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [sessionKnownSignedIn, setSessionKnownSignedIn] = useState(getCachedAuthState() === 'signed_in');

  useEffect(() => subscribeToAuthSession((currentUser) => { setUser(currentUser); setSessionKnownSignedIn(currentUser !== null); }), []);

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
    <header className="border-b border-white/[0.06]"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:py-6"><a href="/"><img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" /></a><div className="flex items-center gap-3 sm:gap-5">{isSignedIn ? <a href="/profile" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]">Profile</a> : <><a href="/sign-up" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7]">Login</a><a href="/sign-up" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white">Sign Up</a></>}</div></div></header>
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]/70" /><p className="text-base font-semibold uppercase tracking-[0.28em] text-[#A78BFA]">Trending 🔥</p></div>
        <div className="flex flex-wrap gap-2">{(['day','week'] as const).map(value => <button key={value} onClick={() => setTimeWindow(value)} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${timeWindow === value ? activeFilter : inactiveFilter}`}>{value === 'day' ? 'Today' : 'This week'}</button>)}{(['all','movie','tv'] as const).map(value => <button key={value} onClick={() => setType(value)} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${type === value ? activeFilter : inactiveFilter}`}>{value === 'all' ? 'All' : value === 'movie' ? 'Movies' : 'Series'}</button>)}</div>
      </div>
      {loading && <section aria-label="Loading trending titles" className="mt-7 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 24 }, (_, i) => <div key={i} className="overflow-hidden"><div className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.07]" /><div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" /><div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-white/[0.05]" /></div>)}</section>}
      {!loading && error && <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-sm text-red-200">{error}</div>}
      {!loading && !error && visible.length === 0 && <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-[#94A3B8]">No trending titles are available right now.</div>}
      {!loading && !error && visible.length > 0 && <section className="mt-7 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{visible.map(item => { const title = item.title || item.name || 'Untitled'; const date = item.release_date || item.first_air_date || ''; return <article key={`${item.media_type || 'media'}-${item.id}`} className="group rounded-xl p-1.5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.025] hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]"><div className="overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/[0.055] transition-all duration-300 group-hover:ring-[#8B5CF6]/25"><img src={`${TMDB_IMAGE}${item.poster_path}`} alt={title} loading="lazy" className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" /></div><h2 className="mt-3 truncate text-sm font-semibold">{title}</h2><div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]"><span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>{date && <span>• {date.slice(0,4)}</span>}{typeof item.vote_average === 'number' && item.vote_average > 0 && <span>• {item.vote_average.toFixed(1)}</span>}</div></article>; })}</section>}
    </main>
    <footer className="border-t border-white/[0.06] px-6 py-6"><div className="mx-auto flex max-w-7xl justify-between text-xs text-[#64748B]"><span>© 2026 Dex. All rights reserved.</span><div className="flex gap-5"><a href="/about-me">About</a><a href="/privacy-policy">Privacy Policy</a><a href="/terms-of-service">Terms of Service</a><a href="mailto:systemrecord07@gmail.com">Contact</a></div></div></footer>
  </div>;
};
