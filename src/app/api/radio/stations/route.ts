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
    favicon: radioCover("BBC World Service"),
  },
  {
    id: "fb-npr",
    name: "NPR News",
    url: "https://npr-ice.streamguys1.com/live.mp3",
    tags: "news",
    country: "USA",
    bitrate: 128,
    favicon: radioCover("NPR News"),
  },
];

async function fetchStations(path: string) {
  const bases = [
    "https://de1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info",
    "https://fr1.api.radio-browser.info",
  ];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "User-Agent": "ETUZA-HUB/1.0", Accept: "application/json" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      /* try next */
    }
  }
  return [];
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const country = (searchParams.get("country") || "TZ").toUpperCase();
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

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
    let data: unknown = [];
    if (q) {
      data = await fetchStations(
        `/json/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&limit=${limit}`
      );
    } else if (country === "TOP") {
      data = await fetchStations(
        `/json/stations/topvote?limit=${limit}&hidebroken=true`
      );
    } else if (country === "MUSIC") {
      data = await fetchStations(
        `/json/stations/search?tag=pop&hidebroken=true&limit=${limit}&order=clickcount&reverse=true`
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

  if (stations.length === 0) {
    stations =
      country === "TOP" || country === "MUSIC"
        ? [...FALLBACK_WORLD, ...FALLBACK_TZ]
        : [...FALLBACK_TZ, ...FALLBACK_WORLD];
    source = "fallback";
  } else if (country === "TZ") {
    const seen = new Set(stations.map((s) => s.name.toLowerCase()));
    for (const e of FALLBACK_TZ) {
      if (!seen.has(e.name.toLowerCase())) {
        stations.unshift({ ...e, favicon: radioCover(e.name) });
      }
    }
  }

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
  }

  return NextResponse.json({
    stations: stations.slice(0, limit),
    source,
  });
}
