export type IptvChannel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
  tvgId: string | null;
};

/**
 * ONLY channels verified working.
 * Removed dead ones: Safari, Dodoma, TBC1, Pluto/00s Replay,
 * and other iptv-org links that return 404 / fail in player.
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

/** Never pull remote dead playlists by default */
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
    source: "pinned-only",
  };
}

export const IPTV_SOURCE_URL = "";
