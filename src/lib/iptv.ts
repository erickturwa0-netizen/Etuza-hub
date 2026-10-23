import { tvCover } from "@/lib/covers";
import {
  fetchMfalmePlayable,
  fetchMfalmeChannels,
  isDirectPlayable,
} from "@/lib/mfalme";
import { fetchStreamFreeMatches } from "@/lib/streamfree";

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

/** Free/public m3u8 */
export const PINNED_CHANNELS: IptvChannel[] = [
  ch("pin-safari", "Safari Channel", "Tanzania", "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_12bb7dc0590211f1951119e8afeb4224/index.fmp4.m3u8", "Safari.tz"),
  ch("pin-tbc2", "TBC2", "Tanzania", "https://stream-134630.castr.net/5fe35eae8c53540cab83659a/live_44ed95e05b6d11f18d5d85805abbdd6f/index.m3u8", "TBC2.tz", "https://i.imgur.com/VkUJt2q.png"),
  ch("pin-dodoma", "Dodoma TV", "Tanzania", "https://goliveafrica.media:9998/live/625965017ed69/index.m3u8", "DodomaTV.tz"),
  ch("pin-mahaasin", "Mahaasin TV", "Tanzania", "https://mahaasintv.livebox.co.in/mahaasintvhls/mahaasintv.m3u8", "MahaasinTV.tz"),
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
  ch("pin-aljazeera", "Al Jazeera English", "News", "https://live-hls-web-aje.getaj.net/AJE/01.m3u8", "AlJazeera.en"),
  ch("pin-dw", "DW English", "News", "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8", "DW.en"),
  ch("pin-cgtn", "CGTN", "News", "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8", "CGTN.en"),
];

export function isPlayableStream(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (url.startsWith("catalog://")) return false;
  if (url.includes("cdn.apisfast.top")) return false;
  if (url.includes("/api/v1/channels")) return false;
  if (/player\.php|osmanitv\.com\/v3\/player/i.test(url)) return false;
  return isDirectPlayable(url) || /m3u8|castr\.net|\.mp4/i.test(url);
}

export async function loadIptvChannels(opts?: {
  q?: string;
  group?: string;
  limit?: number;
  liveOnly?: boolean;
}): Promise<{ channels: IptvChannel[]; total: number; source: string }> {
  const limit = Math.min(opts?.limit || 300, 400);
  const q = (opts?.q || "").toLowerCase().trim();
  const group = (opts?.group || "").toLowerCase().trim();
  const liveOnly = opts?.liveOnly === true;

  let channels: IptvChannel[] = PINNED_CHANNELS.map((c) => ({
    ...c,
    logo: tvCover(c.title, c.logo),
  }));

  const seen = new Set(
    channels.map((c) => c.title.toLowerCase().replace(/\s+/g, " "))
  );

  // 1) Mfalme TV — playable + free catalog (NO Modobo)
  try {
    const mfalmePlayable = await fetchMfalmePlayable();
    for (const m of mfalmePlayable) {
      const key = m.title.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      channels.push({
        id: `mfalme-${m.id}`,
        title: m.title,
        group: m.group || "Mfalme Free",
        url: m.url,
        tvgId: null,
        logo: tvCover(m.title, m.logo),
      });
    }

    if (!liveOnly) {
      const all = await fetchMfalmeChannels();
      for (const m of all) {
        if (m.access !== "free") continue;
        const key = m.title.toLowerCase().replace(/\s+/g, " ");
        if (seen.has(key)) continue;
        seen.add(key);
        channels.push({
          id: `mfalme-cat-${m.id}`,
          title: m.title,
          group: "Mfalme Free",
          url: m.url || `catalog://mfalme/${m.id}`,
          tvgId: null,
          logo: tvCover(m.title, m.logo),
        });
      }
    }
  } catch (e) {
    console.error("mfalme merge", e);
  }

  // 2) StreamFree / Orizon — mechi catalog
  try {
    const matches = await fetchStreamFreeMatches();
    for (const m of matches) {
      if (liveOnly && !m.playable) continue;
      const key = m.title.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      channels.push({
        id: `sf-${m.id}`,
        title: m.title,
        group: m.group,
        url: m.url || `catalog://streamfree/${m.id}`,
        tvgId: null,
        logo: tvCover(m.title, m.logo),
      });
    }
  } catch (e) {
    console.error("streamfree merge", e);
  }

  // Modobo intentionally removed — encryption / no public streams

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

  const sorted = [...channels].sort((a, b) => {
    const aOk = isPlayableStream(a.url) ? 0 : 1;
    const bOk = isPlayableStream(b.url) ? 0 : 1;
    return aOk - bOk;
  });

  return {
    channels: sorted.slice(0, limit),
    total: sorted.length,
    source: "pinned+mfalme+streamfree",
  };
}

export const IPTV_SOURCE_URL = "https://api.mfalmeapp.online/api/channels";
