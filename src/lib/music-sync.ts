import { prisma } from "@/lib/prisma";
import { fetchMusicCatalog } from "@/lib/public-apis";
import { contentCover } from "@/lib/covers";

const TAG = "music-auto-scrape-v2";
const MIN_SONGS = 40;

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

  const meta = await prisma.apiSource.findUnique({
    where: { category: "music-scrape" },
  });

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
  }

  await prisma.apiSource.upsert({
    where: { category: "music-scrape" },
    create: {
      category: "music-scrape",
      name: "Music auto-scrape",
      url: "itunes+ytm+freetouse",
      notes: JSON.stringify({ at: new Date().toISOString(), tag: TAG, added }),
      enabled: true,
    },
    update: {
      notes: JSON.stringify({ at: new Date().toISOString(), tag: TAG, added }),
      enabled: true,
      url: "itunes+ytm+freetouse",
    },
  });

  await prisma.apiSource.upsert({
    where: { category: "music" },
    create: {
      category: "music",
      name: "Music multi-source",
      url: "https://ytm.vrma.dev/search?q=Diamond+Platnumz&type=videos",
      notes: TAG,
      enabled: true,
    },
    update: { enabled: true, notes: TAG },
  });

  const total = await prisma.content.count({
    where: { type: "music", status: "published" },
  });
  return { added, total };
}
