import { NextRequest, NextResponse } from "next/server";
import { runCatalogSync } from "@/lib/catalog-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/sync
 * Auth: Authorization: Bearer <CRON_SECRET>  OR  ?secret=
 * Vercel Cron hits this daily to pull new movies/series and probe TV.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : q;

  // Allow Vercel Cron header without secret if CRON_SECRET not set (dev)
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (secret && token !== secret && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runCatalogSync();
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    console.error("catalog sync", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
