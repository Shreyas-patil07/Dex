import React, { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';

type SearchResult = {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounce the search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/search?query=${encodeURIComponent(debouncedQuery.trim())}`, {
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch search results');
        return res.json();
      })
      .then(data => {
        setResults(data.results || []);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <div className="min-h-screen bg-transparent text-white">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="shrink-0">
            <img src="/DEXi.png" alt="Dex" className="h-10 w-22 object-contain" />
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="rounded-xl px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.03] hover:text-white">Trending</a>
            <a href="/profile" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]">Profile</a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-8 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-center mb-8">Search</h1>
          
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <input
              type="text"
              className="block w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 pl-12 text-[#E2E8F0] placeholder:text-[#64748B] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
              placeholder="Search for movies, TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
              </div>
            )}
          </div>

          <div className="mt-8">
            {error && <p className="text-center text-rose-400">{error}</p>}
            
            {!loading && debouncedQuery && results.length === 0 && !error && (
              <p className="text-center text-[#94A3B8]">No results found for "{debouncedQuery}".</p>
            )}

            {!debouncedQuery && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <Search className="h-12 w-12 text-[#64748B] mb-4" />
                <p className="text-[#94A3B8]">Enter a title to start searching</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 mt-6">
              {results.map(item => (
                <a
                  key={`${item.media_type}-${item.id}`}
                  href={`/${item.media_type}/${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', `/${item.media_type}/${item.id}`);
                    window.dispatchEvent(new Event('popstate'));
                  }}
                  className="group block"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/[0.05] border border-white/5 transition-colors group-hover:border-white/10 relative">
                    {item.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE}${item.poster_path}`}
                        alt={item.title || item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-white/40">
                        <span className="text-xs">No Poster</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white">
                      {item.media_type === 'movie' ? 'Movie' : 'TV'}
                    </div>
                  </div>
                  <div className="mt-2.5 px-0.5">
                    <h3 className="truncate font-medium text-[15px] group-hover:text-[#A78BFA] transition-colors">{item.title || item.name}</h3>
                    <p className="mt-0.5 text-xs text-[#94A3B8]">
                      {(item.release_date || item.first_air_date)?.slice(0, 4) || 'Unknown year'}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
