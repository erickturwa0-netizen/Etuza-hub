import { NextResponse } from "next/server";
import { fetchMovieCover, movieCover } from "@/lib/covers";

export const dynamic = "force-dynamic";

/** GET /api/covers/movie?title=Inception — iTunes artwork */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "").trim();
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  // Try movie first, then TV show art for series-like titles
  let cover = await fetchMovieCover(title, { media: "movie" });
  if (!cover) cover = await fetchMovieCover(title, { media: "tvShow" });
  if (!cover) cover = movieCover(title);

  return NextResponse.json(
    { title, cover },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
