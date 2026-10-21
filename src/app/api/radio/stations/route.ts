import { NextResponse } from "next/server";
import { radioCover } from "@/lib/covers";

const FALLBACK_TZ = [
  {
    id: "fb-clouds",
    name: "Clouds FM",
    url: "https://eu6.radioboss.fm:8225/stream",
    tags: "tanzania,music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-radioone",
    name: "Radio One Tanzania",
    url: "https://radioonetanzania.radioca.st/stream",
    tags: "news,tanzania",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-eastafrica",
    name: "East Africa Radio",
    url: "https://eatv.radioca.st/stream",
    tags: "tanzania,music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-wasafi",
    name: "Wasafi FM",
    url: "https://streamingv2.shoutcast.com/wasafi-fm",
    tags: "bongo,music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-tbc",
    name: "TBC Taifa",
    url: "https://streamingv2.shoutcast.com/tbc-taifa",
    tags: "news,government",
    country: "Tanzania",
    bitrate: 64,
  },
  {
    id: "fb-passion",
    name: "Passion FM",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    tags: "gospel",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-abood",
    name: "Abood FM",
    url: "https://stream.zeno.fm/eequgfw2x1zuv",
    tags: "music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-capital",
    name: "Capital Radio TZ",
    url: "https://capitalradio.radioca.st/stream",
    tags: "music,tanzania",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-utume",
    name: "Radio Maria Tanzania",
    url: "https://dreamsiteradiocp2.com/proxy/rmtanzania2?mp=/stream",
    tags: "religious",
    country: "Tanzania",
    bitrate: 64,
  },
].map((s) => ({
  ...s,
  favicon: radioCover(s.name),
}));

const FALLBACK_WORLD = [
  {
    id: "fb-bbc",
    name: "BBC World Service",
    url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
    tags: "news",
    country: "United Kingdom",
    bitrate: 128,
  },
  {
    id: "fb-npr",
    name: "NPR News",
    url: "https://npr-ice.streamguys1.com/live.mp3",
    tags: "news",
    country: "USA",
    bitrate: 128,
  },
  {
    id: "fb-kexp",
    name: "KEXP Seattle",
    url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    tags: "alternative,music",
    country: "USA",
    bitrate: 128,
  },
  {
    id: "fb-soma",
    name: "SomaFM Groove Salad",
    url: "https://ice1.somafm.com/groovesalad-128-mp3",
    tags: "chill,electronic",
    country: "USA",
    bitrate: 128,
  },
  {
    id: "fb-classic",
    name: "Classic FM",
    url: "https://media-ssl.musicradio.com/ClassicFM",
    tags: "classical",
    country: "United Kingdom",
    bitrate: 128,
  },
  {
    id: "fb-capitaluk",
    name: "Capital UK",
    url: "https://media-ssl.musicradio.com/Capital",
    tags: "pop",
    country: "United Kingdom",
    bitrate: 128,
  },
  {
    id: "fb-franceinfo",
    name: "France Info",
    url: "https://stream.radiofrance.fr/franceinfo/franceinfo_hifi.m3u8",
    tags: "news",
    country: "France",
    bitrate: 192,
  },
].map((s) => ({
  ...s,
  favicon: radioCover(s.name),
}));

const BASES = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

async function fetchStations(path: string) {
  let lastErr: unknown;
  for (const base of BASES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`${base}${path}`, {
        headers: {
          "User-Agent": "ETUZA-HUB/1.0 (etuza-hub-v2.vercel.app)",
          Accept: "application/json",
        },
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      if (res.ok) return res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Radio API failed");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "TZ").toUpperCase();
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  let stations: {
    id: string;
    name: string;
    url: string;
    favicon: string | null;
    tags: string;
    country: string;
    bitrate: number;
  }[] = [];
  let source = "fallback";

  try {
    let data: unknown;
    if (q) {
      data = await fetchStations(
        `/json/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&limit=${limit}`
      );
    } else if (country === "TOP") {
      data = await fetchStations(
        `/json/stations/topvote?limit=${limit}&hidebroken=true`
      );
    } else {
      data = await fetchStations(
        `/json/stations/bycountrycodeexact/${country}?hidebroken=true&limit=${limit}&order=clickcount&reverse=true`
      );
    }

    const list = Array.isArray(data) ? data : [];
    stations = list
      .filter(
        (s: { url_resolved?: string; url?: string }) =>
          s.url_resolved || s.url
      )
      .map(
        (s: {
          stationuuid: string;
          name: string;
          url_resolved?: string;
          url?: string;
          favicon?: string;
          tags?: string;
          country?: string;
          bitrate?: number;
        }) => ({
          id: s.stationuuid,
          name: s.name,
          url: (s.url_resolved || s.url) as string,
          favicon: radioCover(s.name, s.favicon || null),
          tags: s.tags || "",
          country: s.country || country,
          bitrate: s.bitrate || 0,
        })
      );
    if (stations.length) source = "radio-browser.info";
  } catch (err) {
    console.error("radio-browser", err);
  }

  if (stations.length === 0 || country === "TOP") {
    const extra =
      country === "TOP"
        ? FALLBACK_WORLD
        : country === "TZ"
          ? FALLBACK_TZ
          : [...FALLBACK_TZ, ...FALLBACK_WORLD];

    if (stations.length === 0) {
      stations = extra;
      source = "fallback";
    } else if (country === "TOP") {
      const seen = new Set(stations.map((s) => s.name.toLowerCase()));
      for (const e of FALLBACK_WORLD) {
        if (!seen.has(e.name.toLowerCase())) stations.push(e);
      }
    }
  }

  // Ensure every station has a cover
  stations = stations.map((s) => ({
    ...s,
    favicon: radioCover(s.name, s.favicon),
  }));

  if (q) {
    const qq = q.toLowerCase();
    stations = stations.filter(
      (s) =>
        s.name.toLowerCase().includes(qq) ||
        s.tags.toLowerCase().includes(qq) ||
        s.country.toLowerCase().includes(qq)
    );
    if (!stations.length) {
      stations = [...FALLBACK_TZ, ...FALLBACK_WORLD].filter(
        (s) =>
          s.name.toLowerCase().includes(qq) ||
          s.tags.toLowerCase().includes(qq)
      );
      source = "fallback";
    }
  }

  return NextResponse.json({
    stations: stations.slice(0, limit),
    source,
  });
}
