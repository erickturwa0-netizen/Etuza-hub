export type IptvChannel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
  tvgId: string | null;
};

/** Always-on verified pins */
export const PINNED_CHANNELS: IptvChannel[] = [
  {
    id: "pin-tbc2",
    title: "TBC2",
    logo: "https://i.imgur.com/VkUJt2q.png",
    group: "Tanzania",
    url: "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8",
    tvgId: "TBC2.tz",
  },
  {
    id: "pin-mahaasin",
    title: "Mahaasin TV",
    logo: "https://i.imgur.com/wdfdKvC.png",
    group: "Tanzania",
    url: "https://mahaasintv.livebox.co.in/mahaasintvhls/mahaasintv.m3u8",
    tvgId: "MahaasinTV.tz",
  },
  {
    id: "pin-france24",
    title: "France 24 English",
    logo: null,
    group: "News",
    url: "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
    tvgId: "France24.en",
  },
  {
    id: "pin-nasa",
    title: "NASA TV",
    logo: null,
    group: "Science",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    tvgId: "NASATV.us",
  },
  {
    id: "pin-redbull",
    title: "Red Bull TV",
    logo: null,
    group: "Sports",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    tvgId: "RedBullTV",
  },
];

/** GitHub health-checked / curated sources */
const REMOTE_PLAYLISTS = [
  // dearbulut — health-scored (updated daily)
  { url: "https://dearbulut.github.io/iptv/playlists/country/tz.m3u", groupHint: "Tanzania" },
  { url: "https://dearbulut.github.io/iptv/playlists/country/ke.m3u", groupHint: "Kenya" },
  { url: "https://dearbulut.github.io/iptv/playlists/country/ug.m3u", groupHint: "Uganda" },
  { url: "https://dearbulut.github.io/iptv/playlists/country/za.m3u", groupHint: "South Africa" },
  { url: "https://dearbulut.github.io/iptv/playlists/country/rw.m3u", groupHint: "Rwanda" },
  // Free-TV curated free channels
  {
    url: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
    groupHint: "Free-TV",
  },
  // News category from iptv-org
  {
    url: "https://iptv-org.github.io/iptv/categories/news.m3u",
    groupHint: "News",
  },
];

function parseM3u(text: string, groupHint?: string): IptvChannel[] {
  const lines = text.split(/\r?\n/);
  const out: IptvChannel[] = [];
  let pending: {
    title: string;
    logo: string | null;
    group: string;
    tvgId: string | null;
  } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#EXTM3U") || line.startsWith("#EXTVLCOPT"))
      continue;

    if (line.startsWith("#EXTINF:")) {
      const comma = line.lastIndexOf(",");
      const title = comma >= 0 ? line.slice(comma + 1).trim() : "Channel";
      const meta = comma >= 0 ? line.slice(0, comma) : line;
      const logo =
        meta.match(/tvg-logo="([^"]+)"/i)?.[1] ||
        meta.match(/tvg-logo='([^']+)'/i)?.[1] ||
        null;
      const group =
        meta.match(/group-title="([^"]+)"/i)?.[1] ||
        meta.match(/group-title='([^']+)'/i)?.[1] ||
        groupHint ||
        "General";
      const tvgId =
        meta.match(/tvg-id="([^"]+)"/i)?.[1] ||
        meta.match(/tvg-id='([^']+)'/i)?.[1] ||
        null;
      pending = { title, logo, group: group.split(";")[0], tvgId };
      continue;
    }

    if (
      pending &&
      /^https:\/\//i.test(line) &&
      (line.includes("m3u8") || line.includes("/live") || line.includes("stream"))
    ) {
      const id = pending.tvgId || `ch-${out.length}-${pending.title.slice(0, 12)}`;
      out.push({
        id,
        title: pending.title.replace(/\s*\(\d+p\).*$/i, "").trim(),
        logo: pending.logo,
        group: pending.group || groupHint || "General",
        url: line,
        tvgId: pending.tvgId,
      });
      pending = null;
    }
  }
  return out;
}

async function fetchM3u(
  url: string,
  groupHint?: string,
  timeoutMs = 8000
): Promise<IptvChannel[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": "ETUZA-HUB/1.0", Accept: "*/*" },
      signal: ctrl.signal,
      next: { revalidate: 1800 },
    });
    clearTimeout(t);
    if (!res.ok) return [];
    return parseM3u(await res.text(), groupHint);
  } catch (e) {
    console.error("fetchM3u", url, e);
    return [];
  }
}

function scoreChannel(c: IptvChannel): number {
  let s = 0;
  const t = (c.title + " " + c.group + " " + (c.tvgId || "")).toLowerCase();
  if (/tanzania|tbc|mahaasin|\.tz/i.test(t)) s += 100;
  if (/kenya|\.ke|inooro|akili/i.test(t)) s += 80;
  if (/uganda|\.ug|bukedde|ark/i.test(t)) s += 70;
  if (/rwanda|south africa|\.za|\.rw/i.test(t)) s += 60;
  if (/news|france|bbc|al jazeera|cnn/i.test(t)) s += 40;
  if (c.url.startsWith("https://")) s += 10;
  return s;
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  source?: "ea" | "full" | "pinned";
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 120, 200);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();

  const remoteBatches = await Promise.all(
    REMOTE_PLAYLISTS.map((p) => fetchM3u(p.url, p.groupHint))
  );
  const remote = remoteBatches.flat();

  const seen = new Set<string>();
  const merged: IptvChannel[] = [];

  for (const c of [...PINNED_CHANNELS, ...remote.sort((a, b) => scoreChannel(b) - scoreChannel(a))]) {
    const key = c.url.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    // skip obvious junk
    if (/adult|xxx|porn/i.test(c.title + c.group)) continue;
    merged.push(c);
  }

  let channels = merged;

  if (q) {
    channels = channels.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    );
  }
  if (group) {
    channels = channels.filter((c) => c.group.toLowerCase().includes(group));
  }

  if (!channels.length) channels = [...PINNED_CHANNELS];

  return {
    channels: channels.slice(0, limit),
    total: channels.length,
    source: remote.length ? "github-health+pins" : "pins-only",
  };
}

export const IPTV_SOURCE_URL =
  "https://dearbulut.github.io/iptv/playlists/online.m3u";
