import { prisma } from "@/lib/prisma";
import { PINNED_CHANNELS, type IptvChannel } from "@/lib/iptv";

const BASE = "https://eliteplex-api.vercel.app";

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
};

export type SyncReport = {
  moviesAdded: number;
  moviesTotal: number;
  dramaAdded: number;
  dramaTotal: number;
  tvLive: number;
  tvDead: string[];
  ranAt: string;
};

async function fetchPages(path: string, pages: number[]): Promise<EliteItem[]> {
  const out: EliteItem[] = [];
  for (const page of pages) {
    try {
      const res = await fetch(`${BASE}${path}?page=${page}`, {
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

function yearNum(y?: string) {
  const n = parseInt(String(y || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Add only NEW movies from ElitePlex (no full wipe) */
export async function syncNewMovies(): Promise<{ added: number; total: number }> {
  const remote = await fetchPages("/api/movies", [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20]);
  const existing = await prisma.content.findMany({
    where: { type: "movie" },
    select: { linkUrl: true },
  });
  const have = new Set(
    existing.map((e) => {
      const m = (e.linkUrl || "").match(/\/movie\/(\d+)/);
      return m ? m[1] : "";
    }).filter(Boolean)
  );

  let added = 0;
  for (const row of remote) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!/^\d{2,7}$/.test(id) || !title || have.has(id)) continue;
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
    have.add(id);
    added++;
  }

  await prisma.apiSource.upsert({
    where: { category: "movie" },
    create: {
      category: "movie",
      name: "ElitePlex Movies",
      url: `${BASE}/api/movies`,
      notes: `sync-${new Date().toISOString()}`,
      enabled: true,
    },
    update: {
      notes: `sync-${new Date().toISOString()}`,
      enabled: true,
    },
  });

  const total = await prisma.content.count({
    where: { type: "movie", status: "published" },
  });
  return { added, total };
}

/** Add only NEW series/anime (drama) */
export async function syncNewDrama(): Promise<{ added: number; total: number }> {
  const series = await fetchPages("/api/series", [1, 2, 3, 4, 5, 6, 8, 10]);
  let anime: EliteItem[] = [];
  try {
    anime = await fetchPages("/api/anime", [1, 2, 3, 4]);
  } catch {
    /* optional */
  }

  const existing = await prisma.content.findMany({
    where: { type: "drama" },
    select: { linkUrl: true },
  });
  const have = new Set(
    existing.map((e) => {
      const m = (e.linkUrl || "").match(/\/tv\/(\d+)/);
      return m ? m[1] : "";
    }).filter(Boolean)
  );

  let added = 0;
  const animeIds = new Set(
    anime.map((a) => String(a.tmdb_id || a.id || "")).filter(Boolean)
  );

  for (const row of [...series, ...anime]) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!/^\d{2,7}$/.test(id) || !title || have.has(id)) continue;
    const isAnime = animeIds.has(id);
    await prisma.content.create({
      data: {
        type: "drama",
        title: title.slice(0, 200),
        description: row.overview ? String(row.overview).slice(0, 500) : null,
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
    have.add(id);
    added++;
  }

  await prisma.apiSource.upsert({
    where: { category: "drama" },
    create: {
      category: "drama",
      name: "ElitePlex Series+Anime",
      url: `${BASE}/api/series`,
      notes: `sync-${new Date().toISOString()}`,
      enabled: true,
    },
    update: {
      notes: `sync-${new Date().toISOString()}`,
      enabled: true,
    },
  });

  const total = await prisma.content.count({
    where: { type: "drama", status: "published" },
  });
  return { added, total };
}

/** Probe a single m3u8 / stream URL */
export async function isStreamLive(url: string, timeoutMs = 6000): Promise<boolean> {
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

/** Check all pinned TV channels; return live list + dead titles */
export async function healthCheckTv(): Promise<{
  live: IptvChannel[];
  dead: string[];
}> {
  const live: IptvChannel[] = [];
  const dead: string[] = [];
  // sequential small batches to avoid timeout
  for (const ch of PINNED_CHANNELS) {
    const ok = await isStreamLive(ch.url);
    if (ok) live.push(ch);
    else dead.push(ch.title);
  }
  return { live, dead };
}

/** Full catalog sync: new movies + drama + TV health */
export async function runCatalogSync(): Promise<SyncReport> {
  const movies = await syncNewMovies();
  const drama = await syncNewDrama();
  const tv = await healthCheckTv();

  return {
    moviesAdded: movies.added,
    moviesTotal: movies.total,
    dramaAdded: drama.added,
    dramaTotal: drama.total,
    tvLive: tv.live.length,
    tvDead: tv.dead,
    ranAt: new Date().toISOString(),
  };
}
