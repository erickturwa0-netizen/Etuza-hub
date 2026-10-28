import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  category: z.enum(["movie", "tv", "radio", "music", "drama", "game", "vpn"]),
  apiUrl: z.string().url(),
});

type NormItem = {
  title: string;
  linkUrl: string;
  coverUrl: string | null;
  category: string;
  description: string | null;
};

function normalize(data: unknown, category: string): NormItem[] {
  const eliteItems = (data as { items?: unknown[]; creator?: string })?.items;
  if (
    Array.isArray(eliteItems) &&
    eliteItems[0] &&
    typeof eliteItems[0] === "object" &&
    ("tmdb_id" in (eliteItems[0] as object) ||
      "poster" in (eliteItems[0] as object))
  ) {
    return (eliteItems as {
      id?: string;
      tmdb_id?: string;
      name?: string;
      title?: string;
      poster?: string;
      overview?: string;
      year?: string;
      type?: string;
      stream?: string;
      play?: string;
    }[]).map((row) => {
      const id = String(row.tmdb_id || row.id || "");
      const media =
        row.type === "tv" || row.type === "series" || category === "drama"
          ? "tv"
          : "movie";
      const linkUrl = id
        ? `https://player.videasy.to/${media}/${id}`
        : row.stream
          ? `https://eliteplex-api.vercel.app${row.stream}`
          : "";
      return {
        title: String(row.name || row.title || "Untitled"),
        linkUrl,
        coverUrl: row.poster || null,
        category: row.year ? `${category} · ${row.year}` : category,
        description: row.overview ? String(row.overview).slice(0, 500) : null,
      };
    });
  }

  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "stationuuid" in (data[0] as object)
  ) {
    return (data as {
      name: string;
      url_resolved?: string;
      url?: string;
      favicon?: string;
      tags?: string;
    }[]).map((s) => ({
      title: (s.name || "").trim() || "Radio",
      linkUrl: s.url_resolved || s.url || "",
      coverUrl: s.favicon || null,
      category: s.tags || category,
      description: null,
    }));
  }

  const itunes = (data as { results?: Record<string, unknown>[] })?.results;
  if (
    Array.isArray(itunes) &&
    itunes[0] &&
    ("trackId" in itunes[0] || "collectionId" in itunes[0])
  ) {
    return itunes.map((m) => {
      const art = String(m.artworkUrl100 || "");
      const poster = art ? art.replace("100x100", "600x600") : null;
      const link = String(
        m.previewUrl || m.trackViewUrl || m.collectionViewUrl || ""
      );
      return {
        title: String(m.trackName || m.collectionName || "Untitled"),
        linkUrl: link,
        coverUrl: poster,
        category: String(m.primaryGenreName || category),
        description: (m.longDescription || m.shortDescription || null) as
          | string
          | null,
      };
    });
  }

  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "show" in (data[0] as object)
  ) {
    return (data as {
      show: {
        id: number;
        name: string;
        genres?: string[];
        image?: { medium?: string } | null;
        summary?: string | null;
        url?: string;
      };
    }[]).map(({ show }) => ({
      title: show.name,
      linkUrl: show.url || `https://www.tvmaze.com/shows/${show.id}`,
      coverUrl: show.image?.medium || null,
      category: (show.genres || []).join(", ") || category,
      description: show.summary
        ? show.summary.replace(/<[^>]+>/g, "").slice(0, 500)
        : null,
    }));
  }

  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "game_url" in (data[0] as object)
  ) {
    return (data as {
      title: string;
      thumbnail?: string;
      short_description?: string;
      genre?: string;
      game_url: string;
    }[]).map((g) => ({
      title: g.title,
      linkUrl: g.game_url,
      coverUrl: g.thumbnail || null,
      category: g.genre || category,
      description: g.short_description || null,
    }));
  }

  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { results?: unknown[] }).results)
      ? (data as { results: unknown[] }).results
      : Array.isArray((data as { items?: unknown[] }).items)
        ? (data as { items: unknown[] }).items
        : Array.isArray((data as { data?: unknown[] }).data)
          ? (data as { data: unknown[] }).data
          : [];

  // NO LIMIT
  return (raw as Record<string, unknown>[]).map((row, i) => {
    const title = String(row.title || row.name || `Item ${i + 1}`);
    const linkUrl = String(
      row.linkUrl ||
        row.link_url ||
        row.url ||
        row.stream ||
        row.stream_url ||
        row.previewUrl ||
        row.game_url ||
        (Array.isArray(row.embed_urls) ? (row.embed_urls as string[])[0] : "") ||
        row.embed ||
        ""
    );
    let coverUrl = (row.coverUrl ||
      row.cover_url ||
      row.poster_path ||
      row.poster ||
      row.favicon ||
      row.thumbnail ||
      row.image ||
      null) as string | null;
    if (typeof coverUrl === "string" && coverUrl.startsWith("/")) {
      coverUrl = `https://image.tmdb.org/t/p/w500${coverUrl}`;
    }
    return {
      title,
      linkUrl,
      coverUrl,
      category: String(row.category || row.tags || row.genre || category),
      description: (row.overview ||
        row.description ||
        row.short_description ||
        null) as string | null,
    };
  });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { category, apiUrl } = parsed.data;

    await prisma.apiSource.upsert({
      where: { category },
      create: {
        category,
        name: `${category} public API`,
        url: apiUrl,
        enabled: true,
      },
      update: { url: apiUrl, enabled: true },
    });

    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API imerudisha status ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const items = normalize(data, category).filter((i) => i.linkUrl && i.title);

    if (items.length === 0) {
      return NextResponse.json({
        count: 0,
        error: "API haikutoa items zenye title + url",
      });
    }

    // NO LIMIT — import everything
    let count = 0;
    const BATCH = 100;
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      await prisma.content.createMany({
        data: batch.map((item) => ({
          type: category,
          title: item.title.slice(0, 200),
          description: item.description,
          linkUrl: item.linkUrl,
          coverUrl: item.coverUrl,
          linkType:
            category === "game" || category === "vpn" ? "download" : "stream",
          category: item.category?.slice(0, 100) || null,
          status: "published",
          createdBy: session.userId,
        })),
        skipDuplicates: true,
      });
      count += batch.length;
    }

    return NextResponse.json({
      count,
      message: `${count} items imported (unlimited)`,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
