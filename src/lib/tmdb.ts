/** TMDB helpers for real movie/TV posters */

export const TMDB_API_KEY = "a0d71cffe2d6693d462af9e4f336bc06";
export const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export function isValidPosterUrl(url?: string | null): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  // Truncated TMDB hashes are ~10 chars — real ones are 27+
  if (url.includes("image.tmdb.org")) {
    const file = url.split("/").pop() || "";
    if (file.length < 20) return false;
  }
  return true;
}

export async function tmdbPosterById(
  tmdbId: string | number,
  media: "movie" | "tv" = "movie"
): Promise<string | null> {
  try {
    const url = `https://api.themoviedb.org/3/${media}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.poster_path) return `${TMDB_IMG}${data.poster_path}`;
  } catch (e) {
    console.error("tmdbPosterById", tmdbId, e);
  }
  return null;
}

export async function tmdbPosterByTitle(
  title: string,
  media: "movie" | "tv" = "movie",
  year?: number
): Promise<string | null> {
  const term = (title || "").trim();
  if (!term) return null;
  try {
    const q = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: term,
    });
    if (year) q.set("year", String(year));
    const url = `https://api.themoviedb.org/3/search/${media}?${q}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = (data?.results || [])[0];
    if (row?.poster_path) return `${TMDB_IMG}${row.poster_path}`;
  } catch (e) {
    console.error("tmdbPosterByTitle", term, e);
  }
  return null;
}

/** Prefer valid existing URL, else TMDB by id, else by title */
export async function resolvePoster(opts: {
  existing?: string | null;
  tmdbId?: string | number | null;
  title?: string;
  year?: number;
  media?: "movie" | "tv";
}): Promise<string | null> {
  const media = opts.media || "movie";
  if (isValidPosterUrl(opts.existing)) return opts.existing!;
  if (opts.tmdbId) {
    const byId = await tmdbPosterById(opts.tmdbId, media);
    if (byId) return byId;
  }
  if (opts.title) {
    return tmdbPosterByTitle(opts.title, media, opts.year);
  }
  return null;
}
