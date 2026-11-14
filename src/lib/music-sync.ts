import { prisma } from "@/lib/prisma";
import { fetchMusicCatalog } from "@/lib/public-apis";
import { contentCover } from "@/lib/covers";

const TAG = "music-auto-scrape-v2";
const MIN_SONGS = 40;
const MUSIC_SCRAPE_ID = "sys_music_scrape";
const MUSIC_SOURCE_ID = "sys_music_source";

/**
 * Auto-scrape when music catalog is thin.
 * Sources: iTunes + ytm.vrma.dev videos + freetouse MP3.
 */
export async function ensureMusicCatalog(): Promise<{
  added: number;
  total: number;
}> {
  const total = await prisma.content.count({
    where: { type: "music", status: "published" },
  });

  let meta: { notes: string | null } | null = null;
  try {
    meta = await prisma.apiSource.findUnique({
      where: { id: MUSIC_SCRAPE_ID },
    });
  } catch {
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT notes FROM "ApiSource" WHERE id = $1 OR category = $2 LIMIT 1`,
        MUSIC_SCRAPE_ID,
        "music-scrape"
      )) as { notes: string | null }[];
      meta = rows[0] || null;
    } catch {
      meta = null;
    }
  }

  let lastAt = 0;
  try {
    if (meta?.notes) {
      const j = JSON.parse(meta.notes) as { at?: string; tag?: string };
      if (j.at) lastAt = new Date(j.at).getTime();
    }
  } catch {
    /* ignore */
  }

  const ageMs = Date.now() - lastAt;
  const stale = ageMs > 6 * 60 * 60 * 1000;
  const need = total < MIN_SONGS || (stale && total < 300);

  if (!need) {
    return { added: 0, total };
  }

  return syncNewMusic();
}

/** Full music scrape — iTunes + Video Music + FreeToUse */
export async function syncNewMusic(): Promise<{ added: number; total: number }> {
  const seeds = await fetchMusicCatalog();
  if (!seeds.length) {
    const total = await prisma.content.count({
      where: { type: "music", status: "published" },
    });
    return { added: 0, total };
  }

  const existing = await prisma.content.findMany({
    where: { type: "music" },
    select: { linkUrl: true },
  });
  const have = new Set(
    existing
      .map((e) => (e.linkUrl || "").split("?")[0].toLowerCase())
      .filter(Boolean)
  );

  let added = 0;
  const BATCH = 50;
  const toInsert = seeds.filter((s) => {
    const key = s.linkUrl.split("?")[0].toLowerCase();
    if (!key || have.has(key)) return false;
    have.add(key);
    return true;
  });

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    try {
      await prisma.content.createMany({
        data: batch.map((item) => ({
          type: "music",
          title: item.title.slice(0, 200),
          description: item.description,
          linkUrl: item.linkUrl,
          coverUrl: item.coverUrl || contentCover("music", item.title, null),
          linkType: "stream",
          category: item.category?.slice(0, 100) || "Music",
          status: "published",
        })),
        skipDuplicates: true,
      });
      added += batch.length;
    } catch (e) {
      console.error("music createMany", e);
      // Fallback: insert one by one without optional columns
      for (const item of batch) {
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Content" (id, type, title, description, link_url, cover_url, link_type, category, status, created_at, updated_at)
             VALUES ($1, 'music', $2, $3, $4, $5, 'stream', $6, 'published', NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            `music_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            item.title.slice(0, 200),
            item.description || null,
            item.linkUrl,
            item.coverUrl || contentCover("music", item.title, null),
            item.category?.slice(0, 100) || "Music"
          );
          added += 1;
        } catch {
          /* skip row */
        }
      }
    }
  }

  const notes = JSON.stringify({
    at: new Date().toISOString(),
    tag: TAG,
    added,
  });

  try {
    await prisma.apiSource.upsert({
      where: { id: MUSIC_SCRAPE_ID },
      create: {
        id: MUSIC_SCRAPE_ID,
        category: "music-scrape",
        name: "Music auto-scrape",
        url: "itunes+ytm+freetouse",
        notes,
        enabled: true,
      },
      update: {
        notes,
        enabled: true,
        url: "itunes+ytm+freetouse",
      },
    });
  } catch (e) {
    console.error("music scrape meta", e);
  }

  try {
    await prisma.apiSource.upsert({
      where: { id: MUSIC_SOURCE_ID },
      create: {
        id: MUSIC_SOURCE_ID,
        category: "music",
        name: "Music multi-source",
        url: "https://ytm.vrma.dev/search?q=Diamond+Platnumz&type=videos",
        notes: TAG,
        enabled: true,
      },
      update: { enabled: true, notes: TAG },
    });
  } catch (e) {
    console.error("music source meta", e);
  }

  const total = await prisma.content.count({
    where: { type: "music", status: "published" },
  });
  return { added, total };
}
