import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type NormItem = {
  title: string;
  linkUrl: string;
  coverUrl: string | null;
  category: string;
  description: string | null;
};

function normalize(data: unknown, category: string): NormItem[] {
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

  const archiveDocs = (data as { response?: { docs?: unknown[] } })?.response?.docs;
  if (Array.isArray(archiveDocs)) {
    return (archiveDocs as { identifier?: string; title?: string }[]).map((d) => {
      const id = d.identifier || "";
      return {
        title: String(d.title || id),
        linkUrl: id ? `https://archive.org/embed/${id}` : "",
        coverUrl: id ? `https://archive.org/services/img/${id}` : null,
        category,
        description: null,
      };
    });
  }

  const itunes = (data as { results?: Record<string, unknown>[] })?.results;
  if (Array.isArray(itunes) && itunes[0] && ("trackId" in itunes[0] || "collectionId" in itunes[0])) {
    return itunes.map((m) => {
      const art = String(m.artworkUrl100 || "");
      return {
        title: String(m.trackName || m.collectionName || "Untitled"),
        linkUrl: String(m.previewUrl || m.trackViewUrl || m.collectionViewUrl || ""),
        coverUrl: art ? art.replace("100x100", "600x600") : null,
        category: String(m.primaryGenreName || category),
        description: (m.longDescription || m.shortDescription || null) as string | null,
      };
    });
  }

  if (Array.isArray(data) && data[0] && typeof data[0] === "object" && "show" in (data[0] as object)) {
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

  if (Array.isArray(data) && data[0] && typeof data[0] === "object" && "game_url" in (data[0] as object)) {
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

  return (raw as Record<string, unknown>[]).slice(0, 50).map((row, i) => ({
    title: String(row.title || row.name || `Item ${i + 1}`),
    linkUrl: String(
      row.linkUrl ||
        row.url ||
        row.stream ||
        row.previewUrl ||
        row.game_url ||
        row.embed ||
        ""
    ),
    coverUrl: (row.coverUrl ||
      row.poster ||
      row.thumbnail ||
      row.favicon ||
      row.image ||
      null) as string | null,
    category: String(row.category || row.genre || category),
    description: (row.overview || row.description || null) as string | null,
  }));
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.apiSource.findMany({
      where: { enabled: true },
    });

    const report: { category: string; count: number; error?: string }[] = [];

    for (const src of sources) {
      if (!src.url?.trim()) {
        report.push({ category: src.category, count: 0, error: "Hakuna URL" });
        continue;
      }

      try {
        const res = await fetch(src.url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "ETUZA-HUB/1.0",
          },
        });
        if (!res.ok) {
          report.push({
            category: src.category,
            count: 0,
            error: `HTTP ${res.status}`,
          });
          continue;
        }

        const data = await res.json();
        const items = normalize(data, src.category).filter((i) => i.linkUrl && i.title);

        // Replace old content of this type so stale API data is gone
        await prisma.content.deleteMany({ where: { type: src.category } });

        let count = 0;
        for (const item of items.slice(0, 50)) {
          await prisma.content.create({
            data: {
              type: src.category,
              title: item.title.slice(0, 200),
              description: item.description,
              linkUrl: item.linkUrl,
              coverUrl: item.coverUrl,
              linkType:
                src.category === "game" || src.category === "vpn"
                  ? "download"
                  : "stream",
              category: item.category?.slice(0, 100) || null,
              status: "published",
              createdBy: session.userId,
            },
          });
          count++;
        }
        report.push({ category: src.category, count });
      } catch (e) {
        report.push({
          category: src.category,
          count: 0,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      report,
      total: report.reduce((s, r) => s + r.count, 0),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import all failed" }, { status: 500 });
  }
}
