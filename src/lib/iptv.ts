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

/** Always available — shown even if remote M3U fails */
export const PINNED_CHANNELS: IptvChannel[] = [
  {
    id: "pin-tbc1",
    title: "TBC1",
    logo: "https://i.imgur.com/OmiVZ1u.png",
    group: "Tanzania",
    url: "https://tbc.maintek.co/LiveApp/streams/YF43nTzH0duMyUA2130641323343587.m3u8",
    tvgId: "TBC1.tz@SD",
  },
  {
    id: "pin-tbc2",
    title: "TBC2",
    logo: "https://i.imgur.com/VkUJt2q.png",
    group: "Tanzania",
    url: "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8",
    tvgId: "TBC2.tz@SD",
  },
  {
    id: "pin-dodoma",
    title: "Dodoma TV",
    logo: "https://i.imgur.com/bLq9eFa.png",
    group: "Tanzania",
    url: "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8",
    tvgId: "DodomaTV.tz@SD",
  },
  {
    id: "pin-ibn",
    title: "IBN TV",
    logo: "https://i.imgur.com/hkV51ij.png",
    group: "Tanzania",
    url: "http://138.68.138.119:8080/live/5a8993709ea19/index.m3u8",
    tvgId: "IBNTV.tz@SD",
  },
  {
    id: "pin-ibn-africa",
    title: "IBN TV Africa",
    logo: "https://i.imgur.com/eKy2ocd.png",
    group: "Tanzania",
    url: "http://68.183.41.209:8080/live/5d9a537c64b9c/index.m3u8",
    tvgId: "IBNTVAfrica.tz@SD",
  },
  {
    id: "pin-safari",
    title: "Tanzania Safari Channel",
    logo: "https://i.imgur.com/fcLFYhn.png",
    group: "Tanzania",
    url: "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_31dabe40323511f08b8efff0016f3b67/index.m3u8",
    tvgId: "TanzaniaSafariChannel.tz@SD",
  },
  {
    id: "pin-mahaasin",
    title: "Mahaasin TV",
    logo: "https://i.imgur.com/wdfdKvC.png",
    group: "Tanzania",
    url: "https://mahaasintv.livebox.co.in/mahaasintvhls/mahaasintv.m3u8",
    tvgId: "MahaasinTV.tz@SD",
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

    if (pending && /^https?:\/\//i.test(line)) {
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

async function fetchM3u(url: string, timeoutMs = 8000): Promise<IptvChannel[]> {
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
    const text = await res.text();
    return parseM3u(text);
  } catch (e) {
    console.error("fetchM3u", url, e);
    return [];
  }
}

function scoreChannel(c: IptvChannel): number {
  let s = 0;
  const t = (c.title + " " + c.group + " " + (c.tvgId || "")).toLowerCase();
  if (/\.tz@|tanzania|tbc|dodoma|ibn|zanzibar|azam/i.test(t)) s += 100;
  if (/\.ke@|kenya|ntv|citizen|ktn|kbc/i.test(t)) s += 60;
  if (/\.ug@|uganda/i.test(t)) s += 50;
  if (/news/i.test(t)) s += 20;
  if (/sport|football|soccer/i.test(t)) s += 15;
  if (c.url.startsWith("https://") && c.url.includes("m3u8")) s += 10;
  if (c.url.startsWith("http://")) s -= 5;
  return s;
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  source?: "ea" | "full";
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 120, 300);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();
  const source = opts?.source || "ea";

  let remote: IptvChannel[] = [];

  try {
    if (source === "full") {
      remote = await fetchM3u(M3U_URL, 12000);
    } else {
      const [tz, ke, ug] = await Promise.all([
        fetchM3u(TZ_M3U),
        fetchM3u(KE_M3U),
        fetchM3u(UG_M3U),
      ]);
      remote = [...tz, ...ke, ...ug];
    }
  } catch (e) {
    console.error("loadIptvChannels remote", e);
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
        c.group.toLowerCase().includes(q) ||
        (c.tvgId || "").toLowerCase().includes(q)
    );
  }
  if (group) {
    channels = channels.filter((c) => c.group.toLowerCase().includes(group));
  }

  // Never return empty — at least pinned
  if (channels.length === 0) {
    channels = [...PINNED_CHANNELS];
  }

  return {
    channels: channels.slice(0, limit),
    total: channels.length,
    source: remote.length ? (source === "full" ? M3U_URL : "pinned+ea") : "pinned-only",
  };
}

export const IPTV_SOURCE_URL = M3U_URL;
