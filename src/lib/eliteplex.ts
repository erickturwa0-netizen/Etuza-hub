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

export async function importElitePlexMovies(): Promise<number> {
  const items = await fetchPages("/api/movies", [1, 2, 3]);
  if (!items.length) return 0;

  await prisma.content.deleteMany({ where: { type: "movie" } });

  let total = 0;
  for (const row of items) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title) continue;
    // Use videasy.to (current domain) — StreamPlayer multi-sources the rest
    const linkUrl = `https://player.videasy.to/movie/${id}`;
    await prisma.content.create({
      data: {
        type: "movie",
        title: title.slice(0, 200),
        description: row.overview
          ? String(row.overview).slice(0, 500)
          : row.year
            ? `Year ${row.year}`
            : null,
        linkUrl,
        coverUrl: row.poster || null,
        linkType: "stream",
        category: row.year ? `Movie · ${row.year}` : "Movie",
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
      notes: "eliteplex-v2-play",
      enabled: true,
    },
    update: {
      name: "ElitePlex Movies",
      url: `${BASE}/api/movies`,
      notes: "eliteplex-v2-play",
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
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0",
      },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      anime = ((data?.items || []) as EliteItem[]).filter(
        (i) => i.type === "series" || i.type === "tv" || !i.type
      );
    }
  } catch (e) {
    console.error("eliteplex anime search", e);
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

    const isAnime =
      /anime/i.test(title) ||
      /anime/i.test(String(row.overview || "")) ||
      anime.some((a) => String(a.tmdb_id || a.id) === id);

    await prisma.content.create({
      data: {
        type: "drama",
        title: title.slice(0, 200),
        description: row.overview
          ? String(row.overview).slice(0, 500)
          : null,
        linkUrl: `https://player.videasy.to/tv/${id}`,
        coverUrl: row.poster || null,
        linkType: "stream",
        category: isAnime
          ? row.year
            ? `Anime · ${row.year}`
            : "Anime"
          : row.year
            ? `Series · ${row.year}`
            : "Series",
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
      notes: "eliteplex-drama-v2",
      enabled: true,
    },
    update: {
      name: "ElitePlex Series + Anime",
      url: `${BASE}/api/series`,
      notes: "eliteplex-drama-v2",
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
