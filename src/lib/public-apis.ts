/** Public APIs (no key) used to auto-fill catalog when DB is empty */

export const PUBLIC_API: Record<
  string,
  { url: string; linkType: "stream" | "download" }
> = {
  // movie: removed — admin will supply a new API
  music: {
    url: "https://itunes.apple.com/search?term=bongo&media=music&entity=song&country=TZ&limit=40",
    linkType: "stream",
  },
  radio: {
    url: "https://de1.api.radio-browser.info/json/stations/search?countrycode=TZ&hidebroken=true&order=clickcount&reverse=true&limit=40",
    linkType: "stream",
  },
  drama: {
    url: "https://api.tvmaze.com/search/shows?q=drama",
    linkType: "stream",
  },
  game: {
    url: "https://www.freetogame.com/api/games?platform=browser&sort-by=popularity",
    linkType: "download",
  },
};

export type SeedItem = {
  title: string;
  linkUrl: string;
  coverUrl: string | null;
  category: string | null;
  description: string | null;
};

export function normalizePublicApi(data: unknown, type: string): SeedItem[] {
  // Radio Browser
  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "stationuuid" in (data[0] as object)
  ) {
    return (data as {
      name: string;
      url_resolved?: string;
      url?: string;
      favicon?: string;
      tags?: string;
    }[]).map((s) => ({
      title: (s.name || "").trim() || "Radio",
      linkUrl: s.url_resolved || s.url || "",
      coverUrl: s.favicon || null,
      category: s.tags || type,
      description: null,
    }));
  }

  // Archive.org (kept for optional future use)
  const docs = (data as { response?: { docs?: unknown[] } })?.response?.docs;
  if (Array.isArray(docs)) {
    return (docs as { identifier?: string; title?: string }[]).map((d) => {
      const id = d.identifier || "";
      return {
        title: String(d.title || id),
        linkUrl: id ? `https://archive.org/embed/${id}` : "",
        coverUrl: id ? `https://archive.org/services/img/${id}` : null,
        category: type,
        description: null,
      };
    });
  }

  // iTunes
  const results = (data as { results?: Record<string, unknown>[] })?.results;
  if (Array.isArray(results) && results[0] && "trackId" in results[0]) {
    return results.map((m) => {
      const art = String(m.artworkUrl100 || "");
      return {
        title: String(m.trackName || m.collectionName || "Untitled"),
        linkUrl: String(m.previewUrl || m.trackViewUrl || ""),
        coverUrl: art ? art.replace("100x100", "600x600") : null,
        category: String(m.primaryGenreName || type),
        description: null,
      };
    });
  }

  // TVmaze
  if (Array.isArray(data) && data[0] && typeof data[0] === "object" && "show" in (data[0] as object)) {
    return (data as {
      show: {
        id: number;
        name: string;
        genres?: string[];
        image?: { medium?: string } | null;
        summary?: string | null;
        url?: string;
      };
    }[]).map(({ show }) => ({
      title: show.name,
      linkUrl: show.url || `https://www.tvmaze.com/shows/${show.id}`,
      coverUrl: show.image?.medium || null,
      category: (show.genres || []).join(", ") || type,
      description: show.summary
        ? show.summary.replace(/<[^>]+>/g, "").slice(0, 400)
        : null,
    }));
  }

  // FreeToGame
  if (Array.isArray(data) && data[0] && typeof data[0] === "object" && "game_url" in (data[0] as object)) {
    return (data as {
      title: string;
      thumbnail?: string;
      short_description?: string;
      genre?: string;
      game_url: string;
    }[]).map((g) => ({
      title: g.title,
      linkUrl: g.game_url,
      coverUrl: g.thumbnail || null,
      category: g.genre || type,
      description: g.short_description || null,
    }));
  }

  // Generic array of objects with title + url
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).slice(0, 50).map((row, i) => ({
      title: String(row.title || row.name || `Item ${i + 1}`),
      linkUrl: String(
        row.linkUrl ||
          row.url ||
          row.stream ||
          row.stream_url ||
          row.embed ||
          row.previewUrl ||
          ""
      ),
      coverUrl: (row.coverUrl ||
        row.poster ||
        row.poster_path ||
        row.thumbnail ||
        row.image ||
        null) as string | null,
      category: String(row.category || row.genre || type),
      description: (row.overview || row.description || null) as string | null,
    }));
  }

  return [];
}

export async function fetchPublicSeed(type: string): Promise<SeedItem[]> {
  const cfg = PUBLIC_API[type];
  if (!cfg?.url) return [];
  try {
    const res = await fetch(cfg.url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return normalizePublicApi(data, type)
      .filter((i) => i.title && i.linkUrl)
      .slice(0, 40);
  } catch (e) {
    console.error("fetchPublicSeed", type, e);
    return [];
  }
}
