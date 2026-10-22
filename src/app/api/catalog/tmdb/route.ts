import { NextResponse } from "next/server";

// Fallback key from Movian Media Center APK
const TMDB_KEY =
  process.env.TMDB_API_KEY || "a0d71cffe2d6693d462af9e4f336bc06";

export async function GET(req: Request) {
  try {
    if (!TMDB_KEY) {
      return NextResponse.json({
        results: [],
        error: "TMDB_API_KEY haijawekwa",
      });
    }

    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const genre = searchParams.get("genre") || "";
    const page = searchParams.get("page") || "1";
    const sort = searchParams.get("sort") || "popularity.desc";

    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=${lang}&sort_by=${sort}&page=${page}&include_adult=false`;
    if (genre) url += `&with_genres=${genre}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ results: [], error: "TMDB failed" }, { status: 502 });
    }

    const data = await res.json();
    const results = (data.results || []).map(
      (m: {
        id: number;
        title: string;
        overview: string;
        poster_path: string | null;
        release_date: string;
      }) => ({
        tmdbId: m.id,
        title: m.title,
        overview: m.overview,
        coverUrl: m.poster_path
          ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : null,
        year: m.release_date ? m.release_date.slice(0, 4) : null,
      })
    );

    return NextResponse.json({ results, source: "tmdb", total: data.total_results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ results: [], error: "TMDB error" }, { status: 500 });
  }
}
