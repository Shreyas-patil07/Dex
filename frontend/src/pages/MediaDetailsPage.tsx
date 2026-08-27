import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, CalendarDays, Clock3 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w1280';

export const MediaDetailsPage: React.FC = () => {
  const match = window.location.pathname.match(/^\/(movie|tv)\/(\d+)$/);
  const mediaType = match?.[1] as 'movie' | 'tv' | undefined;
  const tmdbId = match?.[2];
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mediaType || !tmdbId) {
      setError('Media not found.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
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

  if (loading) {
    return <div className="min-h-screen bg-transparent text-white"><main className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 h-10 w-28 animate-pulse rounded-lg bg-white/[0.06]" /><div className="grid gap-8 lg:grid-cols-[320px_1fr]"><div className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[0.07]" /><div className="space-y-5"><div className="h-10 w-2/3 animate-pulse rounded bg-white/[0.07]" /><div className="h-5 w-1/3 animate-pulse rounded bg-white/[0.05]" /><div className="h-28 w-full animate-pulse rounded bg-white/[0.05]" /></div></div></main></div>;
  }

  if (error || !item) {
    return <div className="min-h-screen bg-transparent text-white"><main className="mx-auto max-w-7xl px-6 py-10"><button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white"><ArrowLeft size={16} /> Back</button><div className="mt-12 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-[#94A3B8]">{error || 'Media not found.'}</div></main></div>;
  }

  const title = item.title || item.name || 'Untitled';
  const date = item.release_date || item.first_air_date || '';
  const runtime = item.runtime || (item.episode_run_time?.[0] ?? null);
  const genres = (item.genres || []).map((genre: any) => genre.name).join(' • ');
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
    </main>
  </div>;
};
