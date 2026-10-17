import { prisma } from "@/lib/prisma";
import { getPublished as getMockPublished, getAllContent as getMockAll } from "@/lib/mock-data";
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

export async function getPublishedContent(type?: ContentType): Promise<Content[]> {
  try {
    const items = await prisma.content.findMany({
      where: {
        status: "published",
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    if (items.length > 0) return items.map(mapRow);
  } catch (e) {
    console.error("getPublishedContent", e);
  }
  // fallback mock only for movie/game/vpn demo
  if (!type || type === "movie" || type === "game" || type === "vpn") {
    return getMockPublished(type);
  }
  return [];
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
    return getMockAll().filter((c) => !type || c.type === type);
  }
}
