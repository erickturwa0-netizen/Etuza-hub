import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureElitePlexContent } from "@/lib/eliteplex";
import { ensureGamesCatalog, seedRadioStations } from "@/lib/seed-catalog";
import { sanitizeContentForClient } from "@/lib/stream-token";
import { ensureUserSchema } from "@/lib/db-migrate";
import { Prisma } from "@prisma/client";

const schema = z.object({
  type: z.enum(["movie", "game", "vpn", "tv", "radio", "music", "drama"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  linkUrl: z.string().min(1),
  linkType: z.enum(["stream", "download"]).default("stream"),
  category: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("published"),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    await ensureUserSchema();

    if (type === "movie" || type === "drama") {
      try {
        await ensureElitePlexContent(type);
      } catch (e) {
        console.error("ensureElitePlexContent", type, e);
      }
    }
    if (type === "game") {
      try {
        await ensureGamesCatalog();
      } catch (e) {
        console.error("ensureGamesCatalog", e);
      }
    }
    if (type === "radio") {
      try {
        const rows = await prisma.$queryRaw<{ c: bigint }[]>`
          SELECT COUNT(*)::bigint AS c FROM "Content"
          WHERE type = 'radio' AND status = 'published'
        `;
        if (Number(rows[0]?.c || 0) < 5) await seedRadioStations();
      } catch (e) {
        console.error("ensureRadio", e);
      }
    }

    // Raw SQL avoids Prisma schema drift (points_cost etc.)
    const params: unknown[] = [];
    let where = `WHERE status = 'published'`;
    if (type) {
      params.push(type);
      where += ` AND type = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (title ILIKE $${params.length} OR COALESCE(category,'') ILIKE $${params.length})`;
    }

    const sql = `
      SELECT id, title, type, description, cover_url, link_url, link_type,
             category, status, created_at, updated_at
      FROM "Content"
      ${where}
      ORDER BY updated_at DESC
      LIMIT 200
    `;

    const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as {
      id: string;
      title: string;
      type: string;
      description: string | null;
      cover_url: string | null;
      link_url: string;
      link_type: string;
      category: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
    }[];

    const items = rows.map((r) => {
      const mapped = {
        id: r.id,
        title: r.title,
        type: r.type,
        description: r.description,
        coverUrl: r.cover_url,
        linkUrl: r.link_url,
        linkType: r.link_type,
        category: r.category,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
      return sanitizeContentForClient(mapped);
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("content GET", err);
    return NextResponse.json(
      { items: [], error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureUserSchema();
    const body = await req.json();
    const d = schema.parse(body);
    const linkType =
      d.type === "game" || d.type === "vpn" ? d.linkType : d.linkType;

    const row = await prisma.content.create({
      data: {
        type: d.type,
        title: d.title,
        description: d.description || null,
        coverUrl: d.coverUrl || null,
        linkUrl: d.linkUrl,
        linkType,
        category: d.category || null,
        status: d.status,
      },
    });
    return NextResponse.json({ item: row });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
