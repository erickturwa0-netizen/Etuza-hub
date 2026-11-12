import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureElitePlexContent } from "@/lib/eliteplex";
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

type ContentRow = {
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
};

function mapRow(r: ContentRow) {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    description: r.description,
    coverUrl: r.cover_url,
    linkUrl: r.link_url,
    linkType: r.link_type,
    category: r.category,
    status: r.status,
    pointsCost: 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function listContentRaw(opts: {
  type?: string | null;
  publishedOnly?: boolean;
}) {
  const clauses: Prisma.Sql[] = [];
  if (opts.type) clauses.push(Prisma.sql`type = ${opts.type}`);
  if (opts.publishedOnly) clauses.push(Prisma.sql`status = 'published'`);
  const where =
    clauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<ContentRow[]>`
    SELECT id, title, type, description, cover_url, link_url, link_type,
           category, status, created_at, updated_at
    FROM "Content"
    ${where}
    ORDER BY updated_at DESC
    LIMIT 200
  `;
  return rows.map(mapRow);
}

export async function GET(req: Request) {
  try {
    try {
      await ensureUserSchema();
    } catch {
      /* ignore */
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const publishedOnly = searchParams.get("published") === "1";
    const mineOnly = searchParams.get("mine") === "1";
    const adminList = searchParams.get("admin") === "1";

    const session = adminList || mineOnly ? await getSession() : null;
    if (adminList && (!session || session.role !== "admin")) {
      return NextResponse.json({ error: "Admin only", items: [] }, { status: 403 });
    }

    if (!mineOnly && !adminList && (type === "movie" || type === "drama")) {
      try {
        await ensureElitePlexContent(type);
      } catch (e) {
        console.error("ensureElitePlexContent", type, e);
      }
    }

    let items;
    try {
      items = await listContentRaw({ type, publishedOnly });
    } catch (e) {
      console.error("listContentRaw", e);
      // last resort: prisma without pointsCost via select
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      if (type) where.type = type;
      if (publishedOnly) where.status = "published";
      items = await prisma.content.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          coverUrl: true,
          linkUrl: true,
          linkType: true,
          category: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (adminList || mineOnly) {
      const filtered = items.filter((it) => {
        const cat = (it.category || "").toLowerCase();
        if (cat.includes("eliteplex")) return false;
        if (cat.startsWith("api-")) return false;
        return true;
      });
      return NextResponse.json({ items: filtered });
    }

    const safe = items.map((it) =>
      sanitizeContentForClient({
        ...(it as unknown as Record<string, unknown>),
        pointsCost: 0,
      })
    );
    return NextResponse.json({ items: safe });
  } catch (err) {
    console.error("GET /api/content", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed", detail: message.slice(0, 500), items: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    await ensureUserSchema();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data si sahihi" }, { status: 400 });
    }
    const d = parsed.data;
    const linkType =
      d.type === "game" || d.type === "vpn" ? "download" : d.linkType;

    const item = await prisma.content.create({
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
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
