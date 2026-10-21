import { NextRequest, NextResponse } from "next/server";
import { runCatalogSync, syncNewMovies, syncNewDrama, healthCheckTv } from "@/lib/catalog-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/sync
 * Body optional: { "scope": "all" | "movies" | "drama" | "tv" }
 * Header: x-admin-secret or Authorization Bearer
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  const header = req.headers.get("x-admin-secret") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : header;

  // If no secret configured, allow in non-production for testing
  if (secret && token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let scope = "all";
  try {
    const body = await req.json();
    if (body?.scope) scope = String(body.scope);
  } catch {
    /* empty body ok */
  }

  try {
    if (scope === "movies") {
      const r = await syncNewMovies();
      return NextResponse.json({ ok: true, scope, ...r });
    }
    if (scope === "drama") {
      const r = await syncNewDrama();
      return NextResponse.json({ ok: true, scope, ...r });
    }
    if (scope === "tv") {
      const r = await healthCheckTv();
      return NextResponse.json({
        ok: true,
        scope,
        tvLive: r.live.length,
        tvDead: r.dead,
        liveTitles: r.live.map((c) => c.title),
      });
    }
    const report = await runCatalogSync();
    return NextResponse.json({ ok: true, scope: "all", ...report });
  } catch (e) {
    console.error("admin sync", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    usage: "POST /api/admin/sync with { scope: all|movies|drama|tv }",
    auth: "x-admin-secret or Authorization: Bearer <CRON_SECRET>",
  });
}
