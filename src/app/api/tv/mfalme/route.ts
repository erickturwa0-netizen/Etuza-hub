import { NextResponse } from "next/server";
import { fetchMfalmeChannels, fetchMfalmePlayable } from "@/lib/mfalme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playableOnly = searchParams.get("playable") === "1";

  try {
    const channels = playableOnly
      ? await fetchMfalmePlayable()
      : await fetchMfalmeChannels();
    return NextResponse.json({
      ok: true,
      total: channels.length,
      channels,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
