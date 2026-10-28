import { tvCover } from "@/lib/covers";

export type IptvChannel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
  tvgId: string | null;
};

function ch(
  id: string,
  title: string,
  group: string,
  url: string,
  tvgId: string | null,
  logo?: string | null
): IptvChannel {
  return {
    id,
    title,
    group,
    url,
    tvgId,
    logo: tvCover(title, logo || null) || null,
  };
}

/** Always-on East Africa / news pins */
export const PINNED_CHANNELS: IptvChannel[] = [
  ch(
    "pin-safari",
    "Safari Channel",
    "Tanzania",
    "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_12bb7dc0590211f1951119e8afeb4224/index.fmp4.m3u8",
    "Safari.tz"
  ),
  ch(
    "pin-tbc2",
    "TBC2",
    "Tanzania",
    "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8",
    "TBC2.tz",
    "https://i.imgur.com/VkUJt2q.png"
  ),
  ch(
    "pin-dodoma",
    "Dodoma TV",
    "Tanzania",
    "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8",
    "DodomaTV.tz"
  ),
  ch(
    "pin-mahaasin",
    "Mahaasin TV",
    "Tanzania",
    "https://mahaasintv.livebox.co.in/mahaasintvhls/mahaasintv.m3u8",
    "MahaasinTV.tz"
  ),
  ch(
    "pin-akili",
    "Akili Kids!",
    "Kenya",
    "https://m6.livecdn.io/akilikids.co.ke/akilikids.smil/playlist.m3u8",
    "AkiliKids.ke",
    "https://i.imgur.com/xFm2co6.png"
  ),
  ch(
    "pin-inooro",
    "Inooro TV",
    "Kenya",
    "https://live-onesignal.royalmedia.co.ke/live/T-MxRsFebq6zx7k2QFMbLw.m3u8",
    "InooroTV.ke",
    "https://i.imgur.com/5qFJtmo.png"
  ),
  ch(
    "pin-bukedde1",
    "Bukedde TV 1",
    "Uganda",
    "https://stream.hydeinnovations.com/bukedde1flussonic/index.m3u8",
    "Bukedde1.ug",
    "https://i.imgur.com/HFq5QlJ.png"
  ),
  ch(
    "pin-ark",
    "Ark TV",
    "Uganda",
    "https://stream.hydeinnovations.com/arktv-international/index.fmp4.m3u8",
    "ArkTV.ug",
    "https://i.imgur.com/yCHNZXD.png"
  ),
  ch(
    "pin-tv1rw",
    "TV1 Rwanda",
    "Rwanda",
    "https://live.tv1.rw/index.m3u8",
    "TV1.rw"
  ),
  ch(
    "pin-1kzn",
    "1KZN TV",
    "South Africa",
    "https://cdn.freevisiontv.co.za/sttv/smil:1kzn.stream.smil/playlist.m3u8",
    "1KZN.za"
  ),
  ch(
    "pin-ctv",
    "Cape Town TV",
    "South Africa",
    "https://cdn.freevisiontv.co.za/sttv/smil:ctv.stream.smil/playlist.m3u8",
    "CTV.za"
  ),
  ch(
    "pin-f24",
    "France 24 English",
    "News",
    "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
    "France24.en"
  ),
  ch(
    "pin-dw",
    "DW English",
    "News",
    "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    "DW.en"
  ),
  ch(
    "pin-cgtn",
    "CGTN",
    "News",
    "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8",
    "CGTN.en"
  ),
  ch(
    "pin-nasa",
    "NASA TV",
    "Science",
    "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    "NASA.tv"
  ),
];

export function isPlayableStream(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (url.startsWith("catalog://")) return false;
  if (url.includes("cdn.apisfast.top")) return false;
  if (/player\.php/i.test(url)) return false;
  if (/youtube\.com|youtu\.be/i.test(url)) return false;
  return /m3u8|castr\.net|\.mp4|smil|\.ts(\?|$)/i.test(url);
}

function parseM3u(text: string, defaultGroup = "World"): IptvChannel[] {
  const lines = text.split(/\r?\n/);
  const out: IptvChannel[] = [];
  let meta: {
    title: string;
    logo: string | null;
    group: string;
    tvgId: string | null;
  } | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("#EXTINF:")) {
      const nameMatch = t.match(/,(.+)$/);
      const title = (nameMatch?.[1] || "Channel").trim();
      const logo =
        t.match(/tvg-logo="([^"]+)"/i)?.[1] ||
        t.match(/tvg-logo='([^']+)'/i)?.[1] ||
        null;
      const group =
        t.match(/group-title="([^"]+)"/i)?.[1] ||
        t.match(/group-title='([^']+)'/i)?.[1] ||
        defaultGroup;
      const tvgId =
        t.match(/tvg-id="([^"]+)"/i)?.[1] ||
        t.match(/tvg-id='([^']+)'/i)?.[1] ||
        null;
      meta = { title, logo, group, tvgId };
    } else if (meta && /^https?:\/\//i.test(t)) {
      if (isPlayableStream(t)) {
        const id =
          "m3u-" +
          Buffer.from(t).toString("base64url").slice(0, 22);
        out.push(ch(id, meta.title, meta.group, t, meta.tvgId, meta.logo));
      }
      meta = null;
    }
  }
  return out;
}

async function fetchText(url: string, ms = 12000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "*/*", "User-Agent": "ETUZA-HUB/1.0" },
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    clearTimeout(timer);
    return "";
  }
}

async function fetchJson<T>(url: string, ms = 15000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function loadRemoteCatalogs(): Promise<IptvChannel[]> {
  const collected: IptvChannel[] = [];

  type StreamRow = {
    channel?: string;
    title?: string;
    url?: string;
  };
  type ChannelRow = {
    id?: string;
    name?: string;
    country?: string;
    logo?: string;
  };

  const [streams, channelsMeta] = await Promise.all([
    fetchJson<StreamRow[]>("https://iptv-org.github.io/api/streams.json"),
    fetchJson<ChannelRow[]>("https://iptv-org.github.io/api/channels.json"),
  ]);

  const metaById = new Map<string, ChannelRow>();
  if (Array.isArray(channelsMeta)) {
    for (const c of channelsMeta) {
      if (c.id) metaById.set(c.id, c);
    }
  }

  if (Array.isArray(streams)) {
    for (const s of streams) {
      const url = (s.url || "").trim();
      if (!isPlayableStream(url)) continue;
      const meta = s.channel ? metaById.get(s.channel) : undefined;
      const title = (s.title || meta?.name || s.channel || "Channel").trim();
      const group = meta?.country || "World";
      const logo = meta?.logo || null;
      const id =
        "org-" + Buffer.from(url).toString("base64url").slice(0, 20);
      collected.push(ch(id, title, group, url, s.channel || null, logo));
    }
  }

  const playlists = [
    "https://iptv-org.github.io/iptv/countries/tz.m3u",
    "https://iptv-org.github.io/iptv/countries/ke.m3u",
    "https://iptv-org.github.io/iptv/countries/ug.m3u",
    "https://iptv-org.github.io/iptv/countries/rw.m3u",
    "https://iptv-org.github.io/iptv/countries/za.m3u",
    "https://iptv-org.github.io/iptv/countries/ng.m3u",
    "https://iptv-org.github.io/iptv/countries/gh.m3u",
    "https://iptv-org.github.io/iptv/countries/eg.m3u",
    "https://iptv-org.github.io/iptv/categories/news.m3u",
    "https://iptv-org.github.io/iptv/categories/sports.m3u",
    "https://iptv-org.github.io/iptv/categories/music.m3u",
    "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
  ];

  const texts = await Promise.all(playlists.map((u) => fetchText(u)));
  for (const text of texts) {
    if (text) collected.push(...parseM3u(text, "IPTV"));
  }

  const seen = new Set<string>();
  const unique: IptvChannel[] = [];
  for (const c of collected) {
    const key = c.url.split("?")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      ...c,
      logo: (tvCover(c.title, c.logo) as string | null) || c.logo,
    });
  }
  return unique;
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  liveOnly?: boolean;
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  // Raised to 20000 so the full iptv-org + playlists catalog (~18k) can be returned
  const limit = Math.min(Math.max(opts?.limit || 500, 1), 20000);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();

  const pinned: IptvChannel[] = PINNED_CHANNELS.map((c) => ({
    ...c,
    logo: (tvCover(c.title, c.logo) as string | null) || c.logo,
  }));

  let remote: IptvChannel[] = [];
  let source = "pinned+remote";
  try {
    remote = await loadRemoteCatalogs();
  } catch (e) {
    console.error("loadRemoteCatalogs", e);
    source = "pinned-only";
  }

  const seen = new Set(
    pinned.map((c) => c.url.split("?")[0].toLowerCase())
  );
  const merged: IptvChannel[] = [...pinned];
  for (const c of remote) {
    const key = c.url.split("?")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(c);
  }

  let channels: IptvChannel[] = merged;

  if (opts?.liveOnly) {
    channels = channels.filter((c) => isPlayableStream(c.url));
  }
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

  const rank = (g: string) => {
    const x = g.toLowerCase();
    if (/tanzania|tz\b/.test(x)) return 0;
    if (/kenya|uganda|rwanda|africa/.test(x)) return 1;
    if (/news|sport/.test(x)) return 2;
    return 3;
  };
  const pinnedIds = new Set(PINNED_CHANNELS.map((c) => c.id));
  channels.sort((a, b) => {
    const ap = pinnedIds.has(a.id) ? 0 : 1;
    const bp = pinnedIds.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ra = rank(a.group);
    const rb = rank(b.group);
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title);
  });

  return {
    channels: channels.slice(0, limit),
    total: channels.length,
    source: remote.length ? source : "pinned-only",
  };
}

export const IPTV_SOURCE_URL = "iptv-org+free-tv+pinned";
