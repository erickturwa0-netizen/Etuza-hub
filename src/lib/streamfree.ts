/**
 * StreamFree (Orizon / Zimo) — live sports match catalog
 * GET https://streamfree.top/api/v1/streams
 */

export const STREAMFREE_BASE = "https://streamfree.top";
export const STREAMFREE_STREAMS_URL = `${STREAMFREE_BASE}/api/v1/streams`;

export type StreamFreeItem = {
  id: string;
  name: string;
  category?: string;
  league?: string;
  stream_key?: string;
  match_timestamp?: number;
  viewers?: number;
  is_external?: boolean;
  thumbnail_url?: string | null;
  sources?: { url?: string; type?: string }[];
  team1?: string;
  team2?: string;
};

export async function fetchStreamFreeMatches(): Promise<
  {
    id: string;
    title: string;
    logo: string | null;
    url: string;
    group: string;
    playable: boolean;
  }[]
> {
  try {
    const res = await fetch(STREAMFREE_STREAMS_URL, {
      headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const streams: StreamFreeItem[] = Array.isArray(data?.streams)
      ? data.streams
      : Array.isArray(data)
        ? data
        : [];

    return streams.map((s) => {
      const sources = Array.isArray(s.sources) ? s.sources : [];
      let url = "";
      for (const src of sources) {
        const u = typeof src === "string" ? src : src?.url;
        if (u && /^https?:\/\//i.test(u)) {
          url = u;
          break;
        }
      }
      const league = s.league || s.category || "Sports";
      return {
        id: String(s.id || s.stream_key || s.name),
        title: s.name || "Match",
        logo: s.thumbnail_url || null,
        url,
        group: `Mechi · ${league}`,
        playable: Boolean(url && /m3u8|\.mp4/i.test(url)),
      };
    });
  } catch (e) {
    console.error("fetchStreamFreeMatches", e);
    return [];
  }
}
