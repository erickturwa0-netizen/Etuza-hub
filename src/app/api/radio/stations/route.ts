import { NextResponse } from "next/server";

const FALLBACK_TZ = [
  {
    id: "fb-clouds",
    name: "Clouds FM",
    url: "https://eu6.radioboss.fm:8225/stream",
    favicon: "https://ui-avatars.com/api/?name=Clouds+FM&background=831843&color=fff&size=128&bold=true",
    tags: "tanzania,music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-radioone",
    name: "Radio One Tanzania",
    url: "https://radioonetanzania.radioca.st/stream",
    favicon: "https://ui-avatars.com/api/?name=Radio+One&background=831843&color=fff&size=128&bold=true",
    tags: "news,tanzania",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-eastafrica",
    name: "East Africa Radio",
    url: "https://eatv.radioca.st/stream",
    favicon: "https://ui-avatars.com/api/?name=EA+Radio&background=831843&color=fff&size=128&bold=true",
    tags: "tanzania,music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-wasafi",
    name: "Wasafi FM",
    url: "https://streamingv2.shoutcast.com/wasafi-fm",
    favicon: "https://ui-avatars.com/api/?name=Wasafi&background=831843&color=fff&size=128&bold=true",
    tags: "bongo,music",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-tbc",
    name: "TBC Taifa",
    url: "https://streamingv2.shoutcast.com/tbc-taifa",
    favicon: "https://ui-avatars.com/api/?name=TBC&background=831843&color=fff&size=128&bold=true",
    tags: "news,government",
    country: "Tanzania",
    bitrate: 64,
  },
  {
    id: "fb-passion",
    name: "Passion FM",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    favicon: "https://ui-avatars.com/api/?name=Passion&background=831843&color=fff&size=128&bold=true",
    tags: "gospel",
    country: "Tanzania",
    bitrate: 128,
  },
  {
    id: "fb-abood",
    name: "Abood FM",
    url: "https://stream.zeno.fm/eequgfw2x1zuv",
    favicon: "https://ui-avatars.com/api/?name=Abood&background=831843&color=fff&size=128&bold=true",
    tags: "music",
    country: "Tanzania",
    bitrate: 128,
  },
];

const FALLBACK_WORLD = [
  {
    id: "fb-bbc",
    name: "BBC World Service",
    url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
    favicon: "https://ui-avatars.com/api/?name=BBC&background=bb0000&color=fff&size=128&bold=true",
    tags: "news",
    country: "United Kingdom",
    bitrate: 128,
  },
  {
    id: "fb-npr",
    name: "NPR News",
    url: "https://npr-ice.streamguys1.com/live.mp3",
    favicon: "https://ui-avatars.com/api/?name=NPR&background=1a1a1a&color=fff&size=128&bold=true",
    tags: "news",
    country: "USA",
    bitrate: 128,
  },
  {
    id: "fb-kexp",
    name: "KEXP Seattle",
    url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    favicon: "https://ui-avatars.com/api/?name=KEXP&background=ff6600&color=fff&size=128&bold=true",
    tags: "alternative,music",
    country: "USA",
    bitrate: 128,
  },
  {
    id: "fb-soma",
    name: "SomaFM Groove Salad",
    url: "https://ice1.somafm.com/groovesalad-128-mp3",
    favicon: "https://ui-avatars.com/api/?name=SomaFM&background=2a5f7a&color=fff&size=128&bold=true",
    tags: "chill,electronic",
    country: "USA",
    bitrate: 128,
  },
  {
    id: "fb-classic",
    name: "Classic FM",
    url: "https://media-ssl.musicradio.com/ClassicFM",
    favicon: "https://ui-avatars.com/api/?name=Classic&background=6b2d5b&color=fff&size=128&bold=true",
    tags: "classical",
    country: "United Kingdom",
    bitrate: 128,
  },
  {
    id: "fb-capitaluk",
    name: "Capital UK",
    url: "https://media-ssl.musicradio.com/Capital",
    favicon: "https://ui-avatars.com/api/?name=Capital+UK&background=00a0e3&color=fff&size=128&bold=true",
    tags: "pop",
    country: "United Kingdom",
    bitrate: 128,
  },
  {
    id: "fb-franceinfo",
    name: "France Info",
    url: "https://stream.radiofrance.fr/franceinfo/franceinfo_hifi.m3u8",
    favicon: "https://ui-avatars.com/api/?name=France&background=002395&color=fff&size=128&bold=true",
    tags: "news",
    country: "France",
    bitrate: 192,
  },
];

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
          favicon: s.favicon || null,
          tags: s.tags || "",
          country: s.country || country,
          bitrate: s.bitrate || 0,
        })
      );
    if (stations.length) source = "radio-browser.info";
  } catch (err) {
    console.error("radio-browser", err);
  }

  // Always ensure TOP / TZ have something
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
      // merge world fallbacks at end so list never feels empty
      const seen = new Set(stations.map((s) => s.name.toLowerCase()));
      for (const e of FALLBACK_WORLD) {
        if (!seen.has(e.name.toLowerCase())) stations.push(e);
      }
    }
  }

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
