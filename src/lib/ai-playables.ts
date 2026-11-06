import { prisma } from "@/lib/prisma";

export type Playable = {
  id: string;
  title: string;
  type: string;
  category: string | null;
  coverUrl: string | null;
  watchUrl: string;
};

const TYPE_MAP: Record<string, string[]> = {
  movie: ["movie"],
  filamu: ["movie"],
  drama: ["drama"],
  tamthilia: ["drama"],
  tv: ["tv"],
  channel: ["tv"],
  radio: ["radio"],
  music: ["music"],
  miziki: ["music"],
  game: ["game"],
  vpn: ["vpn"],
};

export function detectMediaTypes(message: string): string[] | null {
  const m = message.toLowerCase();
  const found = new Set<string>();
  for (const [k, types] of Object.entries(TYPE_MAP)) {
    if (new RegExp(`\\b${k}\\b`, "i").test(m)) {
      types.forEach((t) => found.add(t));
    }
  }
  if (!found.size) {
    // generic play requests
    if (
      /\b(play|cheza|nipatie|nataka|naomba|stream|watch|tazama|sikiliza)\b/i.test(
        m
      )
    ) {
      return null; // search all media types
    }
    return [];
  }
  return Array.from(found);
}

export function extractMediaQuery(message: string): string | null {
  const m = message.trim();
  if (m.length < 2) return null;

  const patterns = [
    /(?:nipatie|nataka|naomba|tafuta|search|play|cheza|tazama|sikiliza|stream)\s+(?:movie|filamu|radio|tv|channel|miziki|music|tamthilia|drama)?\s*(?:ya|la|za)?\s*(.+)/i,
    /(?:movie|filamu|radio|tv|channel|miziki|music|tamthilia|drama)\s+(?:ya|la|za)?\s*(.+)/i,
    /(?:nitaangalia|nataka\s+kuangalia)\s+(.+)/i,
  ];

  for (const re of patterns) {
    const hit = m.match(re);
    if (hit?.[1]) {
      let q = hit[1]
        .replace(/[?!.]+$/g, "")
        .replace(
          /\b(movie|filamu|radio|tv|channel|miziki|music|tamthilia|drama|please|tafadhali)\b/gi,
          " "
        )
        .replace(/\s+/g, " ")
        .trim();
      if (q.length >= 2 && q.length <= 100) return q;
    }
  }

  // fallback: strip common verbs, use remaining words
  const stripped = m
    .replace(
      /\b(nipatie|nataka|naomba|tafuta|search|play|cheza|tazama|sikiliza|stream|movie|filamu|radio|tv|channel|miziki|music|tamthilia|drama|ya|la|za|please|tafadhali)\b/gi,
      " "
    )
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length >= 2 && stripped.length <= 80) return stripped;
  return null;
}

export async function findPlayables(opts: {
  query: string | null;
  types: string[] | null;
  take?: number;
}): Promise<Playable[]> {
  const take = opts.take ?? 8;
  const q = opts.query?.trim() || "";
  const types = opts.types;

  try {
    const where: Record<string, unknown> = { status: "published" };
    if (types && types.length > 0) {
      where.type = { in: types };
    } else {
      where.type = {
        in: ["movie", "drama", "tv", "radio", "music", "game"],
      };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.content.findMany({
      where: where as never,
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        coverUrl: true,
      },
      orderBy: { createdAt: "desc" },
      take: q ? take : Math.min(take, 6),
    });

    // If typed query found nothing, broaden: type only
    if (!rows.length && q && types && types.length) {
      const fallback = await prisma.content.findMany({
        where: { status: "published", type: { in: types } },
        select: {
          id: true,
          title: true,
          type: true,
          category: true,
          coverUrl: true,
        },
        orderBy: { createdAt: "desc" },
        take,
      });
      return fallback.map(toPlayable);
    }

    return rows.map(toPlayable);
  } catch (e) {
    console.error("findPlayables", e);
    return [];
  }
}

function toPlayable(r: {
  id: string;
  title: string;
  type: string;
  category: string | null;
  coverUrl: string | null;
}): Playable {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    category: r.category,
    coverUrl: r.coverUrl,
    watchUrl: `/watch/${r.id}`,
  };
}

export function playablesBlock(items: Playable[]): string {
  if (!items.length) return "";
  return (
    "\n\n=== PLAYABLES (onyesha kwa mtumiaji, wanaweza kucheza moja kwa moja) ===\n" +
    items
      .map(
        (h, i) =>
          `${i + 1}. **${h.title}** (${h.type}${h.category ? " · " + h.category : ""})\n   PLAY: ${h.watchUrl}`
      )
      .join("\n") +
    "\n=== MWISHO PLAYABLES ===\n" +
    "Eleza kwa ufupi na waambie wabonyeze button ya **Cheza** chini ya ujumbe (si lazima waandike link).\n"
  );
}
