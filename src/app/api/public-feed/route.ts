import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Fetch configured public API for a category and normalize a simple list.
 * Does not require API keys – admin pastes public URL only.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "movie";

    let source: { url: string; enabled: boolean; name: string } | null = null;
    try {
      source = await prisma.apiSource.findUnique({ where: { category } });
    } catch {
      source = null;
    }

    if (!source || !source.enabled || !source.url?.trim()) {
      return NextResponse.json({
        items: [],
        message: "Hakuna public API iliyowekwa kwa category hii (Admin → Settings).",
      });
    }

    const res = await fetch(source.url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { items: [], error: `API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const items = normalizeFeed(data, category);

    return NextResponse.json({
      items,
      source: source.name,
      url: source.url,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ items: [], error: "Feed failed" }, { status: 500 });
  }
}

function normalizeFeed(data: unknown, category: string) {
  // Radio Browser format
  if (Array.isArray(data) && data[0] && typeof data[0] === "object" && "stationuuid" in (data[0] as object)) {
    return (data as {
      stationuuid: string;
      name: string;
      url_resolved?: string;
      url?: string;
      favicon?: string;
      tags?: string;
    }[]).map((s) => ({
      id: s.stationuuid,
      title: s.name,
      linkUrl: s.url_resolved || s.url || "",
      coverUrl: s.favicon || null,
      category: s.tags || category,
    }));
  }

  // { results: [...] } or { items: [...] } or { data: [...] } or raw array
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: unknown[] }).results
      : Array.isArray((data as { items?: unknown }).items)
        ? (data as { items: unknown[] }).items
        : Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : Array.isArray((data as { stations?: unknown }).stations)
            ? (data as { stations: unknown[] }).stations
            : [];

  return (raw as Record<string, unknown>[]).slice(0, 100).map((row, i) => {
    const title =
      String(row.title || row.name || row.station || row.label || `Item ${i + 1}`);
    const linkUrl = String(
      row.linkUrl ||
        row.link_url ||
        row.url ||
        row.stream ||
        row.stream_url ||
        row.file ||
        (Array.isArray(row.embed_urls) ? row.embed_urls[0] : "") ||
        row.embed ||
        ""
    );
    const coverUrl =
      (row.coverUrl ||
        row.cover_url ||
        row.poster_path ||
        row.poster ||
        row.favicon ||
        row.image ||
        row.logo ||
        null) as string | null;

    return {
      id: String(row.id || row.identifier || row.stationuuid || i),
      title,
      linkUrl,
      coverUrl:
        typeof coverUrl === "string" && coverUrl.startsWith("/")
          ? `https://image.tmdb.org/t/p/w500${coverUrl}`
          : coverUrl,
      category: String(row.category || row.tags || category),
      description: row.overview || row.description || null,
    };
  });
}
