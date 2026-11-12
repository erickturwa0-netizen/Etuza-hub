import { prisma } from "@/lib/prisma";
import type { Content, ContentType } from "@/types/database";
import { contentCover } from "@/lib/covers";

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

/** Fast DB-only list — never call external APIs (prevents homepage hang). */
async function listPublishedRaw(type?: ContentType): Promise<Content[]> {
  try {
    const rows = type
      ? await prisma.$queryRaw<RawRow[]>`
            SELECT id, type, title, description, cover_url, link_url, link_type,
                   category, status, created_at, updated_at
            FROM "Content"
            WHERE status = 'published' AND type = ${type}
            ORDER BY updated_at DESC
            LIMIT 200
          `
      : await prisma.$queryRaw<RawRow[]>`
            SELECT id, type, title, description, cover_url, link_url, link_type,
                   category, status, created_at, updated_at
            FROM "Content"
            WHERE status = 'published'
            ORDER BY updated_at DESC
            LIMIT 400
          `;
    return rows.map(mapRaw);
  } catch (e) {
    console.error("listPublishedRaw", type, e);
    return [];
  }
}

/**
 * Public catalog for pages. DB only — no ElitePlex / iTunes / seed network calls.
 * Seeding is Admin → Import all or /api/content movie ensure path.
 */
export async function getPublishedContent(
  type?: ContentType
): Promise<Content[]> {
  try {
    return await listPublishedRaw(type);
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
