import { prisma } from "@/lib/prisma";
import { fetchPublicSeed, PUBLIC_API } from "@/lib/public-apis";
import { contentCover } from "@/lib/covers";
import type { Content, ContentType } from "@/types/database";
import { ensureBongoMovies } from "@/lib/bongo-movies";

type RawRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  link_url: string;
  link_type: string;
  category: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

function mapRaw(c: RawRow): Content {
  const cover = contentCover(c.type, c.title, c.cover_url);
  return {
    id: c.id,
    type: c.type as ContentType,
    title: c.title,
    description: c.description,
    cover_url: cover,
    link_url: c.link_url,
    link_type: c.link_type as "stream" | "download",
    category: c.category,
    status: c.status as "draft" | "published",
    protocol: null,
    country: null,
    network: null,
    config_text: null,
    file_url: null,
    brand_logo_url: null,
    tmdb_id: null,
    views_count: 0,
    created_by: null,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  };
}

async function listPublishedRaw(type?: ContentType): Promise<Content[]> {
  try {
    const rows = type
      ? await prisma.$queryRaw<RawRow[]>`
            SELECT id, type, title, description, cover_url, link_url, link_type,
                   category, status, created_at, updated_at
            FROM "Content"
            WHERE status = 'published' AND type = ${type}
            ORDER BY updated_at DESC
            LIMIT 300
          `
      : await prisma.$queryRaw<RawRow[]>`
            SELECT id, type, title, description, cover_url, link_url, link_type,
                   category, status, created_at, updated_at
            FROM "Content"
            WHERE status = 'published'
            ORDER BY updated_at DESC
            LIMIT 500
          `;
    return rows.map(mapRaw);
  } catch (e) {
    console.error("listPublishedRaw", type, e);
    return [];
  }
}

async function seedIfEmpty(type: ContentType): Promise<Content[]> {
  if (type === "game" || type === "vpn") return [];

  if (type === "movie") {
    try {
      await ensureBongoMovies();
    } catch (e) {
      console.error("ensureBongoMovies", e);
    }
    return listPublishedRaw("movie");
  }

  const cfg = PUBLIC_API[type];
  if (!cfg) return [];

  try {
    const existing = await listPublishedRaw(type);
    if (existing.length > 0) return existing;

    const seeds = await fetchPublicSeed(type);
    if (seeds.length === 0) return [];

    for (const item of seeds) {
      try {
        await prisma.content.create({
          data: {
            type,
            title: item.title.slice(0, 200),
            description: item.description,
            linkUrl: item.linkUrl,
            coverUrl: item.coverUrl || contentCover(type, item.title, null),
            linkType: cfg.linkType,
            category: item.category?.slice(0, 100) || null,
            status: "published",
          },
        });
      } catch {
        /* skip */
      }
    }

    return listPublishedRaw(type);
  } catch (e) {
    console.error("seedIfEmpty", type, e);
    return [];
  }
}

export async function getPublishedContent(
  type?: ContentType
): Promise<Content[]> {
  try {
    if (type) {
      let items = await listPublishedRaw(type);
      if (items.length > 0) return items;

      if (type === "game" || type === "vpn") return [];
      if (type === "movie" || PUBLIC_API[type]) {
        return seedIfEmpty(type);
      }
      return [];
    }

    let items = await listPublishedRaw();
    if (items.length > 0) return items;

    const types = (Object.keys(PUBLIC_API) as ContentType[]).filter(
      (t) => t !== "game" && t !== "vpn"
    );
    if (!types.includes("movie" as ContentType)) {
      types.push("movie" as ContentType);
    }
    await Promise.all(types.map((t) => seedIfEmpty(t)));
    return listPublishedRaw();
  } catch (e) {
    console.error("getPublishedContent", e);
    return [];
  }
}

export async function getAllContentFromDb(type?: string): Promise<Content[]> {
  try {
    return listPublishedRaw(type as ContentType | undefined);
  } catch (e) {
    console.error("getAllContentFromDb", e);
    return [];
  }
}
