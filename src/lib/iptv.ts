import { tvCover } from "@/lib/covers";
import { getCachedLiveTvIds } from "@/lib/catalog-sync";
import { fetchModoboFreeChannels } from "@/lib/modobo";

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

/** Free/public m3u8 — health-checked at sync time */
export const PINNED_CHANNELS: IptvChannel[] = [
  ch("pin-tbc2", "TBC2", "Tanzania", "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8", "TBC2.tz", "https://i.imgur.com/VkUJt2q.png"),
  ch("pin-dodoma", "Dodoma TV", "Tanzania", "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8", "DodomaTV.tz"),
  ch("pin-akili", "Akili Kids!", "Kenya", "https://m6.livecdn.io/akilikids.co.ke/akilikids.smil/playlist.m3u8", "AkiliKids.ke", "https://i.imgur.com/xFm2co6.png"),
  ch("pin-inooro", "Inooro TV", "Kenya", "https://live-onesignal.royalmedia.co.ke/live/T-MxRsFebq6zx7k2QFMbLw.m3u8", "InooroTV.ke", "https://i.imgur.com/5qFJtmo.png"),
  ch("pin-meru", "MERU TV", "Kenya", "https://goliveafrica.media:9998/live/628e5c1991061/index.m3u8", "MeruTV.ke"),
  ch("pin-morning-cloud", "Morning Cloud TV", "Kenya", "https://livecdn.live247stream.com/mc/tv/playlist.m3u8", "MorningCloud.ke", "https://i.imgur.com/Lxfd2ip.png"),
  ch("pin-younib", "YOUNIB Media TV", "Kenya", "https://goliveafrica.media:9998/live/6257fbe7383d6/index.m3u8", "YOUNIB.ke", "https://i.imgur.com/LtiPOYG.jpg"),
  ch("pin-capuchin", "Capuchin TV", "Kenya", "https://goliveafrica.media:9998/live/64227f58b8413/index.m3u8", "Capuchin.ke", "https://i.imgur.com/VCDSjX7.png"),
  ch("pin-bukedde1", "Bukedde TV 1", "Uganda", "https://stream.hydeinnovations.com/bukedde1flussonic/index.m3u8", "Bukedde1.ug", "https://i.imgur.com/HFq5QlJ.png"),
  ch("pin-bukedde2", "Bukedde TV 2", "Uganda", "https://stream.hydeinnovations.com/bukedde2flussonic/index.m3u8", "Bukedde2.ug", "https://i.imgur.com/ukwPZeY.png"),
  ch("pin-ark", "Ark TV", "Uganda", "https://stream.hydeinnovations.com/arktv-international/index.fmp4.m3u8", "ArkTV.ug", "https://i.imgur.com/yCHNZXD.png"),
  ch("pin-tvwest", "TV West", "Uganda", "https://stream.hydeinnovations.com/tvwest-flussonic/index.m3u8", "TVWest.ug", "https://i.imgur.com/EiJzkIz.png"),
  ch("pin-tv1rw", "TV1 Rwanda", "Rwanda", "https://live.tv1.rw/index.m3u8", "TV1.rw"),
  ch("pin-1kzn", "1KZN TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:1kzn.stream.smil/playlist.m3u8", "1KZN.za"),
  ch("pin-ctv", "Cape Town TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:ctv.stream.smil/playlist.m3u8", "CTV.za", "https://i.imgur.com/Y8FK1Kk.png"),
  ch("pin-soweto", "Soweto TV", "South Africa", "https://cdn.freevisiontv.co.za/sttv/smil:soweto.stream.smil/playlist.m3u8", "Soweto.za"),
  ch("pin-france24", "France 24 English", "News", "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8", "France24.en"),
  ch("pin-abc-news", "ABC News", "News", "https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8", "ABCNews", "https://i.imgur.com/BrW7gk8.png"),
  ch("pin-nasa", "NASA TV", "Science", "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8", "NASATV.us"),
  ch("pin-redbull", "Red Bull TV", "Sports", "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8", "RedBullTV"),
  ch("pin-fifa-plus", "FIFA+", "Football", "https://d2w9q46ikgrcwx.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-of5cbk3sav3w5/v1/sysdata_s_p_a_fifa_7/samsungheadend_us/latest/main/hls/playlist.m3u8", "FIFAPlus"),
  ch("pin-premier-sports", "Premier Sports", "Football", "https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8", "PremierSports"),
  ch("pin-stadium", "Stadium", "Football", "https://wurl120sports.global.transmit.live/hls/679a907dce42a042c23ace37/v1/stadium_gracenote/samsung_us/latest/main/hls/playlist.m3u8", "Stadium"),
  ch("pin-bein-xtra", "beIN SPORTS XTRA", "Football", "https://bein-xtra-bein.amagi.tv/playlist.m3u8", "beINXTRA"),
  // Extra free public
  ch("pin-aljazeera", "Al Jazeera English", "News", "https://live-hls-web-aje.getaj.net/AJE/01.m3u8", "AlJazeera.en"),
  ch("pin-dw", "DW English", "News", "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8", "DW.en"),
  ch("pin-cgtn", "CGTN", "News", "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8", "CGTN.en"),
  ch("pin-bloomberg", "Bloomberg", "News", "https://bloomberg.com/media-manifest/streams/us.m3u8", "Bloomberg"),
];

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  liveOnly?: boolean;
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 200, 300);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();
  const liveOnly = opts?.liveOnly !== false;

  let channels = PINNED_CHANNELS.map((c) => ({
    ...c,
    logo: tvCover(c.title, c.logo),
  }));

  // Merge free Modobo channels (catalog). Streams need app encryption —
  // we attach logo/title; playable ones still come from PINNED above.
  try {
    const modobo = await fetchModoboFreeChannels();
    const pinnedTitles = new Set(
      channels.map((c) => c.title.toLowerCase().replace(/\s+/g, " "))
    );
    for (const m of modobo) {
      const title = (m.title || "").trim();
      if (!title) continue;
      const key = title.toLowerCase().replace(/\s+/g, " ");
      if (pinnedTitles.has(key)) continue;
      pinnedTitles.add(key);
      const grp =
        m.category_name ||
        (m.category_names && m.category_names[0]) ||
        "Modobo";
      // Placeholder stream — player may fail; catalog still visible
      // Prefer known public news/sports aliases when title matches
      let url = "";
      const t = key;
      if (t.includes("france 24"))
        url = "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8";
      else if (t.includes("al jazeera"))
        url = "https://live-hls-web-aje.getaj.net/AJE/01.m3u8";
      else if (t.includes("nasa"))
        url = "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8";
      else if (t.includes("red bull"))
        url =
          "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8";

      if (!url && liveOnly) continue; // skip non-playable when liveOnly

      channels.push({
        id: `modobo-${m.id}`,
        title,
        group: grp,
        url: url || `modobo://channel/${m.id}`,
        tvgId: null,
        logo: tvCover(title, m.logo),
      });
    }
  } catch (e) {
    console.error("modobo merge", e);
  }

  if (liveOnly) {
    const liveIds = await getCachedLiveTvIds();
    if (liveIds && liveIds.length) {
      const set = new Set(liveIds);
      // Keep pinned that are live + any modobo with real http url
      channels = channels.filter(
        (c) => set.has(c.id) || c.url.startsWith("http")
      );
    }
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

  // Only return channels with real stream URLs for playback list
  const playable = channels.filter((c) => c.url.startsWith("http"));

  if (!playable.length && !q && !group) {
    return {
      channels: PINNED_CHANNELS.map((c) => ({
        ...c,
        logo: tvCover(c.title, c.logo),
      })),
      total: PINNED_CHANNELS.length,
      source: "pinned-fallback",
    };
  }

  return {
    channels: playable.slice(0, limit),
    total: playable.length,
    source: "pinned+modobo-free",
  };
}

export const IPTV_SOURCE_URL = "https://cdn.apisfast.top/api/v1/channels";
