import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";
/** Bump to force full re-import of large catalog */
const MOVIE_TAG = "eliteplex-full-catalog-v14-2026";
const DRAMA_TAG = "eliteplex-drama-full-v14-2026";
/** Include current + upcoming years */
const MAX_YEAR = 2030;

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
  const batchSize = 5;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const res = await fetch(`${BASE}${path}?page=${p}`, {
            next: { revalidate: 0 },
            headers: { Accept: "application/json" },
          });
          if (!res.ok) return [] as EliteItem[];
          const data = await res.json();
          const list = Array.isArray(data)
            ? data
            : data?.results ||
              data?.movies ||
              data?.items ||
              data?.series ||
              data?.data ||
              [];
          return Array.isArray(list) ? (list as EliteItem[]) : [];
        } catch {
          return [] as EliteItem[];
        }
      })
    );
    for (const list of results) out.push(...list);
  }
  return out;
}

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
      SET stream_status = 'unknown'
      WHERE status = 'published'
        AND stream_status = 'bad'
        AND (
          link_url ILIKE '%vidsrc%'
          OR link_url ILIKE '%2embed%'
          OR link_url ILIKE '%embed%'
        )
    `);
  } catch (e) {
    console.error("migrateBrokenEmbeds", e);
  }
}

export async function importElitePlexMovies(force = false): Promise<number> {
  const existing = await prisma.apiSource.findFirst({
    where: { category: "movie" },
  });
  if (!force && existing?.notes === MOVIE_TAG) {
    const count = await prisma.content.count({ where: { type: "movie" } });
    if (count > 50) return count;
  }

  const pages = Array.from({ length: 40 }, (_, i) => i + 1);
  const items = await fetchPages("/api/movies", pages);
  let n = 0;
  for (const it of items) {
    const title = (it.title || it.name || "").trim();
    if (!title) continue;
    const tmdb = it.tmdb_id || it.id;
    const y = it.year || "";
    const linkUrl = tmdb
      ? `https://vidsrc.to/embed/movie/${tmdb}`
      : "";
    if (!linkUrl) continue;
    const coverUrl = it.poster || null;
    try {
      const found = await prisma.content.findFirst({
        where: { type: "movie", title, linkUrl },
      });
      if (found) {
        await prisma.content.update({
          where: { id: found.id },
          data: {
            coverUrl: coverUrl || found.coverUrl,
            description: it.overview || found.description,
            category: y ? `Movie · ${y}` : "Movie",
            status: "published",
            apiSource: MOVIE_TAG,
          },
        });
      } else {
        await prisma.content.create({
          data: {
            title,
            type: "movie",
            description: it.overview || null,
            coverUrl,
            linkUrl,
            linkType: "stream",
            category: y ? `Movie · ${y}` : "Movie",
            status: "published",
            pointsCost: 1,
            apiSource: MOVIE_TAG,
          },
        });
      }
      n++;
    } catch {
      /* skip */
    }
  }

  {
    const src = await prisma.apiSource.findFirst({ where: { category: "movie" } });
    if (src) {
      await prisma.apiSource.update({
        where: { id: src.id },
        data: {
          name: "Full movie catalog (vidsrc)",
          notes: MOVIE_TAG,
          enabled: true,
        },
      });
    } else {
      await prisma.apiSource.create({
        data: {
          category: "movie",
          name: "Full movie catalog (vidsrc)",
          url: `${BASE}/api/movies`,
          notes: MOVIE_TAG,
          enabled: true,
        },
      });
    }
  }
  return n;
}

export async function importElitePlexDrama(force = false): Promise<number> {
  const existing = await prisma.apiSource.findFirst({
    where: { category: "drama" },
  });
  if (!force && existing?.notes === DRAMA_TAG) {
    const count = await prisma.content.count({ where: { type: "drama" } });
    if (count > 20) return count;
  }

  const pages = Array.from({ length: 20 }, (_, i) => i + 1);
  const items = await fetchPages("/api/series", pages);
  let n = 0;
  for (const it of items) {
    const title = (it.title || it.name || "").trim();
    if (!title) continue;
    const tmdb = it.tmdb_id || it.id;
    const y = it.year || "";
    const linkUrl = tmdb ? `https://vidsrc.to/embed/tv/${tmdb}` : "";
    if (!linkUrl) continue;
    try {
      const found = await prisma.content.findFirst({
        where: { type: "drama", title },
      });
      if (found) {
        await prisma.content.update({
          where: { id: found.id },
          data: {
            coverUrl: it.poster || found.coverUrl,
            description: it.overview || found.description,
            linkUrl,
            category: y ? `Series · ${y}` : "Series",
            status: "published",
            apiSource: DRAMA_TAG,
          },
        });
      } else {
        await prisma.content.create({
          data: {
            title,
            type: "drama",
            description: it.overview || null,
            coverUrl: it.poster || null,
            linkUrl,
            linkType: "stream",
            category: y ? `Series · ${y}` : "Series",
            status: "published",
            pointsCost: 1,
            apiSource: DRAMA_TAG,
          },
        });
      }
      n++;
    } catch {
      /* skip */
    }
  }

  {
    const src = await prisma.apiSource.findFirst({ where: { category: "drama" } });
    if (src) {
      await prisma.apiSource.update({
        where: { id: src.id },
        data: {
          notes: DRAMA_TAG,
          enabled: true,
          name: "Full series catalog",
        },
      });
    } else {
      await prisma.apiSource.create({
        data: {
          category: "drama",
          name: "Full series catalog",
          url: `${BASE}/api/series`,
          notes: DRAMA_TAG,
          enabled: true,
        },
      });
    }
  }
  return n;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<void> {
  await migrateBrokenEmbeds();
  if (type === "movie") {
    const count = await prisma.content.count({ where: { type: "movie", status: "published" } });
    if (count < 30) await importElitePlexMovies(true);
  } else {
    const count = await prisma.content.count({ where: { type: "drama", status: "published" } });
    if (count < 10) await importElitePlexDrama(true);
  }
}
