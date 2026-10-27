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

/**
 * Verified live free m3u8 only.
 */
export const PINNED_CHANNELS: IptvChannel[] = [
  // Tanzania
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
  // Kenya
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
  // Uganda
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
  // Rwanda
  ch(
    "pin-tv1rw",
    "TV1 Rwanda",
    "Rwanda",
    "https://live.tv1.rw/index.m3u8",
    "TV1.rw"
  ),
  // South Africa
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
    "CTV.za",
    "https://i.imgur.com/Y8FK1Kk.png"
  ),
  // Uzbekistan / AllaTV sample
  ch(
    "pin-cinerama",
    "Cinerama",
    "Movies",
    "https://stream8.cinerama.uz/1024/tracks-v1a1/mono.m3u8",
    "Cinerama.uz"
  ),
  // News / Science / Sports (verified)
  ch(
    "pin-france24",
    "France 24 English",
    "News",
    "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
    "France24.en"
  ),
  ch(
    "pin-abc-news",
    "ABC News",
    "News",
    "https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8",
    "ABCNews",
    "https://i.imgur.com/BrW7gk8.png"
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
    "NASATV.us"
  ),
  ch(
    "pin-redbull",
    "Red Bull TV",
    "Sports",
    "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    "RedBullTV"
  ),
];

export function isPlayableStream(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (url.startsWith("catalog://")) return false;
  if (url.includes("cdn.apisfast.top")) return false;
  if (/player\.php/i.test(url)) return false;
  if (/youtube\.com|youtu\.be/i.test(url)) return false;
  return /m3u8|castr\.net|\.mp4|smil/i.test(url);
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  liveOnly?: boolean;
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 100, 200);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();

  let channels: IptvChannel[] = PINNED_CHANNELS.map((c) => ({
    ...c,
    logo: tvCover(c.title, c.logo),
  }));

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
    source: "verified-live",
  };
}

export const IPTV_SOURCE_URL = "verified-live-m3u8";
