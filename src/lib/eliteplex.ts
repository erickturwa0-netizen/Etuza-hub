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
  // Parallel batches of 5 pages
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

const CLASSIC_SEEDS: { id: string; title: string; year: string; poster: string }[] = [
  { id: "603", title: "The Matrix", year: "1999", poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { id: "550", title: "Fight Club", year: "1999", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { id: "680", title: "Pulp Fiction", year: "1994", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPAsjYt.jpg" },
  { id: "155", title: "The Dark Knight", year: "2008", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: "27205", title: "Inception", year: "2010", poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeQ2FqDwLMLlOWiDQTj.jpg" },
  { id: "157336", title: "Interstellar", year: "2014", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: "278", title: "The Shawshank Redemption", year: "1994", poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg" },
  { id: "238", title: "The Godfather", year: "1972", poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { id: "424", title: "Schindler's List", year: "1993", poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { id: "13", title: "Forrest Gump", year: "1994", poster: "https://image.tmdb.org/t/p/w500/arw2k3l4n9wYpOg6SClRpjYvWq.jpg" },
  { id: "120", title: "The Lord of the Rings: The Fellowship of the Ring", year: "2001", poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { id: "122", title: "The Lord of the Rings: The Return of the King", year: "2003", poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { id: "11", title: "Star Wars", year: "1977", poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XMvVWm8Xm4PVg1L.jpg" },
  { id: "597", title: "Titanic", year: "1997", poster: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPWJTlXoKjm.jpg" },
  { id: "24428", title: "The Avengers", year: "2012", poster: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24TyDxvIjpgj.png" },
  { id: "299536", title: "Avengers: Infinity War", year: "2018", poster: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg" },
  { id: "299534", title: "Avengers: Endgame", year: "2019", poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
  { id: "324857", title: "Spider-Man: Into the Spider-Verse", year: "2018", poster: "https://image.tmdb.org/t/p/w500/iiGBER8XQVANxzhffxwB9d7WjS.jpg" },
  { id: "569094", title: "Spider-Man: Across the Spider-Verse", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  { id: "346698", title: "Barbie", year: "2023", poster: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg" },
  { id: "872585", title: "Oppenheimer", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykE0UmQdlMMp.jpg" },
  { id: "76600", title: "Avatar: The Way of Water", year: "2022", poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  { id: "19995", title: "Avatar", year: "2009", poster: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg" },
  { id: "693134", title: "Dune: Part Two", year: "2024", poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: "533535", title: "Deadpool & Wolverine", year: "2024", poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUOejeaAMJOy5r2r.jpg" },
  { id: "823464", title: "Godzilla x Kong: The New Empire", year: "2024", poster: "https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg" },
  { id: "786892", title: "Furiosa: A Mad Max Saga", year: "2024", poster: "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg" },
  { id: "105", title: "Back to the Future", year: "1985", poster: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7wxTTvQJtHlmQyRbDr.jpg" },
  { id: "497", title: "The Green Mile", year: "1999", poster: "https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg" },
];

// Pages 1..80 for large catalog
function pageRange(max: number) {
  return Array.from({ length: max }, (_, i) => i + 1);
}

export async function importElitePlexMovies(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({
    where: { category: "movie" },
  });
  const count = await prisma.content.count({
    where: { type: "movie", status: "published" },
  });

  // Keep large catalog if already imported
  if (!force && existing?.notes === MOVIE_TAG && count > 500) {
    await migrateBrokenEmbeds();
    return count;
  }

  const remote = await fetchPages("/api/movies", pageRange(80));

  const byId = new Map<string, EliteItem>();
  for (const s of CLASSIC_SEEDS) {
    byId.set(s.id, {
      tmdb_id: s.id,
      name: s.title,
      year: s.year,
      poster: s.poster,
    });
  }
  for (const row of remote) {
    const id = String(row.tmdb_id || row.id || "");
    if (!/^\d{2,8}$/.test(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_YEAR) continue;
    if (!byId.has(id)) byId.set(id, row);
  }

  if (byId.size < 10) {
    console.error("eliteplex movie import: too few items", byId.size);
    return count;
  }

  await prisma.content.deleteMany({ where: { type: "movie" } });

  const ordered = [...byId.values()].sort(
    (a, b) => yearNum(b.year) - yearNum(a.year)
  );

  const chunk = 50;
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
      name: "Full movie catalog (vidsrc)",
      url: `${BASE}/api/movies`,
      notes: MOVIE_TAG,
      enabled: true,
    },
    update: {
      name: "Full movie catalog (vidsrc)",
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
  const count = await prisma.content.count({
    where: { type: "drama", status: "published" },
  });

  if (!force && existing?.notes === DRAMA_TAG && count > 100) {
    await migrateBrokenEmbeds();
    return count;
  }

  const series = await fetchPages("/api/series", pageRange(40));
  if (series.length < 5) {
    console.error("eliteplex drama import: too few", series.length);
    return count;
  }

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
    if (!/^\d{2,8}$/.test(id)) continue;
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

  // Sort newest year first before insert
  rows.sort((a, b) => {
    const ya = parseInt((a.category || "").replace(/\D/g, "") || "0", 10);
    const yb = parseInt((b.category || "").replace(/\D/g, "") || "0", 10);
    return yb - ya;
  });

  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    await prisma.content.createMany({ data: rows.slice(i, i + chunk) });
  }

  await prisma.apiSource.upsert({
    where: { category: "drama" },
    create: {
      category: "drama",
      name: "Full series catalog",
      url: `${BASE}/api/series`,
      notes: DRAMA_TAG,
      enabled: true,
    },
    update: { notes: DRAMA_TAG, enabled: true, name: "Full series catalog" },
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
