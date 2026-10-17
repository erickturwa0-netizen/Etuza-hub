import { NextResponse } from "next/server";

const BASES = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
];

async function fetchStations(path: string) {
  let lastErr: unknown;
  for (const base of BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "User-Agent": "ETUZA-HUB/1.0", Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.ok) return res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Radio API failed");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = (searchParams.get("country") || "TZ").toUpperCase();
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    let data: unknown;

    if (q) {
      data = await fetchStations(
        `/json/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&limit=${limit}`
      );
    } else if (country === "TOP") {
      data = await fetchStations(`/json/stations/topvote?limit=${limit}&hidebroken=true`);
    } else {
      data = await fetchStations(
        `/json/stations/bycountrycodeexact/${country}?hidebroken=true&limit=${limit}&order=clickcount&reverse=true`
      );
    }

    const list = Array.isArray(data) ? data : [];
    const stations = list
      .filter((s: { url_resolved?: string; url?: string }) => s.url_resolved || s.url)
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
          url: s.url_resolved || s.url,
          favicon: s.favicon || null,
          tags: s.tags || "",
          country: s.country || country,
          bitrate: s.bitrate || 0,
        })
      );

    return NextResponse.json({ stations, source: "radio-browser.info" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ stations: [], error: "Radio API failed" }, { status: 502 });
  }
}
