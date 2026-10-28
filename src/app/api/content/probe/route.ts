import { NextResponse } from "next/server";
import { probeUnknownStreams } from "@/lib/stream-probe";

export const maxDuration = 60;

/** Probe unknown streams (movie/drama/tv/music). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "movie").slice(0, 20);
    const limit = Math.min(Number(body?.limit) || 12, 25);
    const result = await probeUnknownStreams(type, limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("probe route", e);
    return NextResponse.json({ error: "Probe failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "movie").slice(0, 20);
  const limit = Math.min(Number(searchParams.get("limit") || 12), 25);
  const result = await probeUnknownStreams(type, limit);
  return NextResponse.json({ ok: true, ...result });
}
