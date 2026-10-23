import { NextResponse } from "next/server";
import {
  fetchModoboChannels,
  fetchModoboCategories,
  fetchModoboFreeChannels,
  MODOBO_CHANNELS_URL,
} from "@/lib/modobo";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

/**
 * GET /api/tv/modobo
 * ?free=1  → free channels only
 * ?cats=1  → categories
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const freeOnly = searchParams.get("free") === "1";
    const cats = searchParams.get("cats") === "1";

    if (cats) {
      const categories = await fetchModoboCategories();
      return NextResponse.json({
        ok: true,
        categories,
        source: MODOBO_CHANNELS_URL,
      });
    }

    const channels = freeOnly
      ? await fetchModoboFreeChannels()
      : await fetchModoboChannels();

    return NextResponse.json({
      ok: true,
      total: channels.length,
      free: channels.filter((c) => c.free === 1).length,
      channels,
      source: MODOBO_CHANNELS_URL,
      note: "Stream URLs require Modobo app encrypted handshake; list is public catalog.",
    });
  } catch (e) {
    console.error("tv/modobo", e);
    return NextResponse.json(
      { ok: false, error: "Failed to load Modobo channels", channels: [] },
      { status: 502 }
    );
  }
}
