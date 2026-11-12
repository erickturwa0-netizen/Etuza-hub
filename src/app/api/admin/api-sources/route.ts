import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PUBLIC_API } from "@/lib/public-apis";
import { maskApiUrl } from "@/lib/stream-token";
import { ensureUserSchema } from "@/lib/db-migrate";
import {
  detectApiCategoryFromUrl,
  refineCategoryFromPayload,
  suggestNameFromUrl,
} from "@/lib/detect-api-type";
import { importFromApiSource } from "@/lib/import-source";

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
const IPTV_M3U = "https://iptv-org.github.io/iptv/index.m3u";
const MODOBO_TV = "https://cdn.apisfast.top/api/v1/channels";
const EASYAPI_TV = "https://easyapi.sh/live-tv/api/v1/channel-visibility";
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
    name: "Movies (Omegatech + vidsrc)",
    url: "https://api.omegatech.app/api/movie/MovieBox-pro?action=trending",
    notes: "omegatech-moviebox-v1",
  },
  {
    category: "drama",
    name: "Series / Tamthilia",
    url: ELITEPLEX_SERIES,
    notes: "eliteplex-drama-v1",
  },
  {
    category: "tv",
    name: "Modobo TV + EasyAPI + IPTV",
    url: MODOBO_TV,
    notes: `modobo+easyapi+iptv | ${EASYAPI_TV} | ${IPTV_M3U}`,
  },
  {
    category: "music",
    name: "iTunes Miziki (Bongo/TZ)",
    url:
      PUBLIC_API.music?.url ||
      "https://itunes.apple.com/search?term=bongo+flava&media=music&entity=song&country=TZ&limit=50",
    notes: "iTunes Search TZ",
  },
  {
    category: "radio",
    name: "Radio Browser TZ",
    url:
      PUBLIC_API.radio?.url ||
      "https://de1.api.radio-browser.info/json/stations/search?countrycode=TZ&hidebroken=true&order=clickcount&reverse=true&limit=40",
    notes: "Radio Browser Tanzania",
  },
  {
    category: "game",
    name: "FreeToGame Browser",
    url: PUBLIC_API.game?.url || "https://www.freetogame.com/api/games?platform=browser&sort-by=popularity",
    notes: "FreeToGame",
  },
  {
    category: "vpn",
    name: "VPN",
    url: "",
    notes: "Manual only",
  },
];

async function ensureDefaults() {
  await ensureUserSchema();
  for (const d of DEFAULTS) {
    const rows = await prisma.apiSource.findMany({ where: { category: d.category } });
    if (rows.length === 0) {
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
      ? String(s.notes).length > 80
        ? String(s.notes).slice(0, 4000)
        : String(s.notes).replace(/https?:\/\/[^\s|]+/gi, "***")
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
  category: z.enum(API_CATEGORIES).optional(),
  name: z.string().max(120).optional(),
  url: z.string().max(4000).optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(20000).optional().nullable(),
  autoDetect: z.boolean().optional(),
});

function isMaskedUrl(url?: string) {
  if (!url) return true;
  return url.includes("***(encrypted)") || url.includes("***");
}

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
      const url = isMaskedUrl(d.url) ? undefined : d.url;

      let category = d.category;
      let name = d.name?.trim();
      if (url && (!category || d.autoDetect !== false)) {
        const det = detectApiCategoryFromUrl(url);
        if (!category) category = det.category;
      }
      if (d.notes && (!category || category === "other")) {
        try {
          const j = JSON.parse(
            d.notes.replace(/^Status:\s*\d+\s*/i, "").trim()
          );
          category = refineCategoryFromPayload(j, category || "other");
        } catch {
          if (/taskId|horde|kudos|sonu|mureka|wrmgpt/i.test(d.notes || "")) {
            category = "ai";
          }
        }
      }
      if (!category) category = "other";
      if (!name && url) name = suggestNameFromUrl(url, category);
      if (!name) name = category;

      if (d.id) {
        const row = await prisma.apiSource.update({
          where: { id: d.id },
          data: {
            category,
            name,
            ...(url !== undefined ? { url } : {}),
            ...(d.enabled !== undefined ? { enabled: d.enabled } : {}),
            ...(d.notes !== undefined ? { notes: d.notes } : {}),
          },
        });
        updated.push(maskRow(row));
      } else {
        if (!url) continue;
        const row = await prisma.apiSource.create({
          data: {
            category,
            name,
            url,
            enabled: d.enabled ?? true,
            notes: d.notes || null,
          },
        });
        let importNote = "";
        if (category !== "ai") {
          try {
            const imp = await importFromApiSource({
              url,
              category,
              notes: d.notes,
            });
            importNote = imp.imported
              ? `imported:${imp.imported}`
              : imp.error
                ? `err:${imp.error}`
                : "imported:0";
          } catch (e) {
            console.error("importFromApiSource", e);
          }
        }
        updated.push({
          ...maskRow(row),
          notes: [row.notes, importNote].filter(Boolean).join(" | ").slice(0, 500),
        });
      }
    }
    await ensureDefaults();
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
