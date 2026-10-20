import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
  type?: string;
};

async function fetchPages(
  path: string,
  pages: number[]
): Promise<EliteItem[]> {
  const out: EliteItem[] = [];
  for (const page of pages) {
    try {
      const res = await fetch(`${BASE}${path}?page=${page}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ETUZA-HUB/1.0",
        },
        next: { revalidate: 0 },
      });
      if (!res.ok) break;
      const data = await res.json();
      const items = (data?.items || []) as EliteItem[];
      if (!items.length) break;
      out.push(...items);
    } catch (e) {
      console.error("eliteplex fetch", path, page, e);
      break;
    }
  }
  return out;
}

function yearNum(y?: string) {
  const n = parseInt(String(y || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function importElitePlexMovies(): Promise<number> {
  const items = await fetchPages("/api/movies", [1, 2, 3, 4, 5]);
  if (!items.length) return 0;

  // Prefer released titles (skip pure future placeholders when possible)
  const sorted = [...items].sort((a, b) => {
    const ya = yearNum(a.year);
    const yb = yearNum(b.year);
    // put 2025 and earlier first
    const sa = ya >= 2026 ? 1 : 0;
    const sb = yb >= 2026 ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return yb - ya;
  });

  await prisma.content.deleteMany({ where: { type: "movie" } });

  let total = 0;
  for (const row of sorted) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title) continue;
    const y = yearNum(row.year);
    const linkUrl = `https://player.videasy.to/movie/${id}`;
    await prisma.content.create({
      data: {
        type: "movie",
        title: title.slice(0, 200),
        description: row.overview
          ? String(row.overview).slice(0, 500)
          : y
            ? `Year ${y}`
            : null,
        linkUrl,
        coverUrl: row.poster || null,
        linkType: "stream",
        category: y ? `Movie · ${y}` : "Movie",
        status: "published",
      },
    });
    total++;
  }

  await prisma.apiSource.upsert({
    where: { category: "movie" },
    create: {
      category: "movie",
      name: "ElitePlex Movies",
      url: `${BASE}/api/movies`,
      notes: "eliteplex-v3-sorted",
      enabled: true,
    },
    update: {
      name: "ElitePlex Movies",
      url: `${BASE}/api/movies`,
      notes: "eliteplex-v3-sorted",
      enabled: true,
    },
  });

  return total;
}

export async function importElitePlexDrama(): Promise<number> {
  const series = await fetchPages("/api/series", [1, 2, 3]);

  let anime: EliteItem[] = [];
  try {
    const res = await fetch(`${BASE}/api/search?q=anime`, {
      headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      anime = (data?.items || []) as EliteItem[];
    }
  } catch (e) {
    console.error("eliteplex anime", e);
  }

  const all = [...series, ...anime];
  if (!all.length) return 0;

  await prisma.content.deleteMany({ where: { type: "drama" } });

  const seen = new Set<string>();
  let total = 0;
  for (const row of all) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);

    await prisma.content.create({
      data: {
        type: "drama",
        title: title.slice(0, 200),
        description: row.overview ? String(row.overview).slice(0, 500) : null,
        linkUrl: `https://player.videasy.to/tv/${id}`,
        coverUrl: row.poster || null,
        linkType: "stream",
        category: row.year ? `Series · ${row.year}` : "Series",
        status: "published",
      },
    });
    total++;
  }

  await prisma.apiSource.upsert({
    where: { category: "drama" },
    create: {
      category: "drama",
      name: "ElitePlex Series + Anime",
      url: `${BASE}/api/series`,
      notes: "eliteplex-drama-v3",
      enabled: true,
    },
    update: {
      name: "ElitePlex Series + Anime",
      url: `${BASE}/api/series`,
      notes: "eliteplex-drama-v3",
      enabled: true,
    },
  });

  return total;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<number> {
  const count = await prisma.content.count({
    where: { type, status: "published" },
  });
  if (count > 0) return count;
  if (type === "movie") return importElitePlexMovies();
  return importElitePlexDrama();
}
