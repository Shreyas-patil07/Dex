import React, { useEffect, useMemo, useState } from 'react';

type Media = {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const TrendingPage: React.FC = () => {
  const [items, setItems] = useState<Media[]>([]);
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>('week');
  const [type, setType] = useState<'all' | 'movie' | 'tv'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/media/trending?media_type=${type}&time_window=${timeWindow}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load trending titles.');
        return response.json();
      })
      .then((data) => setItems(data.results ?? []))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [type, timeWindow]);

  const visible = useMemo(() => items.filter((item) => item.poster_path).slice(0, 24), [items]);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:py-6">
          <a href="/" aria-label="Dex home">
            <img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" />
          </a>
          <div className="flex items-center gap-3 sm:gap-5">
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7] transition-colors hover:text-[#C084FC]">
              Login
            </button>
            <button className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9]">
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-lg font-semibold uppercase tracking-[0.2em] text-[#A855F7]">Dex Discover</p>

          <div className="flex flex-wrap gap-2">
            {(['day', 'week'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTimeWindow(value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  timeWindow === value
                    ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                    : 'border-white/[0.08] text-[#94A3B8] hover:border-white/[0.16] hover:text-white'
                }`}
              >
                {value === 'day' ? 'Today' : 'This week'}
              </button>
            ))}

            {(['all', 'movie', 'tv'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  type === value
                    ? 'border-[#A855F7]/70 bg-[#A855F7]/10 text-[#D8B4FE]'
                    : 'border-white/[0.08] text-[#94A3B8] hover:border-white/[0.16] hover:text-white'
                }`}
              >
                {value === 'all' ? 'All' : value === 'movie' ? 'Movies' : 'Series'}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 24 }, (_, index) => (
              <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.06]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-12 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-sm text-red-200">
            {error} Make sure the FastAPI server is running and TMDB_API_KEY is configured.
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="mt-12 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-10 text-center text-[#94A3B8]">
            No trending titles are available right now.
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <section className="mt-12 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((item) => {
              const title = item.title || item.name || 'Untitled';
              const date = item.release_date || item.first_air_date || '';

              return (
                <article key={`${item.media_type || 'media'}-${item.id}`} className="group">
                  <div className="overflow-hidden rounded-xl bg-white/[0.05]">
                    <img
                      src={`${TMDB_IMAGE}${item.poster_path}`}
                      alt={title}
                      loading="lazy"
                      className="aspect-[2/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                  </div>
                  <h2 className="mt-3 truncate text-sm font-semibold">{title}</h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]">
                    <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                    {date && <span>• {date.slice(0, 4)}</span>}
                    {typeof item.vote_average === 'number' && item.vote_average > 0 && (
                      <span>• {item.vote_average.toFixed(1)}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <footer className="border-t border-white/[0.06] px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-[#64748B] sm:flex-row">
          <span>© 2026 Dex. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <a href="/privacy-policy" className="transition-colors hover:text-[#94A3B8]">Privacy Policy</a>
            <a href="/terms-of-service" className="transition-colors hover:text-[#94A3B8]">Terms of Service</a>
            <a href="mailto:systemrecord07@gmail.com" className="transition-colors hover:text-[#94A3B8]">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
