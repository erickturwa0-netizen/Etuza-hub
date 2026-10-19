import { NextResponse } from "next/server";
import { loadIptvChannels, IPTV_SOURCE_URL } from "@/lib/iptv";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const group = searchParams.get("group") || undefined;
    const limit = Number(searchParams.get("limit") || 120);
    const source = (searchParams.get("source") as "ea" | "full") || "ea";

    const result = await loadIptvChannels({ q, group, limit, source });

    return NextResponse.json({
      ...result,
      playlist: IPTV_SOURCE_URL,
    });
  } catch (err) {
    console.error("tv/channels", err);
    return NextResponse.json(
      { channels: [], total: 0, error: "Imeshindikana kupakia IPTV" },
      { status: 500 }
    );
  }
}
