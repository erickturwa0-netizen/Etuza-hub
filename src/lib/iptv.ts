export type IptvChannel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
  tvgId: string | null;
};

/**
 * ONLY m3u8 streams verified HTTP-live.
 * Free/public only — no panel/MAC / pay-TV cracks.
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
    id: "pin-dodoma",
    title: "Dodoma TV",
    logo: null,
    group: "Tanzania",
    url: "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8",
    tvgId: "DodomaTV.tz",
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
    id: "pin-meru",
    title: "MERU TV",
    logo: null,
    group: "Kenya",
    url: "https://goliveafrica.media:9998/live/628e5c1991061/index.m3u8",
    tvgId: "MeruTV.ke",
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
  {
    id: "pin-capuchin",
    title: "Capuchin TV",
    logo: null,
    group: "Kenya",
    url: "https://goliveafrica.media:9998/live/64227f58b8413/index.m3u8",
    tvgId: "Capuchin.ke",
  },
  // Uganda
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
  {
    id: "pin-ark",
    title: "Ark TV",
    logo: null,
    group: "Uganda",
    url: "https://stream.hydeinnovations.com/arktv-international/index.fmp4.m3u8",
    tvgId: "ArkTV.ug",
  },
  {
    id: "pin-btv",
    title: "BTV Uganda",
    logo: null,
    group: "Uganda",
    url: "https://streamfi-alphadgtl1.zettawiseroutes.com:8181/hls/stream.m3u8",
    tvgId: "BTV.ug",
  },
  {
    id: "pin-alpha",
    title: "Alpha Digital",
    logo: null,
    group: "Uganda",
    url: "https://streamfi-alphatvdgtl1.zettawiseroutes.com:8181/hls/stream.m3u8",
    tvgId: "Alpha.ug",
  },
  {
    id: "pin-tvwest",
    title: "TV West",
    logo: null,
    group: "Uganda",
    url: "https://stream.hydeinnovations.com/tvwest-flussonic/index.m3u8",
    tvgId: "TVWest.ug",
  },
  {
    id: "pin-fort",
    title: "FORT TV",
    logo: null,
    group: "Uganda",
    url: "https://fort.co-works.org/memfs/87017643-274a-4bc0-a786-7767a0d159c2.m3u8",
    tvgId: "FORT.ug",
  },
  // Rwanda
  {
    id: "pin-tv1rw",
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
    tvgId: "CTV.za",
  },
  {
    id: "pin-soweto",
    title: "Soweto TV",
    logo: null,
    group: "South Africa",
    url: "https://cdn.freevisiontv.co.za/sttv/smil:soweto.stream.smil/playlist.m3u8",
    tvgId: "Soweto.za",
  },
  {
    id: "pin-tshwane",
    title: "Tshwane TV",
    logo: null,
    group: "South Africa",
    url: "https://cdn.freevisiontv.co.za/sttv/smil:tshwane.stream.smil/playlist.m3u8",
    tvgId: "Tshwane.za",
  },
  {
    id: "pin-boktv",
    title: "BOKTV",
    logo: null,
    group: "South Africa",
    url: "https://livestream2.bokradio.co.za/hls/Bok5c.m3u8",
    tvgId: "BOKTV.za",
  },
  // Football (free public — verified live)
  {
    id: "pin-fifa-plus",
    title: "FIFA+",
    logo: null,
    group: "Football",
    url: "https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8",
    tvgId: "FIFAPlus",
  },
  {
    id: "pin-fifa-women",
    title: "FIFA+ Women",
    logo: null,
    group: "Football",
    url: "https://cffda8ff.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/U2Ftc3VuZy1nYl9GSUZBUGx1c3dvbWVuX0hMUw/playlist.m3u8",
    tvgId: "FIFAPlusWomen",
  },
  {
    id: "pin-fifa-fr",
    title: "FIFA+ French",
    logo: null,
    group: "Football",
    url: "https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8",
    tvgId: "FIFAPlusFR",
  },
  {
    id: "pin-premier-sports",
    title: "Premier Sports",
    logo: null,
    group: "Football",
    url: "https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8",
    tvgId: "PremierSports",
  },
  {
    id: "pin-premier-sports-2",
    title: "Premier Sports 2",
    logo: null,
    group: "Football",
    url: "https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8",
    tvgId: "PremierSports2",
  },
  {
    id: "pin-stadium",
    title: "Stadium",
    logo: null,
    group: "Football",
    url: "https://wurl120sports.global.transmit.live/hls/679a907dce42a042c23ace37/v1/stadium_gracenote/samsung_us/latest/main/hls/playlist.m3u8",
    tvgId: "Stadium",
  },
  {
    id: "pin-bein-xtra",
    title: "beIN SPORTS XTRA",
    logo: null,
    group: "Football",
    url: "https://bein-xtra-bein.amagi.tv/playlist.m3u8",
    tvgId: "beINXTRA",
  },
  // Other sports
  {
    id: "pin-redbull",
    title: "Red Bull TV",
    logo: null,
    group: "Sports",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    tvgId: "RedBullTV",
  },
  {
    id: "pin-acc",
    title: "ACC Network",
    logo: null,
    group: "Sports",
    url: "https://raycom-accdn-firetv.amagi.tv/playlist.m3u8",
    tvgId: "ACCNetwork",
  },
  {
    id: "pin-espn8",
    title: "ESPN8 The Ocho",
    logo: null,
    group: "Sports",
    url: "https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8",
    tvgId: "ESPN8",
  },
  {
    id: "pin-flohockey",
    title: "FloHockey",
    logo: null,
    group: "Sports",
    url: "https://amg02278-amg02278c2-flosports-worldwide-9916.playouts.now.amagi.tv/playlist.m3u8",
    tvgId: "FloHockey",
  },
  {
    id: "pin-floracing",
    title: "FloRacing",
    logo: null,
    group: "Sports",
    url: "https://amg02278-amg02278c1-flosports-worldwide-7592.playouts.now.amagi.tv/playlist.m3u8",
    tvgId: "FloRacing",
  },
  {
    id: "pin-fite",
    title: "FITE 24/7",
    logo: null,
    group: "Sports",
    url: "https://d3d85c7qkywguj.cloudfront.net/scheduler/scheduleMaster/263.m3u8",
    tvgId: "FITE",
  },
  {
    id: "pin-golf-30a",
    title: "30A Golf Kingdom",
    logo: null,
    group: "Sports",
    url: "https://30a-tv.com/feeds/vidaa/golf.m3u8",
    tvgId: "30AGolf",
  },
  {
    id: "pin-dd-sports",
    title: "DD Sports",
    logo: null,
    group: "Sports",
    url: "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8",
    tvgId: "DDSports",
  },
  // News
  {
    id: "pin-sabc-news",
    title: "SABC News",
    logo: null,
    group: "News",
    url: "https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/master.m3u8",
    tvgId: "SABCNews.za",
  },
  {
    id: "pin-ln24",
    title: "LN24 SA",
    logo: null,
    group: "News",
    url: "https://cdnstack.internetmultimediaonline.org/ln24/ln24.stream/playlist.m3u8",
    tvgId: "LN24.za",
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
    id: "pin-wildearth",
    title: "WildEarth",
    logo: null,
    group: "Nature",
    url: "https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01290-wildearthmediap-wildearth-samsungnl/playlist.m3u8",
    tvgId: "WildEarth",
  },
  {
    id: "pin-nasa",
    title: "NASA TV",
    logo: null,
    group: "Science",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    tvgId: "NASATV.us",
  },
];

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  source?: "ea" | "full" | "pinned";
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 100, 120);
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
    source: "live-m3u8-only",
  };
}

export const IPTV_SOURCE_URL = "";
