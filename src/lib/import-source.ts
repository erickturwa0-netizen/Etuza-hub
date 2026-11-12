import { prisma } from "@/lib/prisma";

type Norm = {
  id: string;
  title: string;
  linkUrl: string;
  coverUrl?: string | null;
  description?: string | null;
  category?: string | null;
  type: string;
  linkType: string;
};

function pickList(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const candidates = [
    d,
    d.data,
    (d.data as Record<string, unknown>)?.data,
    (d.data as Record<string, unknown>)?.results,
    d.results,
    d.items,
    d.movies,
    d.series,
    d.subjectList,
    d.stations,
    d.tracks,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c as Record<string, unknown>[];
  }
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  return [];
}

function normalizeRow(
  row: Record<string, unknown>,
  type: string,
  idx: number
): Norm | null {
  const title = String(
    row.title || row.name || row.station || row.trackName || `Item ${idx + 1}`
  ).trim();
  if (!title) return null;

  const cover =
    (row.coverUrl as string) ||
    (row.poster as string) ||
    (row.thumbnail as string) ||
    (row.favicon as string) ||
    (row.image as string) ||
    (typeof row.cover === "object" && row.cover
      ? String((row.cover as { url?: string }).url || "")
      : "") ||
    null;

  let link = String(
    row.linkUrl ||
      row.url ||
      row.url_resolved ||
      row.stream ||
      row.stream_url ||
      row.embed ||
      row.previewUrl ||
      row.game_url ||
      row.proxyStream ||
      ""
  ).trim();

  const subjectId = row.subjectId || row.tmdb_id || row.id || row.stationuuid;
  if (!link && subjectId) {
    if (type === "movie" || type === "drama") {
      link = `https://stream.omegatech.app/stream?subjectId=${encodeURIComponent(String(subjectId))}`;
    }
  }
  if (!link && row.tmdb_id) {
    link = `https://vidsrc.to/embed/${type === "drama" ? "tv" : "movie"}/${row.tmdb_id}`;
  }
  if (!link) return null;

  const idBase = String(subjectId || title)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
  const id = `api_${type}_${idBase || idx}`;

  return {
    id,
    title: title.slice(0, 200),
    linkUrl: link,
    coverUrl: cover || null,
    description: String(row.description || row.overview || row.tags || "").slice(
      0,
      500
    ) || null,
    category: String(row.category || row.genre || type).slice(0, 100),
    type,
    linkType: type === "game" || type === "vpn" ? "download" : "stream",
  };
}

/** Fetch a registered API source URL and insert rows into Content */
export async function importFromApiSource(opts: {
  url: string;
  category: string;
  notes?: string | null;
}): Promise<{ imported: number; error?: string }> {
  const { url, category } = opts;
  if (!url || !url.startsWith("http")) {
    return { imported: 0, error: "URL si sahihi" };
  }
  // AI endpoints are tools, not catalog rows
  if (category === "ai") {
    return { imported: 0 };
  }

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0",
      },
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
    if (!res.ok) {
      return { imported: 0, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const list = pickList(data);
    let imported = 0;
    for (let i = 0; i < Math.min(list.length, 80); i++) {
      const row = normalizeRow(list[i], category, i);
      if (!row) continue;
      try {
        await prisma.$executeRaw`
          INSERT INTO "Content" (id, title, type, description, cover_url, link_url, link_type, category, status, created_at, updated_at)
          VALUES (
            ${row.id},
            ${row.title},
            ${row.type},
            ${row.description},
            ${row.coverUrl},
            ${row.linkUrl},
            ${row.linkType},
            ${row.category},
            ${"published"},
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            link_url = EXCLUDED.link_url,
            cover_url = COALESCE(EXCLUDED.cover_url, "Content".cover_url),
            status = 'published',
            updated_at = NOW()
        `;
        imported++;
      } catch {
        /* skip */
      }
    }
    return { imported };
  } catch (e) {
    return {
      imported: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
