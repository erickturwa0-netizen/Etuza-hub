import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PUBLIC_API, EXTRA_APIS } from "@/lib/public-apis";
import { maskApiUrl } from "@/lib/stream-token";
import {
  importElitePlexMovies,
  importElitePlexDrama,
} from "@/lib/eliteplex";

const CATEGORIES = ["movie", "tv", "radio", "game", "vpn", "music", "drama"] as const;

const TMDB_KEY = process.env.TMDB_API_KEY || "";

const ELITEPLEX_MOVIES = "https://eliteplex-api.vercel.app/api/movies";
const ELITEPLEX_SERIES = "https://eliteplex-api.vercel.app/api/series";
const IPTV_M3U = "https://iptv-org.github.io/iptv/index.m3u";
const MODOBO_TV = "https://cdn.apisfast.top/api/v1/channels";
const EASYAPI_TV = "https://easyapi.sh/live-tv/api/v1/channel-visibility";
const TMDB_POPULAR = TMDB_KEY
  ? `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`
  : "";

const MOVIE_API_TAG = "tmdb+eliteplex-v2";
const DRAMA_API_TAG = "eliteplex-drama-v1";
const TV_API_TAG = "modobo+easyapi+iptv-v2";

const DEFAULTS: {
  category: (typeof CATEGORIES)[number];
  name: string;
  url: string;
  notes: string;
}[] = [
  {
    category: "movie",
    name: "TMDB + ElitePlex Movies",
    url: TMDB_POPULAR || ELITEPLEX_MOVIES,
    notes: MOVIE_API_TAG,
  },
  {
    category: "drama",
    name: "ElitePlex Series + Anime",
    url: ELITEPLEX_SERIES,
    notes: DRAMA_API_TAG,
  },
  {
    category: "tv",
    name: "Modobo TV + EasyAPI + IPTV",
    url: MODOBO_TV,
    notes: TV_API_TAG,
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
];

async function ensureDefaults() {
  for (const d of DEFAULTS) {
    if (d.category === "movie") {
      const existing = await prisma.apiSource.findUnique({
        where: { category: "movie" },
      });
      await prisma.apiSource.upsert({
        where: { category: "movie" },
        create: {
          category: "movie",
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
      if (!existing || existing.notes !== MOVIE_API_TAG) {
        try {
          const count = await importElitePlexMovies();
          console.log("ElitePlex movies imported:", count);
        } catch (e) {
          console.error("ElitePlex movie import", e);
        }
      }
      continue;
    }

    if (d.category === "drama") {
      await prisma.apiSource.upsert({
        where: { category: "drama" },
        create: {
          category: "drama",
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
        ...(d.url ? { url: d.url } : {}),
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
    const sources = await prisma.apiSource.findMany({
      orderBy: { category: "asc" },
    });
    const masked = sources.map((s) => ({
      ...s,
      url: maskApiUrl(s.url),
      notes: s.notes
        ? String(s.notes).replace(/https?:\/\/[^\s|]+/gi, "***")
        : s.notes,
    }));
    return NextResponse.json({
      sources: masked,
      extra: {},
    });
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
      // Never overwrite real URL with masked placeholder from client
      if (d.url && (d.url.includes("***(encrypted)") || d.url.includes("***"))) {
        delete (d as { url?: string }).url;
      }
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
      updated.push({
        ...row,
        url: maskApiUrl(row.url),
      });
    }
    return NextResponse.json({ sources: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
