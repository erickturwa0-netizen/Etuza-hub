/** Public APIs used to auto-fill catalog when DB is empty */

// TMDB key from Movian Media Center APK (fallback)
const TMDB_KEY =
  process.env.TMDB_API_KEY || "a0d71cffe2d6693d462af9e4f336bc06";

export const PUBLIC_API: Record<
  string,
  { url: string; linkType: "stream" | "download"; notes?: string }
> = {
  movie: {
    url: `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`,
    linkType: "stream",
    notes: "TMDB Popular (Movian key)",
  },
  // TV — Modobo (from Modobo_TV APK sniff)
  tv: {
    url: "https://cdn.apisfast.top/api/v1/channels",
    linkType: "stream",
    notes: "Modobo TV channels (cdn.apisfast.top)",
  },
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

export const EXTRA_APIS = {
  movie: {
    tmdbPopular: `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}`,
    tmdbTopRated: `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}`,
    tmdbTrending: `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`,
    tmdbSearch: `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}`,
    eliteplex: "https://eliteplex-api.vercel.app/api/movies",
  },
  tv: {
    modoboChannels: "https://cdn.apisfast.top/api/v1/channels",
    modoboCategories: "https://cdn.apisfast.top/api/v1/categories",
    easyapiBase: "https://easyapi.sh/live-tv/api/v1",
    channelVisibility: "https://easyapi.sh/live-tv/api/v1/channel-visibility",
    providerSettings: "https://easyapi.sh/live-tv/api/v1/provider-settings",
    proxyJson: "https://easyapi.sh/proxy.json",
    sportsEvents: "https://popflix.dev/live-tv/api/v1/sports/events",
    iptvOrg: "https://iptv-org.github.io/iptv/index.m3u",
  },
  drama: {
    eliteplex: "https://eliteplex-api.vercel.app/api/series",
    tvmaze: "https://api.tvmaze.com/search/shows?q=drama",
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
  // TMDB movie list
  if (
    type === "movie" &&
    data &&
    typeof data === "object" &&
    Array.isArray((data as { results?: unknown[] }).results)
  ) {
    return ((data as { results: Record<string, unknown>[] }).results || []).map(
      (m) => {
        const id = String(m.id || "");
        const poster = m.poster_path
          ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : null;
        return {
          title: String(m.title || m.name || "Untitled"),
          linkUrl: id ? `https://player.videasy.to/movie/${id}` : "",
          coverUrl: poster,
          category: m.release_date
            ? `Movie · ${String(m.release_date).slice(0, 4)}`
            : "Movie",
          description: m.overview
            ? String(m.overview).slice(0, 400)
            : null,
        };
      }
    );
  }

  // Modobo channels list
  if (
    type === "tv" &&
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown[] }).data)
  ) {
    return ((data as { data: Record<string, unknown>[] }).data || [])
      .filter((c) => c.free === 1 && c.has_source)
      .slice(0, 80)
      .map((c) => ({
        title: String(c.title || "Channel"),
        linkUrl: "",
        coverUrl: (c.logo as string) || null,
        category: String(
          c.category_name ||
            (Array.isArray(c.category_names) && c.category_names[0]) ||
            "TV"
        ),
        description: null,
      }));
  }

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
  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "show" in (data[0] as object)
  ) {
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
  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    "game_url" in (data[0] as object)
  ) {
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
      .filter((i) => i.title && (i.linkUrl || type === "tv"))
      .slice(0, 40);
  } catch (e) {
    console.error("fetchPublicSeed", type, e);
    return [];
  }
}
