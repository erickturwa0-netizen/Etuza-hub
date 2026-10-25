import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureElitePlexContent } from "@/lib/eliteplex";

const schema = z.object({
  type: z.enum(["movie", "game", "vpn", "tv", "radio", "music", "drama"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  linkUrl: z.string().min(1),
  linkType: z.enum(["stream", "download"]).default("stream"),
  category: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("published"),
  protocol: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  network: z.string().optional().nullable(),
  configText: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  priceMode: z.enum(["free", "once", "week", "month", "year"]).optional(),
  priceTzs: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const publishedOnly = searchParams.get("published") === "1";

    if (type === "movie" || type === "drama") {
      try {
        await ensureElitePlexContent(type);
      } catch (e) {
        console.error("ensureElitePlexContent", type, e);
      }
    }

    const where: Record<string, string> = {};
    if (type) where.type = type;
    if (publishedOnly) where.status = "published";

    const items = await prisma.content.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/content", err);
    return NextResponse.json({ error: "Failed", items: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

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
        protocol: d.protocol || null,
        country: d.country || null,
        network: d.network || null,
        configText: d.configText || null,
        fileUrl: d.fileUrl || null,
        priceMode: d.priceMode || "free",
        priceTzs: d.priceTzs ?? 0,
        createdBy: session.userId,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("POST /api/content", err);
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
