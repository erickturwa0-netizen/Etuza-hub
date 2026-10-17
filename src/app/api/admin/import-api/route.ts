import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const schema = z.object({
  category: z.enum(["movie", "tv", "radio", "music", "drama", "game", "vpn"]),
  apiUrl: z.string().url(),
});

function normalize(data: unknown, category: string) {
  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "stationuuid" in (data[0] as object)
  ) {
    return (data as {
      stationuuid: string;
      name: string;
      url_resolved?: string;
      url?: string;
      favicon?: string;
      tags?: string;
    }[]).map((s) => ({
      title: s.name,
      linkUrl: s.url_resolved || s.url || "",
      coverUrl: s.favicon || null,
      category: s.tags || category,
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
          : Array.isArray((data as { stations?: unknown[] }).stations)
            ? (data as { stations: unknown[] }).stations
            : [];

  return (raw as Record<string, unknown>[]).slice(0, 50).map((row, i) => {
    const title = String(row.title || row.name || `Item ${i + 1}`);
    const linkUrl = String(
      row.linkUrl ||
        row.link_url ||
        row.url ||
        row.stream ||
        row.stream_url ||
        (Array.isArray(row.embed_urls) ? (row.embed_urls as string[])[0] : "") ||
        row.embed ||
        ""
    );
    let coverUrl = (row.coverUrl ||
      row.cover_url ||
      row.poster_path ||
      row.poster ||
      row.favicon ||
      row.image ||
      null) as string | null;
    if (typeof coverUrl === "string" && coverUrl.startsWith("/")) {
      coverUrl = `https://image.tmdb.org/t/p/w500${coverUrl}`;
    }
    return {
      title,
      linkUrl,
      coverUrl,
      category: String(row.category || row.tags || category),
      description: (row.overview || row.description || null) as string | null,
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

    // Save to ApiSource
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

    let count = 0;
    for (const item of items) {
      await prisma.content.create({
        data: {
          type: category,
          title: item.title.slice(0, 200),
          description: item.description,
          linkUrl: item.linkUrl,
          coverUrl: item.coverUrl,
          linkType: category === "game" || category === "vpn" ? "download" : "stream",
          category: item.category?.slice(0, 100) || null,
          status: "published",
          createdBy: session.userId,
        },
      });
      count++;
    }

    return NextResponse.json({ count, message: `${count} items imported` });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
