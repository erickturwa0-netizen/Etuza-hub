import { prisma } from "@/lib/prisma";
import { importElitePlexMovies } from "@/lib/eliteplex";

/** Remove all Bongo YouTube movie rows */
export async function removeBongoMovies(): Promise<number> {
  try {
    const r = await prisma.$executeRaw`
      DELETE FROM "Content"
      WHERE type = 'movie'
        AND (
          id LIKE 'bongo_%'
          OR category LIKE 'Bongo%'
          OR link_url LIKE '%youtube.com%'
          OR link_url LIKE '%youtu.be%'
        )
        AND (category LIKE 'Bongo%' OR id LIKE 'bongo_%')
    `;
    return Number(r) || 0;
  } catch (e) {
    console.error("removeBongoMovies", e);
    return 0;
  }
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
      const id = `radio_${(s.stationuuid || title).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
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
  try {
    const res = await fetch(
      "https://www.freetogame.com/api/games?platform=browser&sort-by=popularity",
      {
        headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!res.ok) return 0;
    const list = (await res.json()) as {
      id?: number;
      title?: string;
      thumbnail?: string;
      short_description?: string;
      genre?: string;
      game_url?: string;
    }[];
    if (!Array.isArray(list)) return 0;
    let n = 0;
    for (const g of list.slice(0, 60)) {
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
            ${"download"},
            ${g.genre || "Browser Game"},
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
    console.error("seedBrowserGames", e);
    return 0;
  }
}

/** One-shot: drop Bongo, restore movie catalog, seed radio + games */
export async function rebuildCatalog() {
  const removed = await removeBongoMovies();
  const movies = await importElitePlexMovies(true);
  const radio = await seedRadioStations();
  const games = await seedBrowserGames();
  return { removed, movies, radio, games };
}
