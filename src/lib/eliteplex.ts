import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";
/** Classics only — known high fill-rate on free embeds */
const MOVIE_TAG = "eliteplex-github-v10-classics-only";
const DRAMA_TAG = "eliteplex-drama-v10-playable";

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
};

/** Hand-picked titles that usually play on VidSrc / 2Embed */
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
  { id: "120", title: "The Lord of the Rings: The Fellowship of the Ring", year: "2001", poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { id: "122", title: "The Lord of the Rings: The Return of the King", year: "2003", poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { id: "121", title: "The Lord of the Rings: The Two Towers", year: "2002", poster: "https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGnJyyJv.jpg" },
  { id: "475557", title: "Joker", year: "2019", poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
  { id: "438631", title: "Dune", year: "2021", poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94SCyV0TdR.jpg" },
  { id: "693134", title: "Dune: Part Two", year: "2024", poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: "872585", title: "Oppenheimer", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykE0UmQ5Q3vTD.jpg" },
  { id: "346698", title: "Barbie", year: "2023", poster: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg" },
  { id: "76600", title: "Avatar: The Way of Water", year: "2022", poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  { id: "19995", title: "Avatar", year: "2009", poster: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg" },
  { id: "1022789", title: "Inside Out 2", year: "2024", poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg" },
  { id: "569094", title: "Spider-Man: Across the Spider-Verse", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  { id: "324857", title: "Spider-Man: Into the Spider-Verse", year: "2018", poster: "https://image.tmdb.org/t/p/w500/iiZZtoqCyX7hA6Ftg37o56mZvfk.jpg" },
  { id: "11", title: "Star Wars", year: "1977", poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XMvVgm8HDqZQDpYN.jpg" },
  { id: "1891", title: "The Empire Strikes Back", year: "1980", poster: "https://image.tmdb.org/t/p/w500/nNAeTmF4ntnwRyxu6XYd2XNzrtF.jpg" },
  { id: "424", title: "Schindler's List", year: "1993", poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { id: "129", title: "Spirited Away", year: "2001", poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" },
  { id: "497", title: "The Green Mile", year: "1999", poster: "https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg" },
  { id: "496243", title: "Parasite", year: "2019", poster: "https://image.tmdb.org/t/p/w500/7IiTQwIVwNncxM1xVaRPV62QyeB.jpg" },
  { id: "49026", title: "The Dark Knight Rises", year: "2012", poster: "https://image.tmdb.org/t/p/w500/hr0L2aueqlP2BYUblTTjrlY0tAs.jpg" },
  { id: "76341", title: "Mad Max: Fury Road", year: "2015", poster: "https://image.tmdb.org/t/p/w500/hA2epsMjHDpTxALjupBziOUdxqg.jpg" },
  { id: "671", title: "Harry Potter and the Philosopher's Stone", year: "2001", poster: "https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg" },
  { id: "672", title: "Harry Potter and the Chamber of Secrets", year: "2002", poster: "https://image.tmdb.org/t/p/w500/sdEOH0992YZ0QMEXeGqGklQR7Ig.jpg" },
  { id: "12445", title: "Harry Potter and the Deathly Hallows: Part 2", year: "2011", poster: "https://image.tmdb.org/t/p/w500/c54HpQmuwXjHq2C9wmoACjxoom3.jpg" },
  { id: "118340", title: "Guardians of the Galaxy", year: "2014", poster: "https://image.tmdb.org/t/p/w500/r7vmZjiyZw9xS6QNgjH6x3RHD0n.jpg" },
  { id: "1726", title: "Iron Man", year: "2008", poster: "https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COTS8cMVORJ.jpg" },
  { id: "10138", title: "Iron Man 2", year: "2010", poster: "https://image.tmdb.org/t/p/w500/6WBekiy6j5X3PVrmCyi3FJwG9UE.jpg" },
  { id: "68721", title: "Iron Man 3", year: "2013", poster: "https://image.tmdb.org/t/p/w500/qhPtAc1TKbMPqNvcdXZOnChbnES.jpg" },
  { id: "284054", title: "Black Panther", year: "2018", poster: "https://image.tmdb.org/t/p/w500/uxzzTkhVMX6BEzlA7hKNbfYx5sU.jpg" },
  { id: "299537", title: "Captain Marvel", year: "2019", poster: "https://image.tmdb.org/t/p/w500/AtsgWhDnVTflPn5A3vCQ3cZZaot.jpg" },
  { id: "634649", title: "Spider-Man: No Way Home", year: "2021", poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { id: "315635", title: "Spider-Man: Homecoming", year: "2017", poster: "https://image.tmdb.org/t/p/w500/c24sv2weTHPsmDa7jEMN0mDcP94.jpg" },
  { id: "361743", title: "Top Gun: Maverick", year: "2022", poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg" },
  { id: "505642", title: "Black Panther: Wakanda Forever", year: "2022", poster: "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg" },
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
    } catch {
      break;
    }
  }
  return out;
}

function yearNum(y?: string) {
  const n = parseInt(String(y || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function importElitePlexMovies(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({ where: { category: "movie" } });
  if (!force && existing?.notes === MOVIE_TAG) {
    return prisma.content.count({ where: { type: "movie", status: "published" } });
  }

  // Wipe ALL old movies (including unplayable)
  await prisma.content.deleteMany({ where: { type: "movie" } });

  let total = 0;
  for (const c of CLASSIC_SEEDS) {
    await prisma.content.create({
      data: {
        type: "movie",
        title: c.title.slice(0, 200),
        description: `Year ${c.year}`,
        // VidSrc first — faster than Videasy for most titles
        linkUrl: `https://vidsrc.to/embed/movie/${c.id}`,
        coverUrl: c.poster || null,
        linkType: "stream",
        category: `Movie · ${c.year}`,
        status: "published",
      },
    });
    total++;
  }

  await prisma.apiSource.upsert({
    where: { category: "movie" },
    create: {
      category: "movie",
      name: "Playable classics",
      url: `${BASE}/api/movies`,
      notes: MOVIE_TAG,
      enabled: true,
    },
    update: {
      name: "Playable classics",
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

  const series = await fetchPages("/api/series", [1, 2, 3, 4, 5]);
  await prisma.content.deleteMany({ where: { type: "drama" } });

  const seen = new Set<string>();
  let total = 0;
  for (const row of series) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title || seen.has(id)) continue;
    if (!/^\d{2,7}$/.test(id)) continue;
    const y = yearNum(row.year);
    if (y && y > 2024) continue;
    seen.add(id);
    await prisma.content.create({
      data: {
        type: "drama",
        title: title.slice(0, 200),
        description: row.overview ? String(row.overview).slice(0, 500) : null,
        linkUrl: `https://vidsrc.to/embed/tv/${id}`,
        coverUrl: row.poster || null,
        linkType: "stream",
        category: y ? `Series · ${y}` : "Series",
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
    update: { notes: DRAMA_TAG, enabled: true },
  });

  return total;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<number> {
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
