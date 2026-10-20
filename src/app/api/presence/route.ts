import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTIVE_MS = 90_000; // 90s = active

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "").slice(0, 80);
    const section = String(body.section || "other").slice(0, 40);
    const title = body.title ? String(body.title).slice(0, 200) : null;
    const path = body.path ? String(body.path).slice(0, 200) : null;
    if (!sessionId || !section) {
      return NextResponse.json({ error: "missing" }, { status: 400 });
    }

    await prisma.viewSession.upsert({
      where: { sessionId_section: { sessionId, section } },
      create: { sessionId, section, title, path, lastSeen: new Date() },
      update: { title, path, lastSeen: new Date() },
    });

    // cleanup old rows occasionally
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.viewSession.deleteMany({ where: { lastSeen: { lt: cutoff } } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("presence post", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET() {
  try {
    const since = new Date(Date.now() - ACTIVE_MS);
    const active = await prisma.viewSession.findMany({
      where: { lastSeen: { gte: since } },
      orderBy: { lastSeen: "desc" },
      take: 200,
    });

    const bySection: Record<string, number> = {};
    for (const a of active) {
      bySection[a.section] = (bySection[a.section] || 0) + 1;
    }

    const sections = ["movie", "music", "game", "tv", "radio", "drama"];
    const counts: Record<string, number> = {};
    for (const s of sections) counts[s] = bySection[s] || 0;

    return NextResponse.json({
      totalActive: active.length,
      counts,
      active: active.map((a) => ({
        section: a.section,
        title: a.title,
        path: a.path,
        lastSeen: a.lastSeen,
        minutesAgo: Math.max(
          0,
          Math.round((Date.now() - a.lastSeen.getTime()) / 60000)
        ),
      })),
    });
  } catch (e) {
    console.error("presence get", e);
    return NextResponse.json({
      totalActive: 0,
      counts: { movie: 0, music: 0, game: 0, tv: 0, radio: 0, drama: 0 },
      active: [],
      error: "presence_table_missing",
    });
  }
}
