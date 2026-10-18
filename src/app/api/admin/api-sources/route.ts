import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CATEGORIES = ["movie", "tv", "radio", "game", "vpn", "music", "drama"] as const;

/** Public APIs (no key) — media-apis.mjs */
const DEFAULTS: {
  category: (typeof CATEGORIES)[number];
  name: string;
  url: string;
  notes: string;
}[] = [
  {
    category: "movie",
    name: "Internet Archive Movies",
    url: "https://archive.org/advancedsearch.php?q=mediatype:movies&fl[]=identifier&fl[]=title&rows=50&output=json",
    notes: "Public domain movies (Archive.org)",
  },
  {
    category: "tv",
    name: "iptv-org Channels",
    url: "https://iptv-org.github.io/api/channels.json",
    notes: "iptv-org channel list",
  },
  {
    category: "drama",
    name: "TVmaze Drama",
    url: "https://api.tvmaze.com/search/shows?q=drama",
    notes: "TVmaze — cite TVmaze (CC BY-SA)",
  },
  {
    category: "music",
    name: "iTunes Miziki (Bongo/TZ)",
    url: "https://itunes.apple.com/search?term=bongo&media=music&entity=song&country=TZ&limit=50",
    notes: "iTunes Search — 30s previews",
  },
  {
    category: "radio",
    name: "Radio Browser TZ",
    url: "https://de1.api.radio-browser.info/json/stations/search?countrycode=TZ&hidebroken=true&order=clickcount&reverse=true&limit=50",
    notes: "Radio Browser Tanzania",
  },
  {
    category: "game",
    name: "FreeToGame Browser",
    url: "https://www.freetogame.com/api/games?platform=browser&sort-by=popularity",
    notes: "Free browser games",
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
    await prisma.apiSource.upsert({
      where: { category: d.category },
      create: {
        category: d.category,
        name: d.name,
        url: d.url,
        notes: d.notes,
        enabled: true,
      },
      // Always keep official public API URLs in sync (wipe old/empty)
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
