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

function parseM3u(text: string): IptvChannel[] {
  const lines = text.split(/\r?\n/);
  const out: IptvChannel[] = [];
  let pending: { title: string; logo: string | null; group: string; tvgId: string | null } | null =
    null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#EXTM3U") || line.startsWith("#EXTVLCOPT")) continue;

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

async function fetchM3u(url: string): Promise<IptvChannel[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ETUZA-HUB/1.0", Accept: "*/*" },
    next: { revalidate: 21600 }, // 6h
  });
  if (!res.ok) return [];
  const text = await res.text();
  return parseM3u(text);
}

/** TZ + East Africa first, then optional full index slice */
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

  let channels: IptvChannel[] = [];

  if (source === "full") {
    channels = await fetchM3u(M3U_URL);
  } else {
    // East Africa focused (fast + relevant)
    const [tz, ke, ug] = await Promise.all([
      fetchM3u(TZ_M3U),
      fetchM3u(KE_M3U),
      fetchM3u(UG_M3U),
    ]);
    channels = [...tz, ...ke, ...ug];

    // Enrich with News/Sports from full index (limited)
    try {
      const full = await fetchM3u(M3U_URL);
      const extra = full
        .filter((c) =>
          /news|sport|football|soccer|kids|music/i.test(c.group + " " + c.title)
        )
        .slice(0, 80);
      const seen = new Set(channels.map((c) => c.url));
      for (const c of extra) {
        if (!seen.has(c.url)) {
          seen.add(c.url);
          channels.push(c);
        }
      }
    } catch {
      /* ignore */
    }
  }

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

  const total = channels.length;
  return {
    channels: channels.slice(0, limit),
    total,
    source: source === "full" ? M3U_URL : "tz+ke+ug+highlights",
  };
}

export const IPTV_SOURCE_URL = M3U_URL;
