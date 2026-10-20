export type IptvChannel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
  tvgId: string | null;
};

/**
 * Channels with live HTTPS m3u8 verified 2026-10-21.
 * Truly dead (no alternate URL found): Dodoma TV, Tanzania Safari, TBC1, most KE commercial.
 * Restored: all reachable TZ/KE/UG/ZA/RW + news/sports.
 */
export const PINNED_CHANNELS: IptvChannel[] = [
  // Tanzania
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
  // Kenya
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
    id: "pin-younib",
    title: "YOUNIB Media TV",
    logo: null,
    group: "Kenya",
    url: "https://goliveafrica.media:9998/live/6257fbe7383d6/index.m3u8",
    tvgId: "YOUNIB.ke",
  },
  // Uganda
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
    id: "pin-bukedde1",
    title: "Bukedde TV 1",
    logo: null,
    group: "Uganda",
    url: "https://stream.hydeinnovations.com/bukedde1flussonic/index.m3u8",
    tvgId: "Bukedde1.ug",
  },
  {
    id: "pin-bukedde2",
    title: "Bukedde TV 2",
    logo: null,
    group: "Uganda",
    url: "https://stream.hydeinnovations.com/bukedde2flussonic/index.m3u8",
    tvgId: "Bukedde2.ug",
  },
  // South Africa
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
    id: "pin-ln24",
    title: "LN24 SA",
    logo: null,
    group: "South Africa",
    url: "https://cdnstack.internetmultimediaonline.org/ln24/ln24.stream/playlist.m3u8",
    tvgId: "LN24.za",
  },
  // Rwanda
  {
    id: "pin-tv1-rw",
    title: "TV1 Rwanda",
    logo: null,
    group: "Rwanda",
    url: "https://live.tv1.rw/index.m3u8",
    tvgId: "TV1.rw",
  },
  {
    id: "pin-isibo",
    title: "Isibo TV",
    logo: null,
    group: "Rwanda",
    url: "https://5c46fa289c89f.streamlock.net/pub2live/myStream/playlist.m3u8",
    tvgId: "Isibo.rw",
  },
  {
    id: "pin-tv10",
    title: "TV10 Rwanda",
    logo: null,
    group: "Rwanda",
    url: "https://5c46fa289c89f.streamlock.net/pub1live/mystream/playlist.m3u8",
    tvgId: "TV10.rw",
  },
  // World
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

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  source?: "ea" | "full" | "pinned";
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 40, 100);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();

  let channels = [...PINNED_CHANNELS];

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
    source: "pinned-restored",
  };
}

export const IPTV_SOURCE_URL = "";
