/**
 * MFALME.TV public API
 * Base: https://api.mfalmeapp.online
 */

export const MFALME_BASE = "https://api.mfalmeapp.online";
export const MFALME_CHANNELS_URL = `${MFALME_BASE}/api/channels`;

export type MfalmeChannel = {
  id: number;
  name: string;
  accessType?: string;
  url?: string;
  playbackUrl?: string;
  stream_url?: string;
  streamUrl?: string;
  direct_stream_url?: string;
  backupStream1?: string;
  backupStream2?: string;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  category?: string;
  isActive?: boolean;
  showInApp?: boolean;
};

function pickStreamUrl(c: MfalmeChannel): string {
  const candidates: string[] = [];
  for (const k of [
    "direct_stream_url",
    "url",
    "stream_url",
    "streamUrl",
    "playbackUrl",
    "backupStream1",
    "backupStream2",
  ] as const) {
    const v = c[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) {
      if (v.includes("mux.dev") || v.includes("test-streams")) continue;
      candidates.push(v);
    }
  }
  // Prefer direct HLS
  for (const v of candidates) {
    if (/m3u8|castr\.net|\.mp4/i.test(v)) return v;
  }
  return candidates[0] || "";
}

export function isDirectPlayable(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (/player\.php|osmanitv\.com\/v3\/player/i.test(url)) return false;
  if (url.includes("cdn.apisfast.top")) return false;
  // HLS / progressive
  if (/m3u8|castr\.net|\.mp4(\?|$)/i.test(url)) return true;
  // some free CDNs
  if (/okcdn\.ru\/hls/i.test(url)) return true;
  return false;
}

export async function fetchMfalmeChannels(): Promise<
  {
    id: number;
    title: string;
    logo: string | null;
    url: string;
    access: string;
    group: string;
    playable: boolean;
  }[]
> {
  try {
    const res = await fetch(MFALME_CHANNELS_URL, {
      headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as MfalmeChannel[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((c) => c.name && c.name.toUpperCase() !== "VIDEO")
      .map((c) => {
        const url = pickStreamUrl(c);
        const access = String(c.accessType || "unknown").toLowerCase();
        return {
          id: Number(c.id),
          title: String(c.name).trim(),
          logo: c.thumbnail || c.thumbnailUrl || c.thumbnail_url || null,
          url,
          access,
          group: access === "free" ? "Mfalme Free" : "Mfalme",
          playable: isDirectPlayable(url),
        };
      });
  } catch (e) {
    console.error("fetchMfalmeChannels", e);
    return [];
  }
}

/** Free channels with direct playable streams only */
export async function fetchMfalmePlayable(): Promise<
  {
    id: number;
    title: string;
    logo: string | null;
    url: string;
    group: string;
  }[]
> {
  const all = await fetchMfalmeChannels();
  return all
    .filter((c) => c.playable && c.url)
    .map((c) => ({
      id: c.id,
      title: c.title,
      logo: c.logo,
      url: c.url,
      group: c.group,
    }));
}
