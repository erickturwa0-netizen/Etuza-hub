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
    logo: tvCover(title, logo || null),
  };
}

/** Curated free public m3u8 (always shown first) */
export const PINNED_CHANNELS: IptvChannel[] = [
  ch("pin-safari", "Safari Channel", "Tanzania", "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_12bb7dc0590211f1951119e8afeb4224/index.fmp4.m3u8", "Safari.tz"),
  ch("pin-tbc2", "TBC2", "Tanzania", "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8", "TBC2.tz", "https://i.imgur.com/VkUJt2q.png"),
  ch("pin-dodoma", "Dodoma TV", "Tanzania", "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8", "DodomaTV.tz"),
  ch("pin-mahaasin", "Mahaasin TV", "Tanzania", "https://mahaasintv.livebox.co.in/mahaasintvhls/mahaasintv.m3u8", "MahaasinTV.tz"),
  ch("pin-akili", "Akili Kids!", "Kenya", "https://m6.livecdn.io/akilikids.co.ke/akilikids.smil/playlist.m3u8", "AkiliKids.ke", "https://i.imgur.com/xFm2co6.png"),
  ch("pin-inooro", "Inooro TV", "Kenya", "https://live-onesignal.royalmedia.co.ke/live/T-MxRsFebq6zx7k2QFMbLw.m3u8", "InooroTV.ke", "https://i.imgur.com/5qFJtmo.png"),
  ch("pin-meru", "MERU TV", "Kenya", "https://goliveafrica.media:9998/live/628e5c1991061/index.m3u8", "MeruTV.ke"),
  ch("pin-bukedde1", "Bukedde TV 1", "Uganda", "https://stream.hydeinnovations.com/bukedde1flussonic/index.m3u8", "Bukedde1.ug", "https://i.imgur.com/HFq5QlJ.png"),
  ch("pin-ark", "Ark TV", "Uganda", "https://stream.hydeinnovations.com/arktv-international/index.fmp4.m3u8", "ArkTV.ug", "https://i.imgur.com/yCHNZXD.png"),
  ch("pin-tv1rw", "TV1 Rwanda", "Rwanda", "https://live.tv1.rw/index.m3u8", "TV1.rw"),
  ch("pin-1kzn", "1KZN TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:1kzn.stream.smil/playlist.m3u8", "1KZN.za"),
  ch("pin-ctv", "Cape Town TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:ctv.stream.smil/playlist.m3u8", "CTV.za", "https://i.imgur.com/Y8FK1Kk.png"),
  ch("pin-france24", "France 24 English", "News", "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8", "France24.en"),
  ch("pin-abc-news", "ABC News", "News", "https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8", "ABCNews", "https://i.imgur.com/BrW7gk8.png"),
  ch("pin-nasa", "NASA TV", "Science", "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8", "NASATV.us"),
  ch("pin-redbull", "Red Bull TV", "Sports", "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8", "RedBullTV"),
  ch("pin-aljazeera", "Al Jazeera English", "News", "https://live-hls-web-aje.getaj.net/AJE/01.m3u8", "AlJazeera.en"),
  ch("pin-dw", "DW English", "News", "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8", "DW.en"),
  ch("pin-cgtn", "CGTN", "News", "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8", "CGTN.en"),
];

export function isPlayableStream(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (url.startsWith("catalog://")) return false;
  if (url.includes("cdn.apisfast.top")) return false;
  if (/player\.php/i.test(url)) return false;
  if (/youtube\.com|youtu\.be/i.test(url)) return false;
  return /m3u8|castr\.net|\.mp4|smil/i.test(url);
}

function parseM3u(text: string, defaultGroup: string): IptvChannel[] {
  const lines = text.split(/\r?\n/);
  const out: IptvChannel[] = [];
  let meta: { title: string; logo: string | null; group: string; tvgId: string | null } | null =
    null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      const rest = line.slice(8);
      const comma = rest.lastIndexOf(",");
      const attrs = comma >= 0 ? rest.slice(0, comma) : rest;
      const title = (comma >= 0 ? rest.slice(comma + 1) : "Channel").trim();
      const logo =
        attrs.match(/tvg-logo="([^"]+)"/i)?.[1] ||
        attrs.match(/tvg-logo='([^']+)'/i)?.[1] ||
        null;
      const group =
        attrs.match(/group-title="([^"]+)"/i)?.[1] ||
        attrs.match(/group-title='([^']+)'/i)?.[1] ||
        defaultGroup;
      const tvgId =
        attrs.match(/tvg-id="([^"]+)"/i)?.[1] ||
        attrs.match(/tvg-id='([^']+)'/i)?.[1] ||
        null;
      meta = { title, logo, group, tvgId };
      continue;
    }
    if (line.startsWith("#")) continue;
    if (!meta) continue;
    if (!isPlayableStream(line)) {
      meta = null;
      continue;
    }
    const id =
      "m3u-" +
      Buffer.from(line).toString("base64url").slice(0, 22);
    out.push({
      id,
      title: meta.title.replace(/\s*\(\d+p\).*$/i, "").trim() || meta.title,
      logo: tvCover(meta.title, meta.logo),
      group: meta.group.split(";")[0].trim() || defaultGroup,
      url: line,
      tvgId: meta.tvgId,
    });
    meta = null;
  }
  return out;
}

const REMOTE_PLAYLISTS: { url: string; group: string }[] = [
  { url: "https://iptv-org.github.io/iptv/countries/tz.m3u", group: "Tanzania" },
  { url: "https://iptv-org.github.io/iptv/countries/ke.m3u", group: "Kenya" },
  { url: "https://iptv-org.github.io/iptv/countries/ug.m3u", group: "Uganda" },
  { url: "https://iptv-org.github.io/iptv/countries/rw.m3u", group: "Rwanda" },
  { url: "https://iptv-org.github.io/iptv/countries/za.m3u", group: "South Africa" },
  { url: "https://iptv-org.github.io/iptv/categories/news.m3u", group: "News" },
  {
    url: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
    group: "Free-TV",
  },
];

async function fetchPlaylist(
  url: string,
  group: string
): Promise<IptvChannel[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "ETUZA-HUB/1.0" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseM3u(text, group);
  } catch {
    return [];
  }
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  liveOnly?: boolean;
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 300, 500);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();

  const remoteLists = await Promise.all(
    REMOTE_PLAYLISTS.map((p) => fetchPlaylist(p.url, p.group))
  );

  const seen = new Set<string>();
  const merged: IptvChannel[] = [];

  function add(list: IptvChannel[]) {
    for (const c of list) {
      const key = c.url.replace(/\s/g, "");
      if (seen.has(key)) continue;
      if (!isPlayableStream(c.url)) continue;
      seen.add(key);
      merged.push({
        ...c,
        logo: tvCover(c.title, c.logo),
      });
    }
  }

  add(PINNED_CHANNELS);
  for (const list of remoteLists) add(list);

  // Free-TV is huge — prefer News/Sports/Documentary groups + Africa names
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

  return {
    channels: channels.slice(0, limit),
    total: channels.length,
    source: "pinned+iptv-org+free-tv",
  };
}

export const IPTV_SOURCE_URL = "iptv-org+free-tv";
