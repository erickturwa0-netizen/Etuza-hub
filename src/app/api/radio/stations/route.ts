import { NextResponse } from "next/server";
import { radioCover } from "@/lib/covers";

type Station = {
  id: string;
  name: string;
  url: string;
  favicon: string | null;
  tags: string;
  country: string;
  bitrate: number;
};

const FALLBACK_TZ: Station[] = [
  {
    id: "fb-clouds",
    name: "Clouds FM",
    url: "https://eu6.radioboss.fm:8225/stream",
    tags: "tanzania,music",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-radioone",
    name: "Radio One Tanzania",
    url: "https://radioonetanzania.radioca.st/stream",
    tags: "news,tanzania",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-eastafrica",
    name: "East Africa Radio",
    url: "https://eatv.radioca.st/stream",
    tags: "tanzania,music",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-wasafi",
    name: "Wasafi FM",
    url: "https://streamingv2.shoutcast.com/wasafi-fm",
    tags: "bongo,music",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-tbc",
    name: "TBC Taifa",
    url: "https://streamingv2.shoutcast.com/tbc-taifa",
    tags: "news,government",
    country: "Tanzania",
    bitrate: 64,
    favicon: null,
  },
  {
    id: "fb-passion",
    name: "Passion FM",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    tags: "gospel",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-abood",
    name: "Abood FM",
    url: "https://stream.zeno.fm/eequgfw2x1zuv",
    tags: "music",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-capital",
    name: "Capital Radio TZ",
    url: "https://capitalradio.radioca.st/stream",
    tags: "music,tanzania",
    country: "Tanzania",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-utume",
    name: "Radio Maria Tanzania",
    url: "https://dreamsiteradiocp2.com/proxy/rmtanzania2?mp=/stream",
    tags: "religious",
    country: "Tanzania",
    bitrate: 64,
    favicon: null,
  },
];

const FALLBACK_WORLD: Station[] = [
  {
    id: "fb-bbc",
    name: "BBC World Service",
    url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
    tags: "news",
    country: "United Kingdom",
    bitrate: 128,
    favicon: null,
  },
  {
    id: "fb-npr",
    name: "NPR News",
    url: "https://npr-ice.streamguys1.com/live.mp3",
    tags: "news",
    country: "USA",
    bitrate: 128,
    favicon: null,
  },
];

async function fetchStations(path: string): Promise<unknown[]> {
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
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      /* try next */
    }
  }
  return [];
}

function mapRaw(list: unknown[], fallbackCountry: string): Station[] {
  return (list as {
    stationuuid?: string;
    name?: string;
    url_resolved?: string;
    url?: string;
    favicon?: string;
    tags?: string;
    country?: string;
    bitrate?: number;
  }[])
    .filter((s) => s.url_resolved || s.url)
    .map((s) => ({
      id: s.stationuuid || String(Math.random()),
      name: s.name || "Station",
      url: (s.url_resolved || s.url) as string,
      favicon: radioCover(s.name || "Station", s.favicon || null),
      tags: s.tags || "",
      country: s.country || fallbackCountry,
      bitrate: s.bitrate || 0,
    }));
}

function mergeStations(lists: Station[][]): Station[] {
  const seen = new Set<string>();
  const out: Station[] = [];
  for (const list of lists) {
    for (const s of list) {
      const key = (s.url || "").split("?")[0].toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...s,
        favicon: radioCover(s.name, s.favicon),
      });
    }
  }
  return out;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const country = (searchParams.get("country") || "TZ").toUpperCase();
  const limit = Math.min(Number(searchParams.get("limit") || 400), 800);

  let stations: Station[] = [];
  let source = "fallback";

  try {
    if (q) {
      const data = await fetchStations(
        `/json/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&limit=${limit}`
      );
      stations = mapRaw(data, "World");
      if (stations.length) source = "radio-browser.info";
    } else if (country === "TOP") {
      const data = await fetchStations(
        `/json/stations/topvote?limit=${limit}&hidebroken=true`
      );
      stations = mapRaw(data, "World");
      if (stations.length) source = "radio-browser.info";
    } else if (country === "MUSIC") {
      const [pop, afro, hiphop, gospel] = await Promise.all([
        fetchStations(
          `/json/stations/search?tag=pop&hidebroken=true&limit=200&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/search?tag=afrobeats&hidebroken=true&limit=100&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/search?tag=hiphop&hidebroken=true&limit=100&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/search?tag=gospel&hidebroken=true&limit=100&order=clickcount&reverse=true`
        ),
      ]);
      stations = mergeStations([
        mapRaw(pop, "World"),
        mapRaw(afro, "World"),
        mapRaw(hiphop, "World"),
        mapRaw(gospel, "World"),
      ]);
      if (stations.length) source = "radio-browser.info";
    } else if (country === "TZ" || country === "EA") {
      // Tanzania is small in radio-browser — pull East Africa + name search
      const [tz, ke, ug, rw, byName, top] = await Promise.all([
        fetchStations(
          `/json/stations/bycountrycodeexact/TZ?hidebroken=true&limit=200&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/bycountrycodeexact/KE?hidebroken=true&limit=200&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/bycountrycodeexact/UG?hidebroken=true&limit=150&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/bycountrycodeexact/RW?hidebroken=true&limit=80&order=clickcount&reverse=true`
        ),
        fetchStations(
          `/json/stations/search?name=tanzania&hidebroken=true&limit=100`
        ),
        fetchStations(`/json/stations/topvote?limit=100&hidebroken=true`),
      ]);
      stations = mergeStations([
        FALLBACK_TZ.map((s) => ({
          ...s,
          favicon: radioCover(s.name),
        })),
        mapRaw(tz, "Tanzania"),
        mapRaw(byName, "Tanzania"),
        mapRaw(ke, "Kenya"),
        mapRaw(ug, "Uganda"),
        mapRaw(rw, "Rwanda"),
        mapRaw(top, "World"),
      ]);
      if (stations.length > FALLBACK_TZ.length) source = "radio-browser.info";
      else source = "fallback";
    } else {
      const data = await fetchStations(
        `/json/stations/bycountrycodeexact/${country}?hidebroken=true&limit=${limit}&order=clickcount&reverse=true`
      );
      stations = mapRaw(data, country);
      if (stations.length) source = "radio-browser.info";
    }
  } catch (err) {
    console.error("radio-browser", err);
  }

  if (stations.length === 0) {
    stations = [...FALLBACK_TZ, ...FALLBACK_WORLD].map((s) => ({
      ...s,
      favicon: radioCover(s.name),
    }));
    source = "fallback";
  }

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
    total: stations.length,
    source,
  });
}
