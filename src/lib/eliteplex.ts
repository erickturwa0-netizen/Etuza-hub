import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";
const MOVIE_TAG = "eliteplex-playable-v4";
const DRAMA_TAG = "eliteplex-drama-v4";

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

/** Known-good TMDB ids — always include these first */
const CLASSIC_SEEDS: { id: string; title: string; year: string; poster?: string }[] = [
  { id: "27205", title: "Inception", year: "2010", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { id: "157336", title: "Interstellar", year: "2014", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: "155", title: "The Dark Knight", year: "2008", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: "299536", title: "Avengers: Infinity War", year: "2018", poster: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hIcaUR.jpg" },
  { id: "299534", title: "Avengers: Endgame", year: "2019", poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
  { id: "24428", title: "The Avengers", year: "2012", poster: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24TyDX7oO8SIyI.jpg" },
  { id: "414906", title: "The Batman", year: "2022", poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fbrcxm3BL9c8Bkj2.jpg" },
  { id: "680", title: "Pulp Fiction", year: "1994", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPAsjYu.jpg" },
  { id: "597", title: "Titanic", year: "1997", poster: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" },
  { id: "278", title: "The Shawshank Redemption", year: "1994", poster: "https://image.tmdb.org/t/p/w500/9cqNxrMVnUwAFEUnhR2nA3zNKm.jpg" },
  { id: "238", title: "The Godfather", year: "1972", poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { id: "550", title: "Fight Club", year: "1999", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { id: "13", title: "Forrest Gump", year: "1994", poster: "https://image.tmdb.org/t/p/w500/arw2kNYZ6hA1nX8iNlYg2TdQS8.jpg" },
  { id: "603", title: "The Matrix", year: "1999", poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { id: "11", title: "Star Wars", year: "1977", poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XMvP4kL9qKqOt5zj.jpg" },
  { id: "120", title: "The Lord of the Rings: The Fellowship of the Ring", year: "2001", poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { id: "122", title: "The Lord of the Rings: The Return of the King", year: "2003", poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { id: "475557", title: "Joker", year: "2019", poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
  { id: "438631", title: "Dune", year: "2021", poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94SCyV0TdR.jpg" },
  { id: "693134", title: "Dune: Part Two", year: "2024", poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: "324857", title: "Spider-Man: Into the Spider-Verse", year: "2018", poster: "https://image.tmdb.org/t/p/w500/iiGBSer2sJbL1kQ0uFz7qjN7P7e.jpg" },
  { id: "569094", title: "Spider-Man: Across the Spider-Verse", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  { id: "1022789", title: "Inside Out 2", year: "2024", poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg" },
  { id: "1184918", title: "The Wild Robot", year: "2024", poster: "https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92yICSkknT2TXBg.jpg" },
  { id: "671", title: "Harry Potter and the Philosopher's Stone", year: "2001", poster: "https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg" },
  { id: "122917", title: "The Hobbit: The Battle of the Five Armies", year: "2014", poster: "https://image.tmdb.org/t/p/w500/xT98tLqatZPQApYlaeqpPRwqQdX.jpg" },
  { id: "496243", title: "Parasite", year: "2019", poster: "https://image.tmdb.org/t/p/w500/7IiTQwqb6XVdjmJiSOzTAJDHwUJ.jpg" },
  { id: "872585", title: "Oppenheimer", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykE0UmQ5Q3vTD.jpg" },
  { id: "346698", title: "Barbie", year: "2023", poster: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg" },
  { id: "76600", title: "Avatar: The Way of Water", year: "2022", poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
];

async function fetchPages(path: string, pages: number[]): Promise<EliteItem[]> {
  const out: EliteItem[] = [];
  for (const page of pages) {
    try {
      const res = await fetch(`${BASE}${path}?page=${page}`, {
        headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
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

function isPlayableYear(y?: string) {
  const n = yearNum(y);
  // Skip unreleased / future catalogue filler
  return n > 0 && n <= 2024;
}

export async function importElitePlexMovies(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({ where: { category: "movie" } });
  if (!force && existing?.notes === MOVIE_TAG) {
    return prisma.content.count({ where: { type: "movie", status: "published" } });
  }

  // Pull deeper pages — early pages are almost all 2026
  const remote = await fetchPages("/api/movies", [1, 2, 3, 5, 7, 8, 10, 12, 15]);
  const filtered = remote.filter((r) => isPlayableYear(r.year));

  const byId = new Map<string, EliteItem>();

  // Classics first
  for (const c of CLASSIC_SEEDS) {
    byId.set(c.id, {
      tmdb_id: c.id,
      id: c.id,
      name: c.title,
      year: c.year,
      poster: c.poster,
    });
  }

  for (const row of filtered) {
    const id = String(row.tmdb_id || row.id || "");
    // Only numeric TMDB-like ids
    if (!/^\d{2,7}$/.test(id)) continue;
    if (!byId.has(id)) byId.set(id, row);
  }

  await prisma.content.deleteMany({ where: { type: "movie" } });

  let total = 0;
  // Insert classics order first, then rest by year desc
  const ordered = [
    ...CLASSIC_SEEDS.map((c) => byId.get(c.id)!).filter(Boolean),
    ...[...byId.values()]
      .filter((r) => !CLASSIC_SEEDS.some((c) => c.id === String(r.tmdb_id || r.id)))
      .sort((a, b) => yearNum(b.year) - yearNum(a.year)),
  ];

  for (const row of ordered) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title) continue;
    const y = yearNum(row.year);
    await prisma.content.create({
      data: {
        type: "movie",
        title: title.slice(0, 200),
        description: row.overview
          ? String(row.overview).slice(0, 500)
          : y
            ? `Year ${y}`
            : null,
        linkUrl: `https://player.videasy.to/movie/${id}`,
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
      name: "ElitePlex Movies (playable)",
      url: `${BASE}/api/movies`,
      notes: MOVIE_TAG,
      enabled: true,
    },
    update: {
      name: "ElitePlex Movies (playable)",
      url: `${BASE}/api/movies`,
      notes: MOVIE_TAG,
      enabled: true,
    },
  });

  return total;
}

export async function importElitePlexDrama(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({ where: { category: "drama" } });
  if (!force && existing?.notes === DRAMA_TAG) {
    return prisma.content.count({ where: { type: "drama", status: "published" } });
  }

  const series = await fetchPages("/api/series", [1, 2, 3, 5, 8]);
  const playable = series.filter((r) => {
    const y = yearNum(r.year);
    return y === 0 || y <= 2024;
  });

  await prisma.content.deleteMany({ where: { type: "drama" } });

  const seen = new Set<string>();
  let total = 0;
  for (const row of playable) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title || seen.has(id)) continue;
    if (!/^\d{2,7}$/.test(id)) continue;
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
      name: "ElitePlex Series",
      url: `${BASE}/api/series`,
      notes: DRAMA_TAG,
      enabled: true,
    },
    update: {
      name: "ElitePlex Series",
      url: `${BASE}/api/series`,
      notes: DRAMA_TAG,
      enabled: true,
    },
  });

  return total;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<number> {
  // Force upgrade when tag changes
  if (type === "movie") {
    const src = await prisma.apiSource.findUnique({ where: { category: "movie" } });
    if (!src || src.notes !== MOVIE_TAG) {
      return importElitePlexMovies(true);
    }
    const count = await prisma.content.count({
      where: { type: "movie", status: "published" },
    });
    if (count === 0) return importElitePlexMovies(true);
    return count;
  }

  const src = await prisma.apiSource.findUnique({ where: { category: "drama" } });
  if (!src || src.notes !== DRAMA_TAG) {
    return importElitePlexDrama(true);
  }
  const count = await prisma.content.count({
    where: { type: "drama", status: "published" },
  });
  if (count === 0) return importElitePlexDrama(true);
  return count;
}
