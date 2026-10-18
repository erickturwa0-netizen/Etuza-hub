import { prisma } from "@/lib/prisma";
import { fetchPublicSeed, PUBLIC_API } from "@/lib/public-apis";
import type { Content, ContentType } from "@/types/database";

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

/** When a category is empty, pull from public API and save to DB once */
async function autoSeedIfEmpty(type: ContentType): Promise<Content[]> {
  if (!PUBLIC_API[type]) return [];

  try {
    const existing = await prisma.content.count({
      where: { type, status: "published" },
    });
    if (existing > 0) {
      const rows = await prisma.content.findMany({
        where: { type, status: "published" },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapRow);
    }

    const seeds = await fetchPublicSeed(type);
    if (seeds.length === 0) return [];

    const linkType = PUBLIC_API[type].linkType;
    for (const item of seeds) {
      await prisma.content.create({
        data: {
          type,
          title: item.title.slice(0, 200),
          description: item.description,
          linkUrl: item.linkUrl,
          coverUrl: item.coverUrl,
          linkType,
          category: item.category?.slice(0, 100) || null,
          status: "published",
        },
      });
    }

    const rows = await prisma.content.findMany({
      where: { type, status: "published" },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRow);
  } catch (e) {
    console.error("autoSeedIfEmpty", type, e);
    // Fallback: return live API results without DB (so UI still shows data)
    const seeds = await fetchPublicSeed(type);
    const linkType = PUBLIC_API[type]?.linkType || "stream";
    return seeds.map((s, i) => ({
      id: `seed-${type}-${i}`,
      type,
      title: s.title,
      description: s.description,
      cover_url: s.coverUrl,
      link_url: s.linkUrl,
      link_type: linkType,
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

export async function getPublishedContent(type?: ContentType): Promise<Content[]> {
  try {
    if (type) {
      const items = await prisma.content.findMany({
        where: { status: "published", type },
        orderBy: { createdAt: "desc" },
      });
      if (items.length > 0) return items.map(mapRow);
      return autoSeedIfEmpty(type);
    }

    const items = await prisma.content.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
    });
    if (items.length > 0) return items.map(mapRow);

    // Seed main categories in parallel
    const types: ContentType[] = ["movie", "music", "radio", "drama", "game"];
    const seeded = await Promise.all(types.map((t) => autoSeedIfEmpty(t)));
    return seeded.flat();
  } catch (e) {
    console.error("getPublishedContent", e);
    if (type && PUBLIC_API[type]) {
      return autoSeedIfEmpty(type);
    }
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
