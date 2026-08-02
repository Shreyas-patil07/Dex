/**
 * GET /api/tmdb/search?q=query
 *
 * Proxies TMDB /search/multi to the browser for the List page search.
 * Returns movies and TV shows only (filters out people).
 */

import { NextResponse } from "next/server";
import { searchMulti, posterUrl, backdropUrl, genreNames } from "@/lib/tmdb";
import type { NormalizedMedia } from "../trending/route";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchMulti(query);

    const results = data.results
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item): NormalizedMedia | null => {
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
      })
      .filter((x): x is NormalizedMedia => x !== null)
      .slice(0, 10);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/tmdb/search]", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
