import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PUBLIC_API } from "@/lib/public-apis";

const CATEGORIES = ["movie", "tv", "radio", "game", "vpn", "music", "drama"] as const;
const MOVIE_CLEAR_TAG = "movies-wiped-awaiting-new-api";

const DEFAULTS: {
  category: (typeof CATEGORIES)[number];
  name: string;
  url: string;
  notes: string;
}[] = [
  {
    category: "movie",
    name: "Movies API",
    url: "",
    notes: MOVIE_CLEAR_TAG,
  },
  {
    category: "music",
    name: "iTunes Miziki (Bongo/TZ)",
    url: PUBLIC_API.music?.url || "",
    notes: "iTunes Search TZ",
  },
  {
    category: "radio",
    name: "Radio Browser TZ",
    url: PUBLIC_API.radio?.url || "",
    notes: "Radio Browser Tanzania",
  },
  {
    category: "drama",
    name: "TVmaze",
    url: PUBLIC_API.drama?.url || "",
    notes: "TVmaze",
  },
  {
    category: "game",
    name: "Games",
    url: "",
    notes: "Manual / resolve downloads",
  },
  {
    category: "tv",
    name: "iptv-org",
    url: "https://iptv-org.github.io/api/channels.json",
    notes: "iptv-org",
  },
  {
    category: "vpn",
    name: "VPN",
    url: "",
    notes: "Manual only",
  },
];

async function ensureDefaults() {
  for (const d of DEFAULTS) {
    if (d.category === "movie") {
      const existing = await prisma.apiSource.findUnique({
        where: { category: "movie" },
      });

      // One-time wipe of old Archive.org movies
      if (!existing || existing.notes !== MOVIE_CLEAR_TAG) {
        await prisma.content.deleteMany({ where: { type: "movie" } });
        await prisma.apiSource.upsert({
          where: { category: "movie" },
          create: {
            category: "movie",
            name: d.name,
            url: "",
            notes: MOVIE_CLEAR_TAG,
            enabled: true,
          },
          update: {
            name: d.name,
            url: "",
            notes: MOVIE_CLEAR_TAG,
            enabled: true,
          },
        });
      }
      continue;
    }

    await prisma.apiSource.upsert({
      where: { category: d.category },
      create: {
        category: d.category,
        name: d.name,
        url: d.url,
        notes: d.notes,
        enabled: true,
      },
      update: {
        name: d.name,
        url: d.url,
        notes: d.notes,
        enabled: true,
      },
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
