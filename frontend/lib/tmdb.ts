/**
 * TMDB API client — server-only utility.
 *
 * Uses the Read Access Token (Bearer auth) — the modern TMDB auth method.
 * This file is NEVER imported by "use client" components directly.
 * All browser-facing data goes through /api/tmdb/* proxy routes.
 *
 * Image URLs (per style guide §15):
 *   Poster:   https://image.tmdb.org/t/p/w500/{poster_path}
 *   Backdrop: https://image.tmdb.org/t/p/w1280/{backdrop_path}
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// note: TMDB_READ_TOKEN is server-only — no NEXT_PUBLIC prefix
function getHeaders() {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Fetch wrapper — throws on non-2xx */
async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    // next: { revalidate: 3600 } — cache for 1 hour on Vercel edge
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Image URL helpers ────────────────────────────────────────────────────

export function posterUrl(path: string | null, size: "w342" | "w500" | "original" = "w500") {
  if (!path) return "https://picsum.photos/seed/placeholder/300/450";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w1280") {
  if (!path) return "https://picsum.photos/seed/placeholder/1280/720";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// ─── Response shape types ─────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;          // "2024-03-01"
  vote_average: number;          // 0-10
  vote_count: number;
  genre_ids: number[];
  media_type?: "movie";
  popularity: number;
}

export interface TMDBShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: "tv";
  popularity: number;
}

export type TMDBMedia = (TMDBMovie | TMDBShow) & { media_type: "movie" | "tv" };

interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// ─── Genre map (TMDB genre IDs → names) ───────────────────────────────────
// Cached locally to avoid extra API calls on every request
const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
  // TV genres
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics",
};

export function genreNames(ids: number[]): string[] {
  return ids.slice(0, 3).map((id) => GENRE_MAP[id] ?? "Unknown").filter(Boolean);
}

// ─── API methods ──────────────────────────────────────────────────────────

/** Trending this week — movies + TV mixed */
export async function getTrending(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMedia>>(
    `/trending/all/${timeWindow}`,
    { language: "en-US" }
  );
}

/** Trending movies only */
export async function getTrendingMovies() {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    "/trending/movie/week",
    { language: "en-US" }
  );
}

/** Trending TV shows only */
export async function getTrendingShows() {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShow>>(
    "/trending/tv/week",
    { language: "en-US" }
  );
}

/** Popular movies */
export async function getPopularMovies() {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    "/movie/popular",
    { language: "en-US", page: "1" }
  );
}

/** Popular TV shows */
export async function getPopularShows() {
  return tmdbFetch<TMDBPaginatedResponse<TMDBShow>>(
    "/tv/popular",
    { language: "en-US", page: "1" }
  );
}

/** Multi search — movies + TV + people */
export async function searchMulti(query: string) {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMedia>>(
    "/search/multi",
    { query, language: "en-US", page: "1", include_adult: "false" }
  );
}

/** Movie details */
export async function getMovie(id: number) {
  return tmdbFetch<TMDBMovie & { runtime: number; genres: { id: number; name: string }[] }>(
    `/movie/${id}`,
    { language: "en-US" }
  );
}

/** TV show details */
export async function getShow(id: number) {
  return tmdbFetch<TMDBShow & { number_of_episodes: number; genres: { id: number; name: string }[] }>(
    `/tv/${id}`,
    { language: "en-US" }
  );
}
