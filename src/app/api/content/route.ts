import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["movie", "game", "vpn"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  linkUrl: z.string().min(1),
  linkType: z.enum(["stream", "download"]).default("stream"),
  category: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  protocol: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  network: z.string().optional().nullable(),
  configText: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const publishedOnly = searchParams.get("published") === "1";

    const where: Record<string, string> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (publishedOnly) where.status = "published";

    const items = await prisma.content.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const item = await prisma.content.create({
      data: {
        type: d.type,
        title: d.title,
        description: d.description || null,
        coverUrl: d.coverUrl || null,
        linkUrl: d.linkUrl,
        linkType: d.linkType,
        category: d.category || null,
        status: d.status,
        protocol: d.protocol || null,
        country: d.country || null,
        network: d.network || null,
        configText: d.configText || null,
        fileUrl: d.fileUrl || null,
        createdBy: session.userId,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}
