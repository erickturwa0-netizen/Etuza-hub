import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";
/** Bump tag to force re-import with working embed hosts */
const MOVIE_TAG = "eliteplex-vidsrc-v12-no-vsembed";
const DRAMA_TAG = "eliteplex-drama-vidsrc-v12";
const MAX_YEAR = 2024;

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
};

function yearNum(y?: string) {
  const n = parseInt(String(y || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

async function fetchPages(path: string, pages: number[]): Promise<EliteItem[]> {
  const out: EliteItem[] = [];
  for (const p of pages) {
    try {
      const res = await fetch(`${BASE}${path}?page=${p}`, {
        next: { revalidate: 0 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : data?.results || data?.movies || data?.data || [];
      if (Array.isArray(list)) out.push(...list);
    } catch {
      /* ignore page */
    }
  }
  return out;
}

/** Rewrite broken vsembed.ru links still in DB → vidsrc */
export async function migrateBrokenEmbeds() {
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "Content"
      SET link_url = REPLACE(link_url, 'https://vsembed.ru/embed/movie/', 'https://vidsrc.to/embed/movie/')
      WHERE link_url LIKE '%vsembed.ru%movie%'
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "Content"
      SET link_url = REPLACE(link_url, 'https://vsembed.ru/embed/tv/', 'https://vidsrc.to/embed/tv/')
      WHERE link_url LIKE '%vsembed.ru%tv%'
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "Content"
      SET link_url = REPLACE(link_url, 'http://vsembed.ru/embed/movie/', 'https://vidsrc.to/embed/movie/')
      WHERE link_url LIKE '%vsembed.ru%'
    `);
    // Reset stream_status so probe re-checks
    await prisma.$executeRawUnsafe(`
      UPDATE "Content"
      SET stream_status = 'unknown'
      WHERE link_url LIKE '%vidsrc.%'
        AND (stream_status = 'bad' OR stream_status IS NULL)
    `);
  } catch (e) {
    console.error("migrateBrokenEmbeds", e);
  }
}

export async function importElitePlexMovies(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({
    where: { category: "movie" },
  });
  if (!force && existing?.notes === MOVIE_TAG) {
    await migrateBrokenEmbeds();
    return prisma.content.count({ where: { type: "movie", status: "published" } });
  }

  const remote = await fetchPages("/api/movies", [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  ]);
  const byId = new Map<string, EliteItem>();
  for (const row of remote) {
    const id = String(row.tmdb_id || row.id || "");
    if (!/^\d{2,7}$/.test(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_YEAR) continue;
    if (!byId.has(id)) byId.set(id, row);
  }

  await prisma.content.deleteMany({ where: { type: "movie" } });

  const ordered = [...byId.values()].sort(
    (a, b) => yearNum(b.year) - yearNum(a.year)
  );

  const chunk = 40;
  let total = 0;
  for (let i = 0; i < ordered.length; i += chunk) {
    const slice = ordered.slice(i, i + chunk);
    const data = slice
      .map((row) => {
        const id = String(row.tmdb_id || row.id || "");
        const title = String(row.name || row.title || "").trim();
        if (!id || !title) return null;
        const y = yearNum(row.year);
        return {
          type: "movie" as const,
          title: title.slice(0, 200),
          description: row.overview
            ? String(row.overview).slice(0, 500)
            : y
              ? `Year ${y}`
              : null,
          linkUrl: `https://vidsrc.to/embed/movie/${id}`,
          coverUrl: row.poster || null,
          linkType: "stream" as const,
          category: y ? `Movie · ${y}` : "Movie",
          status: "published" as const,
        };
      })
      .filter(Boolean) as {
      type: "movie";
      title: string;
      description: string | null;
      linkUrl: string;
      coverUrl: string | null;
      linkType: "stream";
      category: string;
      status: "published";
    }[];

    if (data.length) {
      await prisma.content.createMany({ data });
      total += data.length;
    }
  }

  await prisma.apiSource.upsert({
    where: { category: "movie" },
    create: {
      category: "movie",
      name: "Playable movies (vidsrc)",
      url: `${BASE}/api/movies`,
      notes: MOVIE_TAG,
      enabled: true,
    },
    update: {
      name: "Playable movies (vidsrc)",
      notes: MOVIE_TAG,
      enabled: true,
    },
  });

  return total;
}

export async function importElitePlexDrama(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({
    where: { category: "drama" },
  });
  if (!force && existing?.notes === DRAMA_TAG) {
    await migrateBrokenEmbeds();
    return prisma.content.count({ where: { type: "drama", status: "published" } });
  }

  const series = await fetchPages("/api/series", [1, 2, 3, 4, 5, 6, 8, 10]);
  await prisma.content.deleteMany({ where: { type: "drama" } });

  const seen = new Set<string>();
  const rows: {
    type: "drama";
    title: string;
    description: string | null;
    linkUrl: string;
    coverUrl: string | null;
    linkType: "stream";
    category: string;
    status: "published";
  }[] = [];

  for (const row of series) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title || seen.has(id)) continue;
    if (!/^\d{2,7}$/.test(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_YEAR) continue;
    seen.add(id);
    rows.push({
      type: "drama",
      title: title.slice(0, 200),
      description: row.overview ? String(row.overview).slice(0, 500) : null,
      linkUrl: `https://vidsrc.to/embed/tv/${id}`,
      coverUrl: row.poster || null,
      linkType: "stream",
      category: y ? `Series · ${y}` : "Series",
      status: "published",
    });
  }

  if (rows.length) await prisma.content.createMany({ data: rows });

  await prisma.apiSource.upsert({
    where: { category: "drama" },
    create: {
      category: "drama",
      name: "ElitePlex Series",
      url: `${BASE}/api/series`,
      notes: DRAMA_TAG,
      enabled: true,
    },
    update: { notes: DRAMA_TAG, enabled: true },
  });

  return rows.length;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<number> {
  if (type === "movie") {
    await migrateBrokenEmbeds();
    return importElitePlexMovies(false);
  }
  await migrateBrokenEmbeds();
  return importElitePlexDrama(false);
}
