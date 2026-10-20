export type IptvChannel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
  tvgId: string | null;
};

const M3U_URL = "https://iptv-org.github.io/iptv/index.m3u";
const TZ_M3U = "https://iptv-org.github.io/iptv/countries/tz.m3u";
const KE_M3U = "https://iptv-org.github.io/iptv/countries/ke.m3u";
const UG_M3U = "https://iptv-org.github.io/iptv/countries/ug.m3u";

/**
 * Streams verified reachable (HTTP 200 + valid m3u8) on 2026-10-20.
 * Most iptv-org TZ/KE links are dead — only pin what works.
 */
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
    id: "pin-akili",
    title: "Akili Kids!",
    logo: null,
    group: "Kenya",
    url: "https://m6.livecdn.io/akilikids.co.ke/akilikids.smil/playlist.m3u8",
    tvgId: "AkiliKids.ke",
  },
  {
    id: "pin-inooro",
    title: "Inooro TV",
    logo: null,
    group: "Kenya",
    url: "https://live-onesignal.royalmedia.co.ke/live/T-MxRsFebq6zx7k2QFMbLw.m3u8",
    tvgId: "InooroTV.ke",
  },
  {
    id: "pin-morning-cloud",
    title: "Morning Cloud TV",
    logo: null,
    group: "Kenya",
    url: "https://livecdn.live247stream.com/mc/tv/playlist.m3u8",
    tvgId: "MorningCloud.ke",
  },
  {
    id: "pin-alpha-ug",
    title: "Alpha Digital",
    logo: null,
    group: "Uganda",
    url: "https://streamfi-alphatvdgtl1.zettawiseroutes.com:8181/hls/stream.m3u8",
    tvgId: "AlphaDigital.ug",
  },
  {
    id: "pin-ark-tv",
    title: "Ark TV",
    logo: null,
    group: "Uganda",
    url: "https://stream.hydeinnovations.com/arktv-international/index.fmp4.m3u8",
    tvgId: "ArkTV.ug",
  },
  {
    id: "pin-btv-ug",
    title: "BTV Uganda",
    logo: null,
    group: "Uganda",
    url: "https://streamfi-alphadgtl1.zettawiseroutes.com:8181/hls/stream.m3u8",
    tvgId: "BTV.ug",
  },
  {
    id: "pin-1kzn",
    title: "1KZN TV",
    logo: null,
    group: "South Africa",
    url: "https://cdn.freevisiontv.co.za/sttv/smil:1kzn.stream.smil/playlist.m3u8",
    tvgId: "1KZN.za",
  },
  {
    id: "pin-ctv",
    title: "Cape Town TV",
    logo: null,
    group: "South Africa",
    url: "https://cdn.freevisiontv.co.za/sttv/smil:ctv.stream.smil/playlist.m3u8",
    tvgId: "CapeTownTV.za",
  },
  {
    id: "pin-boktv",
    title: "BOKTV",
    logo: null,
    group: "South Africa",
    url: "https://livestream2.bokradio.co.za/hls/Bok5c.m3u8",
    tvgId: "BOKTV.za",
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

function parseM3u(text: string): IptvChannel[] {
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
        "General";
      const tvgId =
        meta.match(/tvg-id="([^"]+)"/i)?.[1] ||
        meta.match(/tvg-id='([^']+)'/i)?.[1] ||
        null;
      pending = { title, logo, group, tvgId };
      continue;
    }

    if (pending && /^https:\/\//i.test(line) && line.includes("m3u8")) {
      const id = pending.tvgId || `ch-${out.length}`;
      out.push({
        id,
        title: pending.title,
        logo: pending.logo,
        group: pending.group.split(";")[0] || "General",
        url: line,
        tvgId: pending.tvgId,
      });
      pending = null;
    }
  }
  return out;
}

async function fetchM3u(url: string, timeoutMs = 6000): Promise<IptvChannel[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": "ETUZA-HUB/1.0", Accept: "*/*" },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(t);
    if (!res.ok) return [];
    return parseM3u(await res.text());
  } catch (e) {
    console.error("fetchM3u", url, e);
    return [];
  }
}

function scoreChannel(c: IptvChannel): number {
  let s = 0;
  const t = (c.title + " " + c.group + " " + (c.tvgId || "")).toLowerCase();
  if (/tanzania|tbc|\.tz/i.test(t)) s += 100;
  if (/kenya|\.ke/i.test(t)) s += 70;
  if (/uganda|\.ug/i.test(t)) s += 60;
  if (c.url.startsWith("https://")) s += 15;
  return s;
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  source?: "ea" | "full" | "pinned";
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 80, 200);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();
  const source = opts?.source || "pinned";

  // Default: verified pins only (reliable). Optional remote expansion.
  let remote: IptvChannel[] = [];
  if (source === "ea" || source === "full") {
    try {
      if (source === "full") {
        remote = await fetchM3u(M3U_URL, 10000);
      } else {
        const [tz, ke, ug] = await Promise.all([
          fetchM3u(TZ_M3U),
          fetchM3u(KE_M3U),
          fetchM3u(UG_M3U),
        ]);
        remote = [...tz, ...ke, ...ug];
      }
    } catch (e) {
      console.error("loadIptvChannels", e);
    }
  }

  const seenUrl = new Set(PINNED_CHANNELS.map((p) => p.url));
  const rest = remote
    .filter((c) => !seenUrl.has(c.url))
    .sort((a, b) => scoreChannel(b) - scoreChannel(a));

  let channels = [...PINNED_CHANNELS, ...rest];

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
    source: rest.length ? "pinned+remote" : "pinned-only",
  };
}

export const IPTV_SOURCE_URL = M3U_URL;
