import { prisma } from "@/lib/prisma";
import { importElitePlexMovies } from "@/lib/eliteplex";

/** Remove residual Bongo movie rows */
export async function removeBongoMovies(): Promise<number> {
  try {
    const r = await prisma.$executeRaw`
      DELETE FROM "Content"
      WHERE type = 'movie'
        AND (id LIKE 'bongo_%' OR category LIKE 'Bongo%')
    `;
    return Number(r) || 0;
  } catch (e) {
    console.error("removeBongoMovies", e);
    return 0;
  }
}

/** Online play-in-browser games (no download) */
const FEATURED_WEB_GAMES: {
  id: string;
  title: string;
  linkUrl: string;
  coverUrl: string;
  category: string;
  description: string;
}[] = [
  {
    id: "webgame_tokyo_drift",
    title: "Tokyo Drift",
    linkUrl: "https://tokyodrift.mindblown.ai/",
    coverUrl: "https://tokyodrift.mindblown.ai/og-image.png",
    category: "Race · Online",
    description: "Race free online — hakuna kudownload. Cheza moja kwa moja.",
  },
  {
    id: "webgame_vector",
    title: "Vector",
    linkUrl: "https://vector.game/",
    coverUrl: "https://vector.game/favicon.ico",
    category: "Parkour · Online",
    description: "Vector free online — cheza hapa hapa bila kudownload.",
  },
  {
    id: "webgame_slope",
    title: "Slope",
    linkUrl: "https://slope-game.io/",
    coverUrl: "https://slope-game.io/logo.png",
    category: "Arcade · Online",
    description: "Slope — endless runner online.",
  },
];

export async function seedFeaturedWebGames(): Promise<number> {
  let n = 0;
  for (const g of FEATURED_WEB_GAMES) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "Content" (id, title, type, description, cover_url, link_url, link_type, category, status, created_at, updated_at)
        VALUES (
          ${g.id},
          ${g.title},
          ${"game"},
          ${g.description},
          ${g.coverUrl},
          ${g.linkUrl},
          ${"stream"},
          ${g.category},
          ${"published"},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          link_url = EXCLUDED.link_url,
          link_type = 'stream',
          cover_url = COALESCE(EXCLUDED.cover_url, "Content".cover_url),
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          status = 'published',
          updated_at = NOW()
      `;
      n++;
    } catch (e) {
      console.error("seedFeaturedWebGames", g.id, e);
    }
  }
  return n;
}

export async function seedRadioStations(): Promise<number> {
  try {
    const res = await fetch(
      "https://de1.api.radio-browser.info/json/stations/search?countrycode=TZ&hidebroken=true&order=clickcount&reverse=true&limit=50",
      {
        headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return 0;
    const list = (await res.json()) as {
      stationuuid?: string;
      name?: string;
      url?: string;
      url_resolved?: string;
      favicon?: string;
      tags?: string;
    }[];
    if (!Array.isArray(list)) return 0;
    let n = 0;
    for (const s of list) {
      const title = (s.name || "").trim();
      const link = (s.url_resolved || s.url || "").trim();
      if (!title || !link) continue;
      const id = `radio_${(s.stationuuid || title)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 40)}`;
      try {
        await prisma.$executeRaw`
          INSERT INTO "Content" (id, title, type, description, cover_url, link_url, link_type, category, status, created_at, updated_at)
          VALUES (
            ${id},
            ${title.slice(0, 200)},
            ${"radio"},
            ${s.tags || "Radio Tanzania"},
            ${s.favicon || null},
            ${link},
            ${"stream"},
            ${"Radio · TZ"},
            ${"published"},
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            link_url = EXCLUDED.link_url,
            cover_url = COALESCE(EXCLUDED.cover_url, "Content".cover_url),
            status = 'published',
            updated_at = NOW()
        `;
        n++;
      } catch {
        /* skip */
      }
    }
    return n;
  } catch (e) {
    console.error("seedRadioStations", e);
    return 0;
  }
}

export async function seedBrowserGames(): Promise<number> {
  let n = await seedFeaturedWebGames();
  try {
    const res = await fetch(
      "https://www.freetogame.com/api/games?platform=browser&sort-by=popularity",
      {
        headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!res.ok) return n;
    const list = (await res.json()) as {
      id?: number;
      title?: string;
      thumbnail?: string;
      short_description?: string;
      genre?: string;
      game_url?: string;
    }[];
    if (!Array.isArray(list)) return n;
    for (const g of list.slice(0, 40)) {
      const title = (g.title || "").trim();
      const link = (g.game_url || "").trim();
      if (!title || !link) continue;
      const id = `game_${g.id || title.replace(/\W/g, "").slice(0, 24)}`;
      try {
        await prisma.$executeRaw`
          INSERT INTO "Content" (id, title, type, description, cover_url, link_url, link_type, category, status, created_at, updated_at)
          VALUES (
            ${id},
            ${title.slice(0, 200)},
            ${"game"},
            ${g.short_description || null},
            ${g.thumbnail || null},
            ${link},
            ${"stream"},
            ${g.genre ? `${g.genre} · Online` : "Browser Game"},
            ${"published"},
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            link_url = EXCLUDED.link_url,
            link_type = 'stream',
            cover_url = COALESCE(EXCLUDED.cover_url, "Content".cover_url),
            status = 'published',
            updated_at = NOW()
        `;
        n++;
      } catch {
        /* skip */
      }
    }
    return n;
  } catch (e) {
    console.error("seedBrowserGames", e);
    return n;
  }
}

export async function ensureGamesCatalog(): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c FROM "Content"
      WHERE type = 'game' AND status = 'published'
    `;
    const count = Number(rows[0]?.c || 0);
    if (count < 3) {
      await seedBrowserGames();
    } else {
      await seedFeaturedWebGames();
    }
  } catch (e) {
    console.error("ensureGamesCatalog", e);
  }
}

/** One-shot catalog rebuild */
export async function rebuildCatalog() {
  const removed = await removeBongoMovies();
  const movies = await importElitePlexMovies(true);
  const radio = await seedRadioStations();
  const games = await seedBrowserGames();
  return { removed, movies, radio, games };
}
