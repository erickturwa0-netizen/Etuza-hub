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
 * ONLY free/public m3u8 streams.
 * Every channel always has a logo (real or generated).
 */
export const PINNED_CHANNELS: IptvChannel[] = [
  ch("pin-tbc2", "TBC2", "Tanzania", "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8", "TBC2.tz", "https://i.imgur.com/VkUJt2q.png"),
  ch("pin-dodoma", "Dodoma TV", "Tanzania", "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8", "DodomaTV.tz"),
  ch("pin-akili", "Akili Kids!", "Kenya", "https://m6.livecdn.io/akilikids.co.ke/akilikids.smil/playlist.m3u8", "AkiliKids.ke"),
  ch("pin-inooro", "Inooro TV", "Kenya", "https://live-onesignal.royalmedia.co.ke/live/T-MxRsFebq6zx7k2QFMbLw.m3u8", "InooroTV.ke"),
  ch("pin-meru", "MERU TV", "Kenya", "https://goliveafrica.media:9998/live/628e5c1991061/index.m3u8", "MeruTV.ke"),
  ch("pin-morning-cloud", "Morning Cloud TV", "Kenya", "https://livecdn.live247stream.com/mc/tv/playlist.m3u8", "MorningCloud.ke"),
  ch("pin-younib", "YOUNIB Media TV", "Kenya", "https://goliveafrica.media:9998/live/6257fbe7383d6/index.m3u8", "YOUNIB.ke"),
  ch("pin-capuchin", "Capuchin TV", "Kenya", "https://goliveafrica.media:9998/live/64227f58b8413/index.m3u8", "Capuchin.ke"),
  ch("pin-bukedde1", "Bukedde TV 1", "Uganda", "https://stream.hydeinnovations.com/bukedde1flussonic/index.m3u8", "Bukedde1.ug"),
  ch("pin-bukedde2", "Bukedde TV 2", "Uganda", "https://stream.hydeinnovations.com/bukedde2flussonic/index.m3u8", "Bukedde2.ug"),
  ch("pin-ark", "Ark TV", "Uganda", "https://stream.hydeinnovations.com/arktv-international/index.fmp4.m3u8", "ArkTV.ug"),
  ch("pin-btv", "BTV Uganda", "Uganda", "https://streamfi-alphadgtl1.zettawiseroutes.com:8181/hls/stream.m3u8", "BTV.ug"),
  ch("pin-alpha", "Alpha Digital", "Uganda", "https://streamfi-alphatvdgtl1.zettawiseroutes.com:8181/hls/stream.m3u8", "Alpha.ug"),
  ch("pin-tvwest", "TV West", "Uganda", "https://stream.hydeinnovations.com/tvwest-flussonic/index.m3u8", "TVWest.ug"),
  ch("pin-fort", "FORT TV", "Uganda", "https://fort.co-works.org/memfs/87017643-274a-4bc0-a786-7767a0d159c2.m3u8", "FORT.ug"),
  ch("pin-tv1rw", "TV1 Rwanda", "Rwanda", "https://live.tv1.rw/index.m3u8", "TV1.rw"),
  ch("pin-isibo", "Isibo TV", "Rwanda", "https://5c46fa289c89f.streamlock.net/pub2live/myStream/playlist.m3u8", "Isibo.rw"),
  ch("pin-tv10", "TV10 Rwanda", "Rwanda", "https://5c46fa289c89f.streamlock.net/pub1live/mystream/playlist.m3u8", "TV10.rw"),
  ch("pin-1kzn", "1KZN TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:1kzn.stream.smil/playlist.m3u8", "1KZN.za"),
  ch("pin-ctv", "Cape Town TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:ctv.stream.smil/playlist.m3u8", "CTV.za"),
  ch("pin-soweto", "Soweto TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:soweto.stream.smil/playlist.m3u8", "Soweto.za"),
  ch("pin-tshwane", "Tshwane TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:tshwane.stream.smil/playlist.m3u8", "Tshwane.za"),
  ch("pin-boktv", "BOKTV", "South Africa", "https://livestream2.bokradio.co.za/hls/Bok5c.m3u8", "BOKTV.za"),
  // Football
  ch("pin-fifa-plus", "FIFA+", "Football", "https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8", "FIFAPlus"),
  ch("pin-fifa-women", "FIFA+ Women", "Football", "https://cffda8ff.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/U2Ftc3VuZy1nYl9GSUZBUGx1c3dvbWVuX0hMUw/playlist.m3u8", "FIFAPlusWomen"),
  ch("pin-fifa-fr", "FIFA+ French", "Football", "https://37b4c228.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWZyX0ZJRkFQbHVzRnJlbmNoX0hMUw/playlist.m3u8", "FIFAPlusFR"),
  ch("pin-premier-sports", "Premier Sports", "Football", "https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8", "PremierSports"),
  ch("pin-premier-sports-2", "Premier Sports 2", "Football", "https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8", "PremierSports2"),
  ch("pin-stadium", "Stadium", "Football", "https://wurl120sports.global.transmit.live/hls/679a907dce42a042c23ace37/v1/stadium_gracenote/samsung_us/latest/main/hls/playlist.m3u8", "Stadium"),
  ch("pin-bein-xtra", "beIN SPORTS XTRA", "Football", "https://bein-xtra-bein.amagi.tv/playlist.m3u8", "beINXTRA"),
  // Sports
  ch("pin-redbull", "Red Bull TV", "Sports", "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8", "RedBullTV"),
  ch("pin-acc", "ACC Network", "Sports", "https://raycom-accdn-firetv.amagi.tv/playlist.m3u8", "ACCNetwork"),
  ch("pin-espn8", "ESPN8 The Ocho", "Sports", "https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8", "ESPN8"),
  ch("pin-flohockey", "FloHockey", "Sports", "https://amg02278-amg02278c2-flosports-worldwide-9916.playouts.now.amagi.tv/playlist.m3u8", "FloHockey"),
  ch("pin-floracing", "FloRacing", "Sports", "https://amg02278-amg02278c1-flosports-worldwide-7592.playouts.now.amagi.tv/playlist.m3u8", "FloRacing"),
  ch("pin-fite", "FITE 24/7", "Sports", "https://d3d85c7qkywguj.cloudfront.net/scheduler/scheduleMaster/263.m3u8", "FITE"),
  ch("pin-golf-30a", "30A Golf Kingdom", "Sports", "https://30a-tv.com/feeds/vidaa/golf.m3u8", "30AGolf"),
  ch("pin-dd-sports", "DD Sports", "Sports", "https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8", "DDSports"),
  // News / other
  ch("pin-sabc-news", "SABC News", "News", "https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/master.m3u8", "SABCNews.za"),
  ch("pin-ln24", "LN24 SA", "News", "https://cdnstack.internetmultimediaonline.org/ln24/ln24.stream/playlist.m3u8", "LN24.za"),
  ch("pin-france24", "France 24 English", "News", "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8", "France24.en"),
  ch("pin-wildearth", "WildEarth", "Nature", "https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01290-wildearthmediap-wildearth-samsungnl/playlist.m3u8", "WildEarth"),
  ch("pin-nasa", "NASA TV", "Science", "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8", "NASATV.us"),
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

  let channels = PINNED_CHANNELS.map((c) => ({
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

  if (!channels.length) {
    channels = PINNED_CHANNELS.map((c) => ({
      ...c,
      logo: tvCover(c.title, c.logo),
    }));
  }

  return {
    channels: channels.slice(0, limit),
    total: channels.length,
    source: "live-m3u8-only",
  };
}

export const IPTV_SOURCE_URL = "";
