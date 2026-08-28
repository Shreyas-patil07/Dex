import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, Clock3, ExternalLink, ListPlus, LogIn, Star } from 'lucide-react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getCachedAuthState, subscribeToAuthSession } from '../lib/authSession';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w1280';

type Provider = { provider_id: number; provider_name: string; logo_path?: string | null };
type Media = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  vote_average?: number;
  genres?: { name: string }[];
  overview?: string;
  watch_providers?: {
    flatrate?: Provider[];
    rent?: Provider[];
    buy?: Provider[];
    link?: string;
  };
};

export const MediaDetailsPage: React.FC = () => {
  const match = window.location.pathname.match(/^\/(movie|tv)\/(\d+)$/);
  const mediaType = match?.[1] as 'movie' | 'tv' | undefined;
  const tmdbId = match?.[2];
  const [item, setItem] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [signedIn, setSignedIn] = useState(getCachedAuthState() === 'signed_in');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => subscribeToAuthSession((currentUser) => {
    setUser(currentUser);
    setSignedIn(currentUser !== null);
  }), []);

  useEffect(() => {
    if (!mediaType || !tmdbId) {
      setError('Media not found.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItem(null);
    setAdded(false);
    fetch(`${API_BASE}/api/media/${mediaType}/${tmdbId}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load this title.');
        return response.json();
      })
      .then(data => setItem(data))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [mediaType, tmdbId]);

  const isSignedIn = user !== null || signedIn;
  const title = item?.title || item?.name || 'Untitled';
  const providers = item?.watch_providers;
  const whereToWatch = useMemo(() => {
    const seen = new Set<number>();
    return [...(providers?.flatrate || []), ...(providers?.rent || []), ...(providers?.buy || [])].filter(provider => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    });
  }, [providers]);

  const addToList = async () => {
    if (!isSignedIn || !item || !mediaType || !tmdbId) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      window.location.assign('/sign-up');
      return;
    }
    setAdding(true);
    setListError('');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/api/watches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tmdb_id: Number(tmdbId),
          media_type: mediaType,
          title,
          status: 'want_to_watch',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409) {
        setAdded(true);
        return;
      }
      if (!response.ok) throw new Error(data.detail || 'Could not add this title to your list.');
      setAdded(true);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not add this title to your list.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-transparent text-white"><main className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 h-10 w-28 animate-pulse rounded-lg bg-white/[0.06]" /><div className="grid gap-8 lg:grid-cols-[320px_1fr]"><div className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[0.07]" /><div className="space-y-5"><div className="h-10 w-2/3 animate-pulse rounded bg-white/[0.07]" /><div className="h-5 w-1/3 animate-pulse rounded bg-white/[0.05]" /><div className="h-28 w-full animate-pulse rounded bg-white/[0.05]" /></div></div></main></div>;
  }

  if (error || !item) {
    return <div className="min-h-screen bg-transparent text-white"><main className="mx-auto max-w-7xl px-6 py-10"><button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white"><ArrowLeft size={16} /> Back</button><div className="mt-12 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-[#94A3B8]">{error || 'Media not found.'}</div></main></div>;
  }

  const date = item.release_date || item.first_air_date || '';
  const runtime = item.runtime || item.episode_run_time?.[0];
  const genres = (item.genres || []).map(genre => genre.name).join(' • ');
  const backdrop = item.backdrop_path ? `${TMDB_IMAGE}${item.backdrop_path}` : '';
  const poster = item.poster_path ? `${TMDB_IMAGE}${item.poster_path}` : '';

  return <div className="min-h-screen bg-transparent text-white">
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-8">
      <button onClick={() => window.history.back()} className="mb-8 inline-flex items-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-white"><ArrowLeft size={16} /> Back</button>
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]">
        {backdrop && <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${backdrop})` }} />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080810] via-[#080810]/95 to-[#080810]/55" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[280px_1fr] lg:p-10">
          {poster ? <img src={poster} alt={title} className="mx-auto aspect-[2/3] w-full max-w-[280px] rounded-2xl object-cover ring-1 ring-white/[0.08] lg:mx-0" /> : <div className="aspect-[2/3] w-full max-w-[280px] rounded-2xl bg-white/[0.06]" />}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A78BFA]">{mediaType === 'tv' ? 'Series' : 'Movie'}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#94A3B8]">
              {date && <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> {date.slice(0, 4)}</span>}
              {runtime && <span className="inline-flex items-center gap-2"><Clock3 size={15} /> {runtime} min</span>}
              {typeof item.vote_average === 'number' && <span className="inline-flex items-center gap-2"><Star size={15} /> {item.vote_average.toFixed(1)}</span>}
            </div>
            {genres && <p className="mt-4 text-sm text-[#CBD5E1]">{genres}</p>}
            <p className="mt-6 max-w-3xl leading-7 text-[#AAB4C4]">{item.overview || 'No synopsis available.'}</p>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A78BFA]">Where to watch</p><h2 className="mt-2 text-xl font-semibold">Available in India</h2></div>
          {providers?.link && <a href={providers.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-[#94A3B8] hover:text-white">More options <ExternalLink size={13} /></a>}
        </div>
        {whereToWatch.length > 0 ? <div className="mt-5 flex flex-wrap gap-4">{whereToWatch.map(provider => <div key={provider.provider_id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"><img src={provider.logo_path ? `https://image.tmdb.org/t/p/w92${provider.logo_path}` : ''} alt="" className="h-8 w-8 rounded-lg object-cover" /><span className="text-sm text-[#E2E8F0]">{provider.provider_name}</span></div>)}</div> : <p className="mt-5 text-sm text-[#64748B]">No streaming availability is listed for India right now.</p>}
        <p className="mt-4 text-xs text-[#475569]">Availability can vary by location and subscription. Data provided by TMDB.</p>
      </section>

      <section className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={addToList} disabled={!isSignedIn || adding || added} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${added ? 'border border-[#2DD4BF]/25 bg-[#2DD4BF]/10 text-[#99F6E4]' : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'} disabled:cursor-default disabled:opacity-70`}>
          {added ? <Check size={17} /> : <ListPlus size={17} />}
          {added ? 'Added to list' : adding ? 'Adding…' : 'Add to list'}
        </button>
        {!isSignedIn && <a href="/sign-up" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-semibold text-[#CBD5E1] hover:border-white/[0.14] hover:text-white"><LogIn size={16} /> Sign in to add</a>}
        {listError && <p className="basis-full text-sm text-rose-300">{listError}</p>}
      </section>
    </main>
  </div>;
};
