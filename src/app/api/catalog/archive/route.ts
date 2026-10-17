import { NextResponse } from "next/server";

type CatalogKind = "chinese" | "hindi" | "bongo" | "kungfu";

const QUERIES: Record<CatalogKind, string> = {
  chinese:
    'mediatype:movies AND (title:chinese OR language:chi OR subject:china)',
  kungfu:
    'mediatype:movies AND (title:kungfu OR title:"kung fu" OR title:"martial arts" OR subject:"martial arts")',
  hindi:
    'mediatype:movies AND (language:hindi OR subject:india OR title:bollywood)',
  bongo:
    'mediatype:movies AND (title:bongo OR subject:tanzania OR subject:swahili OR title:swahili)',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = (searchParams.get("kind") || "chinese") as CatalogKind;
    const rows = Math.min(Number(searchParams.get("rows") || 40), 100);
    const q = QUERIES[kind] || QUERIES.chinese;

    const url =
      "https://archive.org/advancedsearch.php?" +
      new URLSearchParams({
        q,
        "fl[]": "identifier,title,year,description",
        output: "json",
        rows: String(rows),
        sort: "downloads desc",
      }).toString();

    // fl[] needs special handling – build manually
    const apiUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      q
    )}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=description&output=json&rows=${rows}&sort[]=downloads+desc`;

    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "ETUZA-HUB/1.0" },
      next: { revalidate: 7200 },
    });

    if (!res.ok) {
      return NextResponse.json({ items: [], error: "Archive search failed" }, { status: 502 });
    }

    const data = await res.json();
    const docs = data?.response?.docs || [];

    const items = docs.map(
      (d: { identifier: string; title?: string; year?: string | number; description?: string }) => ({
        id: d.identifier,
        title: d.title || d.identifier,
        year: d.year ? String(d.year) : null,
        description: typeof d.description === "string" ? d.description.slice(0, 200) : null,
        linkUrl: `https://archive.org/details/${d.identifier}`,
        embedUrl: `https://archive.org/embed/${d.identifier}`,
        coverUrl: `https://archive.org/services/img/${d.identifier}`,
      })
    );

    return NextResponse.json({ items, kind, source: "archive.org" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ items: [], error: "Catalog failed" }, { status: 500 });
  }
}
