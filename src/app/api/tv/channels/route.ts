import { NextResponse } from "next/server";
import {
  loadIptvChannels,
  IPTV_SOURCE_URL,
  PINNED_CHANNELS,
} from "@/lib/iptv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const group = searchParams.get("group") || undefined;
    const limit = Number(searchParams.get("limit") || 300);
    // ?live=1 = playable only; default = full catalog from all apps
    const liveOnly = searchParams.get("live") === "1";

    const result = await loadIptvChannels({ q, group, limit, liveOnly });

    return NextResponse.json({
      ...result,
      playlist: IPTV_SOURCE_URL,
    });
  } catch (err) {
    console.error("tv/channels", err);
    return NextResponse.json({
      channels: PINNED_CHANNELS,
      total: PINNED_CHANNELS.length,
      source: "pinned-fallback",
      playlist: IPTV_SOURCE_URL,
      error: "Remote IPTV imeshindwa — inaonyesha channels za pinned",
    });
  }
}
