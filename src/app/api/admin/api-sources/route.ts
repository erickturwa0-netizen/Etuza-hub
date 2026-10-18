import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CATEGORIES = ["movie", "tv", "radio", "game", "vpn", "music", "drama"] as const;

const DEFAULTS: {
  category: (typeof CATEGORIES)[number];
  name: string;
  url: string;
  notes: string;
}[] = [
  { category: "movie", name: "Movies public API", url: "", notes: "JSON public API bila key" },
  { category: "tv", name: "TV public API", url: "", notes: "TV channels API" },
  { category: "drama", name: "Tamthilia public API", url: "", notes: "Drama / series catalog" },
  { category: "music", name: "Miziki public API", url: "", notes: "Music tracks / albums API" },
  { category: "radio", name: "Radio public API", url: "", notes: "Radio stations API" },
  { category: "game", name: "Games public API", url: "", notes: "" },
  { category: "vpn", name: "VPN public API", url: "", notes: "" },
];

/** Categories whose stored URL should be wiped once (old defaults) */
const CLEAR_URL_CATEGORIES = new Set(["movie", "radio"]);

async function ensureDefaults() {
  for (const d of DEFAULTS) {
    const existing = await prisma.apiSource.findUnique({
      where: { category: d.category },
    });

    if (!existing) {
      await prisma.apiSource.create({
        data: {
          category: d.category,
          name: d.name,
          url: d.url,
          notes: d.notes,
          enabled: true,
        },
      });
      continue;
    }

    // One-time clear of old movie/radio API URLs so admin can paste new ones
    if (
      CLEAR_URL_CATEGORIES.has(d.category) &&
      existing.url &&
      (existing.url.includes("radio-browser.info") ||
        existing.url.includes("api.themoviedb.org") ||
        existing.notes?.includes("Radio Browser"))
    ) {
      await prisma.apiSource.update({
        where: { category: d.category },
        data: { url: "", notes: d.notes },
      });
    }
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureDefaults();
    const sources = await prisma.apiSource.findMany({ orderBy: { category: "asc" } });
    return NextResponse.json({ sources });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed", sources: [] }, { status: 500 });
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
