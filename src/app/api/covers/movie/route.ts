import { NextResponse } from "next/server";
import { fetchMovieCover, movieCover } from "@/lib/covers";

export const dynamic = "force-dynamic";

/** GET /api/covers/movie?title=Inception — returns { cover } from iTunes */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "").trim();
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const cover = (await fetchMovieCover(title)) || movieCover(title);
  return NextResponse.json({ title, cover });
}
