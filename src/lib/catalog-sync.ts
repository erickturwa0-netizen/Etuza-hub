import { prisma } from "@/lib/prisma";
import { PINNED_CHANNELS, type IptvChannel } from "@/lib/iptv";
import { syncNewMusic } from "@/lib/music-sync";

const ELITE = "https://eliteplex-api.vercel.app";
const MAX_PLAYABLE_YEAR = 2026;
const TMDB_KEY =
  process.env.TMDB_API_KEY || "a0d71cffe2d6693d462af9e4f336bc06";

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
};

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

export type SyncReport = {
  moviesAdded: number;
  moviesTotal: number;
  dramaAdded: number;
  dramaTotal: number;
  musicAdded: number;
  musicTotal: number;
  tvLive: number;
  tvDead: string[];
  newTitles: string[];
  ranAt: string;
};

async function fetchElitePages(path: string, pages: number[]): Promise<EliteItem[]> {
  const out: EliteItem[] = [];
  for (const page of pages) {
    try {
      const res = await fetch(`${ELITE}${path}?page=${page}`, {
        headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB-SYNC/1.0" },
        cache: "no-store",
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

async function fetchTmdbMovies(pages = 20): Promise<TmdbMovie[]> {
  const out: TmdbMovie[] = [];
  const endpoints = [
    "movie/popular",
    "movie/top_rated",
    "trending/movie/week",
    "movie/now_playing",
    "movie/upcoming",
  ];

  for (const ep of endpoints) {
    for (let page = 1; page <= pages; page++) {
      try {
        const url = `https://api.themoviedb.org/3/${ep}?api_key=${TMDB_KEY}&language=en-US&page=${page}&include_adult=false`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) break;
        const data = await res.json();
        const results = (data?.results || []) as TmdbMovie[];
        if (!results.length) break;
        out.push(...results);
      } catch {
        break;
      }
    }
  }
  const seen = new Set<number>();
  return out.filter((m) => {
    if (!m.id || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

async function fetchTmdbTv(pages = 15): Promise<TmdbMovie[]> {
  const out: TmdbMovie[] = [];
  const endpoints = [
    "tv/popular",
    "tv/top_rated",
    "trending/tv/week",
    "tv/on_the_air",
  ];
  for (const ep of endpoints) {
    for (let page = 1; page <= pages; page++) {
      try {
        const url = `https://api.themoviedb.org/3/${ep}?api_key=${TMDB_KEY}&language=en-US&page=${page}&include_adult=false`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) break;
        const data = await res.json();
        const results = (data?.results || []) as TmdbMovie[];
        if (!results.length) break;
        out.push(...results);
      } catch {
        break;
      }
    }
  }
  const seen = new Set<number>();
  return out.filter((m) => {
    if (!m.id || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

function yearNum(y?: string) {
  const n = parseInt(String(y || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

async function saveNewContentBanner(titles: string[]) {
  if (!titles.length) return;
  const payload = JSON.stringify({
    titles: titles.slice(0, 12),
    at: new Date().toISOString(),
  });
  await prisma.apiSource.upsert({
    where: { category: "new_content_banner" },
    create: {
      category: "new_content_banner",
      name: "New content banner",
      url: "",
      notes: payload,
      enabled: true,
    },
    update: { notes: payload, enabled: true },
  });
}

export async function getNewContentBanner(): Promise<{
  titles: string[];
  at: string | null;
} | null> {
  try {
    const row = await prisma.apiSource.findUnique({
      where: { category: "new_content_banner" },
    });
    if (!row?.notes || !row.enabled) return null;
    const data = JSON.parse(row.notes) as { titles?: string[]; at?: string };
    if (!data.titles?.length) return null;
    if (data.at) {
      const age = Date.now() - new Date(data.at).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) return null;
    }
    return { titles: data.titles, at: data.at || null };
  } catch {
    return null;
  }
}

export async function syncNewMovies(): Promise<{
  added: number;
  total: number;
  titles: string[];
}> {
  const remote = await fetchElitePages(
    "/api/movies",
    Array.from({ length: 40 }, (_, i) => i + 1)
  );
  const tmdbMovies = await fetchTmdbMovies(20);

  const existing = await prisma.content.findMany({
    where: { type: "movie" },
    select: { linkUrl: true },
  });
  const have = new Set(
    existing
      .map((e) => {
        const m = (e.linkUrl || "").match(/\/movie\/(\d+)/);
        return m ? m[1] : "";
      })
      .filter(Boolean)
  );

  let added = 0;
  const titles: string[] = [];

  for (const row of remote) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!/^\d{2,7}$/.test(id) || !title || have.has(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_PLAYABLE_YEAR) continue;
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
    have.add(id);
    added++;
    titles.push(title);
  }

  for (const m of tmdbMovies) {
    const id = String(m.id);
    const title = String(m.title || m.name || "").trim();
    if (!title || have.has(id)) continue;
    const y = yearNum(m.release_date || m.first_air_date);
    if (y && y > MAX_PLAYABLE_YEAR) continue;

    const poster = m.poster_path
      ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
      : null;

    await prisma.content.create({
      data: {
        type: "movie",
        title: title.slice(0, 200),
        description: m.overview ? String(m.overview).slice(0, 500) : null,
        linkUrl: `https://player.videasy.to/movie/${id}`,
        coverUrl: poster,
        linkType: "stream",
        category: y ? `Movie · ${y}` : "Movie",
        status: "published",
      },
    });
    have.add(id);
    added++;
    titles.push(title);
  }

  if (titles.length) await saveNewContentBanner(titles);

  const total = await prisma.content.count({
    where: { type: "movie", status: "published" },
  });
  return { added, total, titles };
}

export async function syncNewDrama(): Promise<{
  added: number;
  total: number;
  titles: string[];
}> {
  const series = await fetchElitePages(
    "/api/series",
    Array.from({ length: 30 }, (_, i) => i + 1)
  );
  const tmdbTv = await fetchTmdbTv(15);

  const existing = await prisma.content.findMany({
    where: { type: "drama" },
    select: { linkUrl: true },
  });
  const haveIds = new Set(
    existing
      .map((e) => {
        const m = (e.linkUrl || "").match(/\/tv\/(\d+)/);
        return m ? m[1] : "";
      })
      .filter(Boolean)
  );

  let added = 0;
  const titles: string[] = [];

  for (const row of series) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!/^\d{2,7}$/.test(id) || !title || haveIds.has(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_PLAYABLE_YEAR) continue;
    await prisma.content.create({
      data: {
        type: "drama",
        title: title.slice(0, 200),
        description: row.overview ? String(row.overview).slice(0, 500) : null,
        linkUrl: `https://player.videasy.to/tv/${id}`,
        coverUrl: row.poster || null,
        linkType: "stream",
        category: y ? `Series · ${y}` : "Series",
        status: "published",
      },
    });
    haveIds.add(id);
    added++;
    titles.push(title);
  }

  for (const m of tmdbTv) {
    const id = String(m.id);
    const title = String(m.name || m.title || "").trim();
    if (!title || haveIds.has(id)) continue;
    const y = yearNum(m.first_air_date || m.release_date);
    if (y && y > MAX_PLAYABLE_YEAR) continue;
    const poster = m.poster_path
      ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
      : null;
    await prisma.content.create({
      data: {
        type: "drama",
        title: title.slice(0, 200),
        description: m.overview ? String(m.overview).slice(0, 500) : null,
        linkUrl: `https://player.videasy.to/tv/${id}`,
        coverUrl: poster,
        linkType: "stream",
        category: y ? `Series · ${y}` : "Series",
        status: "published",
      },
    });
    haveIds.add(id);
    added++;
    titles.push(title);
  }

  const total = await prisma.content.count({
    where: { type: "drama", status: "published" },
  });
  return { added, total, titles };
}

export async function isStreamLive(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "ETUZA-HUB-HEALTH/1.0" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return false;
    const text = (await res.text()).slice(0, 200);
    return (
      text.includes("#EXT") ||
      text.includes("m3u8") ||
      text.includes("BANDWIDTH") ||
      text.length > 40
    );
  } catch {
    return false;
  }
}

export async function healthCheckTv(): Promise<{
  live: IptvChannel[];
  dead: string[];
}> {
  const live: IptvChannel[] = [];
  const dead: string[] = [];
  const liveIds: string[] = [];

  const batch = 6;
  for (let i = 0; i < PINNED_CHANNELS.length; i += batch) {
    const slice = PINNED_CHANNELS.slice(i, i + batch);
    const results = await Promise.all(
      slice.map(async (ch) => ({ ch, ok: await isStreamLive(ch.url) }))
    );
    for (const r of results) {
      if (r.ok) {
        live.push(r.ch);
        liveIds.push(r.ch.id);
      } else {
        dead.push(r.ch.title);
      }
    }
  }

  await prisma.apiSource.upsert({
    where: { category: "tv_live_ids" },
    create: {
      category: "tv_live_ids",
      name: "TV live channel ids",
      url: "",
      notes: JSON.stringify({ ids: liveIds, at: new Date().toISOString() }),
      enabled: true,
    },
    update: {
      notes: JSON.stringify({ ids: liveIds, at: new Date().toISOString() }),
      enabled: true,
    },
  });

  return { live, dead };
}

export async function getCachedLiveTvIds(): Promise<string[] | null> {
  try {
    const row = await prisma.apiSource.findUnique({
      where: { category: "tv_live_ids" },
    });
    if (!row?.notes) return null;
    const data = JSON.parse(row.notes) as { ids?: string[]; at?: string };
    if (!data.ids?.length) return null;
    if (data.at) {
      const age = Date.now() - new Date(data.at).getTime();
      if (age > 12 * 60 * 60 * 1000) return null;
    }
    return data.ids;
  } catch {
    return null;
  }
}

export async function runCatalogSync(): Promise<SyncReport> {
  const movies = await syncNewMovies();
  const drama = await syncNewDrama();
  const music = await syncNewMusic();
  const tv = await healthCheckTv();
  const newTitles = [...movies.titles, ...drama.titles].slice(0, 12);
  if (newTitles.length) await saveNewContentBanner(newTitles);
  return {
    moviesAdded: movies.added,
    moviesTotal: movies.total,
    dramaAdded: drama.added,
    dramaTotal: drama.total,
    musicAdded: music.added,
    musicTotal: music.total,
    tvLive: tv.live.length,
    tvDead: tv.dead,
    newTitles,
    ranAt: new Date().toISOString(),
  };
}
