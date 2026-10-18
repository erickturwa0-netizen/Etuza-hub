import { prisma } from "@/lib/prisma";
import { fetchPublicSeed, PUBLIC_API } from "@/lib/public-apis";
import type { Content, ContentType } from "@/types/database";

const SEED_TAG = "media-apis-v2";

function mapRow(c: {
  id: string;
  type: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  linkUrl: string;
  linkType: string;
  category: string | null;
  status: string;
  protocol: string | null;
  country: string | null;
  network: string | null;
  configText: string | null;
  fileUrl: string | null;
  viewsCount: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Content {
  return {
    id: c.id,
    type: c.type as ContentType,
    title: c.title,
    description: c.description,
    cover_url: c.coverUrl,
    link_url: c.linkUrl,
    link_type: c.linkType as "stream" | "download",
    category: c.category,
    status: c.status as "draft" | "published",
    protocol: c.protocol,
    country: c.country,
    network: c.network,
    config_text: c.configText,
    file_url: c.fileUrl,
    brand_logo_url: null,
    tmdb_id: null,
    views_count: c.viewsCount,
    created_by: c.createdBy,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

/** Wipe old rows for this type and insert from media-apis public endpoints */
async function reseedFromPublicApi(type: ContentType): Promise<Content[]> {
  const cfg = PUBLIC_API[type];
  if (!cfg) return [];

  const seeds = await fetchPublicSeed(type);
  if (seeds.length === 0) {
    // Still return live list without DB if fetch works but empty filter
    return [];
  }

  try {
    await prisma.content.deleteMany({ where: { type } });

    for (const item of seeds) {
      await prisma.content.create({
        data: {
          type,
          title: item.title.slice(0, 200),
          description: item.description,
          linkUrl: item.linkUrl,
          coverUrl: item.coverUrl,
          linkType: cfg.linkType,
          category: item.category?.slice(0, 100) || null,
          status: "published",
        },
      });
    }

    // Mark this API source as seeded with new APIs
    await prisma.apiSource.upsert({
      where: { category: type },
      create: {
        category: type,
        name: type,
        url: cfg.url,
        notes: SEED_TAG,
        enabled: true,
      },
      update: { url: cfg.url, notes: SEED_TAG, enabled: true },
    });

    const rows = await prisma.content.findMany({
      where: { type, status: "published" },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRow);
  } catch (e) {
    console.error("reseedFromPublicApi", type, e);
    // Fallback: show API data without persisting
    return seeds.map((s, i) => ({
      id: `live-${type}-${i}`,
      type,
      title: s.title,
      description: s.description,
      cover_url: s.coverUrl,
      link_url: s.linkUrl,
      link_type: cfg.linkType,
      category: s.category,
      status: "published" as const,
      protocol: null,
      country: null,
      network: null,
      config_text: null,
      file_url: null,
      brand_logo_url: null,
      tmdb_id: null,
      views_count: 0,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }
}

async function needsReseed(type: string): Promise<boolean> {
  try {
    const src = await prisma.apiSource.findUnique({ where: { category: type } });
    if (!src || src.notes !== SEED_TAG) return true;
    const count = await prisma.content.count({
      where: { type, status: "published" },
    });
    return count === 0;
  } catch {
    return true;
  }
}

export async function getPublishedContent(type?: ContentType): Promise<Content[]> {
  try {
    if (type) {
      if (PUBLIC_API[type] && (await needsReseed(type))) {
        return reseedFromPublicApi(type);
      }
      const items = await prisma.content.findMany({
        where: { status: "published", type },
        orderBy: { createdAt: "desc" },
      });
      if (items.length > 0) return items.map(mapRow);
      if (PUBLIC_API[type]) return reseedFromPublicApi(type);
      return [];
    }

    // Home: ensure each public category is seeded
    const types = Object.keys(PUBLIC_API) as ContentType[];
    await Promise.all(
      types.map(async (t) => {
        if (await needsReseed(t)) await reseedFromPublicApi(t);
      })
    );

    const items = await prisma.content.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
    });
    return items.map(mapRow);
  } catch (e) {
    console.error("getPublishedContent", e);
    if (type && PUBLIC_API[type]) return reseedFromPublicApi(type);
    return [];
  }
}

export async function getAllContentFromDb(type?: string): Promise<Content[]> {
  try {
    const items = await prisma.content.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return items.map(mapRow);
  } catch (e) {
    console.error("getAllContentFromDb", e);
    return [];
  }
}
