import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CATEGORIES = ["movie", "tv", "radio", "game", "vpn"] as const;

const DEFAULTS: {
  category: (typeof CATEGORIES)[number];
  name: string;
  url: string;
  notes: string;
}[] = [
  {
    category: "movie",
    name: "Movies public API",
    url: "",
    notes: "JSON public API bila API key. Lazima irudishe list ya movies.",
  },
  {
    category: "tv",
    name: "TV public API",
    url: "",
    notes: "Public API ya TV channels (JSON).",
  },
  {
    category: "radio",
    name: "Radio public API",
    url: "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/TZ?hidebroken=true&limit=50",
    notes: "Radio Browser – Tanzania (bila key).",
  },
  {
    category: "game",
    name: "Games public API",
    url: "",
    notes: "Optional public games catalog API.",
  },
  {
    category: "vpn",
    name: "VPN public API",
    url: "",
    notes: "Optional public VPN list API.",
  },
];

async function ensureDefaults() {
  for (const d of DEFAULTS) {
    await prisma.apiSource.upsert({
      where: { category: d.category },
      create: {
        category: d.category,
        name: d.name,
        url: d.url,
        notes: d.notes,
        enabled: true,
      },
      update: {},
    });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDefaults();
    const sources = await prisma.apiSource.findMany({
      orderBy: { category: "asc" },
    });
    return NextResponse.json({ sources });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json(
      {
        error:
          message.includes("ApiSource") || message.includes("does not exist")
            ? "Jedwali ApiSource halipo – approve Prisma schema"
            : message,
        sources: [],
      },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().optional(),
  url: z.string().optional(),
  enabled: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // allow batch: { sources: [...] } or single
    const list = Array.isArray(body.sources) ? body.sources : [body];

    const updated = [];
    for (const raw of list) {
      const parsed = patchSchema.safeParse(raw);
      if (!parsed.success) continue;
      const d = parsed.data;
      const row = await prisma.apiSource.upsert({
        where: { category: d.category },
        create: {
          category: d.category,
          name: d.name || d.category,
          url: d.url || "",
          enabled: d.enabled ?? true,
          notes: d.notes || null,
        },
        update: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.url !== undefined ? { url: d.url } : {}),
          ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
          ...(d.notes !== undefined ? { notes: d.notes } : {}),
        },
      });
      updated.push(row);
    }

    return NextResponse.json({ sources: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
