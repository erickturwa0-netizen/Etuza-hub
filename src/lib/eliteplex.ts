import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";
const OMEGA = "https://api.omegatech.app/api/movie/MovieBox-pro";
const MOVIE_TAG = "omegatech-moviebox-v1";

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  subjectId?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
  type?: "movie" | "drama";
};

const CLASSIC_MOVIES: { id: string; title: string; year: string; poster: string }[] = [
  { id: "603", title: "The Matrix", year: "1999", poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { id: "550", title: "Fight Club", year: "1999", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { id: "680", title: "Pulp Fiction", year: "1994", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPAsjYt.jpg" },
  { id: "155", title: "The Dark Knight", year: "2008", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: "27205", title: "Inception", year: "2010", poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeQ2FqDwLMLlOWiDQTj.jpg" },
  { id: "157336", title: "Interstellar", year: "2014", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: "278", title: "The Shawshank Redemption", year: "1994", poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg" },
  { id: "238", title: "The Godfather", year: "1972", poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { id: "11", title: "Star Wars", year: "1977", poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XMvVWm8Xm4PVg1L.jpg" },
  { id: "597", title: "Titanic", year: "1997", poster: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPWJTlXoKjm.jpg" },
  { id: "299536", title: "Avengers: Infinity War", year: "2018", poster: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg" },
  { id: "299534", title: "Avengers: Endgame", year: "2019", poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
  { id: "24428", title: "The Avengers", year: "2012", poster: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24TyDxvIjpgj.png" },
  { id: "424", title: "Schindler's List", year: "1993", poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { id: "13", title: "Forrest Gump", year: "1994", poster: "https://image.tmdb.org/t/p/w500/arw2k3l4n9wYpOg6SClRpjYvWq.jpg" },
  { id: "120", title: "The Lord of the Rings: The Fellowship of the Ring", year: "2001", poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { id: "122", title: "The Lord of the Rings: The Return of the King", year: "2003", poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { id: "76341", title: "Mad Max: Fury Road", year: "2015", poster: "https://image.tmdb.org/t/p/w500/hA2erSUpREe0DjrIzhSXoXWpzVS.jpg" },
  { id: "496243", title: "Parasite", year: "2019", poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { id: "324857", title: "Spider-Man: Into the Spider-Verse", year: "2018", poster: "https://image.tmdb.org/t/p/w500/iiZZtiuYzf8FTh6A3YmLP7w0jT.jpg" },
];

async function eliteplexAlive(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/movies?page=1`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function mapOmegaItem(
  it: Record<string, unknown>,
  forceType?: "movie" | "drama"
): EliteItem | null {
  const title = String(it.title || it.name || "").trim();
  if (!title) return null;
  const subjectId = String(it.subjectId || it.id || "");
  const cover = it.cover as { url?: string } | undefined;
  const poster =
    cover?.url ||
    (typeof it.thumbnail === "string" ? it.thumbnail : undefined) ||
    undefined;
  const st = Number(it.subjectType || 0);
  const type: "movie" | "drama" =
    forceType || (st === 2 ? "drama" : "movie");
  const year = String(
    it.year || (it.releaseDate ? String(it.releaseDate).slice(0, 4) : "") || ""
  );
  return {
    subjectId,
    id: subjectId,
    title,
    poster,
    overview: String(it.description || ""),
    year,
    type,
  };
}

async function fetchOmegatechTrending(): Promise<EliteItem[]> {
  try {
    const res = await fetch(`${OMEGA}?action=trending`, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list =
      data?.data?.subjectList ||
      data?.data?.items ||
      data?.data?.results ||
      [];
    if (!Array.isArray(list)) return [];
    return list
      .map((it: Record<string, unknown>) => mapOmegaItem(it))
      .filter(Boolean) as EliteItem[];
  } catch {
    return [];
  }
}

async function fetchOmegatechSearch(q: string): Promise<EliteItem[]> {
  try {
    const res = await fetch(
      `${OMEGA}?action=search&keyword=${encodeURIComponent(q)}`,
      {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const inner = data?.data?.data || data?.data || {};
    const list = inner?.items || inner?.results || inner?.subjectList || [];
    if (!Array.isArray(list)) return [];
    return list
      .map((it: Record<string, unknown>) => mapOmegaItem(it))
      .filter(Boolean) as EliteItem[];
  } catch {
    return [];
  }
}

async function upsertMovieRow(opts: {
  id: string;
  title: string;
  linkUrl: string;
  coverUrl?: string | null;
  description?: string | null;
  category?: string | null;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO "Content" (id, title, type, description, cover_url, link_url, link_type, category, status, created_at, updated_at)
      VALUES (
        ${opts.id},
        ${opts.title.slice(0, 200)},
        ${"movie"},
        ${opts.description || null},
        ${opts.coverUrl || null},
        ${opts.linkUrl},
        ${"stream"},
        ${opts.category || "Movie"},
        ${"published"},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        cover_url = COALESCE(EXCLUDED.cover_url, "Content".cover_url),
        link_url = EXCLUDED.link_url,
        description = COALESCE(EXCLUDED.description, "Content".description),
        category = EXCLUDED.category,
        status = 'published',
        updated_at = NOW()
    `;
    return true;
  } catch {
    return false;
  }
}

export async function migrateBrokenEmbeds() {
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "Content"
      SET link_url = REPLACE(link_url, 'https://vsembed.ru/embed/movie/', 'https://vidsrc.to/embed/movie/')
      WHERE link_url LIKE '%vsembed.ru%movie%'
    `);
  } catch {
    /* ignore */
  }
}

export async function importElitePlexMovies(_force = false): Promise<number> {
  let n = 0;

  for (const m of CLASSIC_MOVIES) {
    const ok = await upsertMovieRow({
      id: `tmdb_${m.id}`,
      title: m.title,
      linkUrl: `https://vidsrc.to/embed/movie/${m.id}`,
      coverUrl: m.poster,
      category: `Movie · ${m.year}`,
    });
    if (ok) n++;
  }

  if (await eliteplexAlive()) {
    try {
      const res = await fetch(`${BASE}/api/movies?page=1`, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data?.results || data?.movies || data?.items || [];
        for (const it of list as EliteItem[]) {
          const title = (it.title || it.name || "").trim();
          const tmdb = it.tmdb_id || it.id;
          if (!title || !tmdb) continue;
          const ok = await upsertMovieRow({
            id: `elite_${tmdb}`,
            title,
            linkUrl: `https://vidsrc.to/embed/movie/${tmdb}`,
            coverUrl: it.poster || null,
            description: it.overview || null,
            category: it.year ? `Movie · ${it.year}` : "Movie",
          });
          if (ok) n++;
        }
      }
    } catch {
      /* eliteplex dead */
    }
  }

  const omega = [
    ...(await fetchOmegatechTrending()),
    ...(await fetchOmegatechSearch("Avengers")),
    ...(await fetchOmegatechSearch("Action 2024")),
    ...(await fetchOmegatechSearch("Marvel")),
    ...(await fetchOmegatechSearch("Fast Furious")),
    ...(await fetchOmegatechSearch("Black Panther")),
    ...(await fetchOmegatechSearch("Mission Impossible")),
  ];
  const seen = new Set<string>();
  for (const it of omega) {
    if (it.type === "drama") continue;
    const sid = it.subjectId || it.id;
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    const title = (it.title || "").trim();
    if (!title) continue;
    const ok = await upsertMovieRow({
      id: `omega_${sid}`,
      title,
      linkUrl: `https://stream.omegatech.app/stream?subjectId=${encodeURIComponent(sid)}`,
      coverUrl: it.poster || null,
      description: it.overview || null,
      category: it.year ? `Movie · ${it.year}` : "Movie · Catalog",
    });
    if (ok) n++;
  }

  try {
    const src = await prisma.apiSource.findFirst({ where: { category: "movie" } });
    if (src) {
      await prisma.apiSource.update({
        where: { id: src.id },
        data: {
          name: "Movies (vidsrc + Omegatech)",
          url: OMEGA,
          notes: MOVIE_TAG,
          enabled: true,
        },
      });
    } else {
      await prisma.apiSource.create({
        data: {
          category: "movie",
          name: "Movies (vidsrc + Omegatech)",
          url: OMEGA,
          notes: MOVIE_TAG,
          enabled: true,
        },
      });
    }
  } catch {
    /* ignore */
  }

  return n;
}

export async function importElitePlexDrama(_force = false): Promise<number> {
  let n = 0;
  const omega = await fetchOmegatechTrending();
  for (const it of omega) {
    if (it.type !== "drama") continue;
    const sid = it.subjectId || it.id;
    if (!sid) continue;
    const title = (it.title || "").trim();
    if (!title) continue;
    try {
      await prisma.$executeRaw`
        INSERT INTO "Content" (id, title, type, description, cover_url, link_url, link_type, category, status, created_at, updated_at)
        VALUES (
          ${`omega_d_${sid}`},
          ${title.slice(0, 200)},
          ${"drama"},
          ${it.overview || null},
          ${it.poster || null},
          ${`https://stream.omegatech.app/stream?subjectId=${encodeURIComponent(sid)}`},
          ${"stream"},
          ${it.year ? `Series · ${it.year}` : "Series"},
          ${"published"},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          cover_url = COALESCE(EXCLUDED.cover_url, "Content".cover_url),
          link_url = EXCLUDED.link_url,
          status = 'published',
          updated_at = NOW()
      `;
      n++;
    } catch {
      /* skip */
    }
  }
  return n;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<void> {
  await migrateBrokenEmbeds();
  try {
    const rows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c FROM "Content"
      WHERE type = ${type} AND status = 'published'
        AND id NOT LIKE 'bongo_%'
    `;
    const count = Number(rows[0]?.c || 0);
    if (type === "movie" && count < 15) {
      await importElitePlexMovies(true);
    } else if (type === "drama" && count < 5) {
      await importElitePlexDrama(true);
    }
  } catch (e) {
    console.error("ensureElitePlexContent", e);
  }
}
