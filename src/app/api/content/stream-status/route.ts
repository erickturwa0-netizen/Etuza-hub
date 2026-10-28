import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function ensureColumn() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Content"
      ADD COLUMN IF NOT EXISTS "stream_status" TEXT DEFAULT 'unknown'
    `);
  } catch {
    /* ignore */
  }
}

/** Mark content stream ok | bad after client playback */
export async function POST(req: Request) {
  try {
    await ensureColumn();
    const body = await req.json();
    const id = String(body?.contentId || "").slice(0, 40);
    const status = body?.status === "ok" ? "ok" : body?.status === "bad" ? "bad" : null;
    if (!id || !status) {
      return NextResponse.json({ error: "contentId + status required" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "Content" SET "stream_status" = $1 WHERE id = $2`,
      status,
      id
    );

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error("stream-status", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
