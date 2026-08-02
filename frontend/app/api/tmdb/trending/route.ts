/**
 * GET /api/tmdb/trending
 *
 * Proxies TMDB trending/all/week to the browser.
 * The TMDB_READ_TOKEN lives only on the server — never exposed to the client.
 *
 * Response shape used by Discover page:
 * { results: NormalizedMedia[] }
 */

import { NextResponse } from "next/server";
import {
  getTrending,
  posterUrl,
  backdropUrl,
  genreNames,
} from "@/lib/tmdb";

export interface NormalizedMedia {
  id: string;
  title: string;
  type: "movie" | "series";
  year: number;
  genres: string[];
  poster: string;
  backdrop: string;
  tmdbRating: number;
  synopsis: string;
  tmdbId: number;
}

function normalize(item: Awaited<ReturnType<typeof getTrending>>["results"][number]): NormalizedMedia | null {
  // Skip people results
  if (!("title" in item || "name" in item)) return null;

  const isMovie = item.media_type === "movie";
  const title = isMovie
    ? (item as { title: string }).title
    : (item as { name: string }).name;

  const dateStr = isMovie
    ? (item as { release_date: string }).release_date
    : (item as { first_air_date: string }).first_air_date;

  const year = dateStr ? parseInt(dateStr.split("-")[0]) : 0;

  return {
    id: `tmdb-${item.id}`,
    title,
    type: isMovie ? "movie" : "series",
    year,
    genres: genreNames(item.genre_ids ?? []),
    poster: posterUrl(item.poster_path),
    backdrop: backdropUrl(item.backdrop_path),
    tmdbRating: Math.round(item.vote_average * 10) / 10,
    synopsis: item.overview,
    tmdbId: item.id,
  };
}

export async function GET() {
  try {
    const data = await getTrending("week");

    const results = data.results
      .map(normalize)
      .filter((x): x is NormalizedMedia => x !== null)
      .slice(0, 12); // cap at 12 for the discover grid

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/tmdb/trending]", err);
    return NextResponse.json(
      { error: "Failed to fetch trending data" },
      { status: 500 }
    );
  }
}
