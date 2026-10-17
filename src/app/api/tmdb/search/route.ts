import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "TMDB_API_KEY haijawekwa kwenye Vercel env", results: [] },
        { status: 200 }
      );
    }

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(q)}&language=en-US&page=1&include_adult=false`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: "TMDB request failed", results: [] }, { status: 502 });
    }

    const data = await res.json();
    const results = (data.results || []).slice(0, 8).map(
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

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Search failed", results: [] }, { status: 500 });
  }
}
