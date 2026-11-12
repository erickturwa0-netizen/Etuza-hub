import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PUBLIC_API } from "@/lib/public-apis";
import { maskApiUrl } from "@/lib/stream-token";
import { ensureUserSchema } from "@/lib/db-migrate";

export const API_CATEGORIES = [
  "movie",
  "drama",
  "tv",
  "radio",
  "music",
  "game",
  "vpn",
  "ai",
  "other",
] as const;

export type ApiCategory = (typeof API_CATEGORIES)[number];

const TMDB_KEY = process.env.TMDB_API_KEY || "";
const ELITEPLEX_MOVIES = "https://eliteplex-api.vercel.app/api/movies";
const ELITEPLEX_SERIES = "https://eliteplex-api.vercel.app/api/series";
const MODOBO_TV = "https://cdn.apisfast.top/api/v1/channels";
const TMDB_POPULAR = TMDB_KEY
  ? `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`
  : "";

const DEFAULTS: {
  category: ApiCategory;
  name: string;
  url: string;
  notes: string;
}[] = [
  {
    category: "movie",
    name: "TMDB + ElitePlex Movies",
    url: TMDB_POPULAR || ELITEPLEX_MOVIES,
    notes: "tmdb+eliteplex-v2",
  },
  {
    category: "drama",
    name: "ElitePlex Series + Anime",
    url: ELITEPLEX_SERIES,
    notes: "eliteplex-drama-v1",
  },
  {
    category: "tv",
    name: "Modobo TV + IPTV",
    url: MODOBO_TV,
    notes: "modobo+iptv",
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
    category: "game",
    name: "Games",
    url: PUBLIC_API.game?.url || "",
    notes: "FreeToGame / Manual",
  },
  {
    category: "vpn",
    name: "VPN",
    url: "",
    notes: "Manual only",
  },
  {
    category: "ai",
    name: "Omegatech AI tools",
    url: "https://api.omegatech.app",
    notes: "Horde / Nicevoice / Sonu3 base",
  },
];

async function ensureDefaults() {
  await ensureUserSchema();
  for (const d of DEFAULTS) {
    const byCat = await prisma.apiSource.findFirst({
      where: { category: d.category },
    });
    if (!byCat) {
      await prisma.apiSource.create({
        data: {
          category: d.category,
          name: d.name,
          url: d.url,
          enabled: true,
          notes: d.notes,
        },
      });
    }
  }
}

function maskRow(s: {
  id: string;
  category: string;
  name: string;
  url: string;
  enabled: boolean;
  notes: string | null;
}) {
  return {
    id: s.id,
    category: s.category,
    name: s.name,
    url: maskApiUrl(s.url),
    urlSet: Boolean(s.url && s.url.length > 4),
    enabled: s.enabled,
    notes: s.notes
      ? String(s.notes).replace(/https?:\/\/[^\s|]+/gi, "***")
      : s.notes,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureDefaults();
    const sources = await prisma.apiSource.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      sources: sources.map(maskRow),
      categories: API_CATEGORIES,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed", sources: [] }, { status: 500 });
  }
}

const itemSchema = z.object({
  id: z.string().optional(),
  category: z.enum(API_CATEGORIES),
  name: z.string().min(1).max(120),
  url: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureUserSchema();
    const body = await req.json();
    const list = Array.isArray(body.sources) ? body.sources : [body];
    const updated = [];
    for (const raw of list) {
      const parsed = itemSchema.safeParse(raw);
      if (!parsed.success) continue;
      const d = parsed.data;
      let url = d.url;
      if (url && (url.includes("***(encrypted)") || url.includes("***"))) {
        url = undefined;
      }
      if (d.id) {
        const row = await prisma.apiSource.update({
          where: { id: d.id },
          data: {
            category: d.category,
            name: d.name,
            ...(url !== undefined ? { url } : {}),
            ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
            ...(d.notes !== undefined ? { notes: d.notes } : {}),
          },
        });
        updated.push(maskRow(row));
      } else {
        const row = await prisma.apiSource.create({
          data: {
            category: d.category,
            name: d.name,
            url: url || "",
            enabled: d.enabled ?? true,
            notes: d.notes || null,
          },
        });
        updated.push(maskRow(row));
      }
    }
    return NextResponse.json({ sources: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return PUT(req);
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.apiSource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
