import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({
        results: [],
        error: "TMDB_API_KEY haijawekwa kwenye Vercel",
      });
    }

    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "zh"; // zh = Chinese, hi = Hindi
    const genre = searchParams.get("genre") || "28"; // 28 = Action
    const page = searchParams.get("page") || "1";

    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_original_language=${lang}&with_genres=${genre}&sort_by=popularity.desc&page=${page}&include_adult=false`;

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
        // metadata only – no illegal stream URL
      })
    );

    return NextResponse.json({ results, source: "tmdb" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ results: [], error: "TMDB error" }, { status: 500 });
  }
}
