import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPosterUrl, resolvePoster } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/covers/fix-movies
 * Re-fetches real TMDB posters for movies with missing/broken covers.
 * Optional: ?limit=40&secret=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  try {
    const all = await prisma.content.findMany({
      where: { type: "movie", status: "published" },
      select: { id: true, title: true, coverUrl: true, linkUrl: true, category: true },
      take: 500,
    });

    const broken = all.filter((c) => !isValidPosterUrl(c.coverUrl)).slice(0, limit);
    let fixed = 0;

    for (const c of broken) {
      // Extract tmdb id from vidsrc link
      const m = (c.linkUrl || "").match(/\/movie\/(\d+)/);
      const tmdbId = m?.[1];
      const yearM = (c.category || "").match(/(20\d{2}|19\d{2})/);
      const year = yearM ? parseInt(yearM[1], 10) : undefined;

      const poster = await resolvePoster({
        existing: c.coverUrl,
        tmdbId,
        title: c.title,
        year,
        media: "movie",
      });

      if (poster && poster !== c.coverUrl) {
        await prisma.content.update({
          where: { id: c.id },
          data: { coverUrl: poster },
        });
        fixed++;
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: all.length,
      broken: broken.length,
      fixed,
    });
  } catch (e) {
    console.error("fix-movies", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
