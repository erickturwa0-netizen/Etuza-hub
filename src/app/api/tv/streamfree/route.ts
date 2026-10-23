import { NextResponse } from "next/server";
import { fetchStreamFreeMatches } from "@/lib/streamfree";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const matches = await fetchStreamFreeMatches();
    return NextResponse.json({
      ok: true,
      total: matches.length,
      playable: matches.filter((m) => m.playable).length,
      matches,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
