/** Public APIs used to auto-fill catalog when DB is empty */

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
  tv: {
    url: "https://cdn.apisfast.top/api/v1/channels",
    linkType: "stream",
    notes: "Modobo TV channels (cdn.apisfast.top)",
  },
  music: {
    url: "https://itunes.apple.com/search?term=bongo+flava&media=music&entity=song&country=TZ&limit=50",
    linkType: "stream",
    notes: "iTunes + ytm videos + freetouse",
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

/** iTunes queries: Bongo, Dini, 2026 */
export const MUSIC_ITUNES_QUERIES: {
  term: string;
  category: string;
  country?: string;
}[] = [
  { term: "bongo flava", category: "Bongo", country: "TZ" },
  { term: "bongo flava 2026", category: "Bongo · 2026", country: "TZ" },
  { term: "Diamond Platnumz", category: "Bongo", country: "TZ" },
  { term: "Harmonize", category: "Bongo", country: "TZ" },
  { term: "Wasafi", category: "Bongo", country: "TZ" },
  { term: "Ali Kiba", category: "Bongo", country: "TZ" },
  { term: "Rayvanny", category: "Bongo", country: "TZ" },
  { term: "Jux Tanzania", category: "Bongo", country: "TZ" },
  { term: "gospel tanzania", category: "Dini", country: "TZ" },
  { term: "injili", category: "Dini", country: "TZ" },
  { term: "yesu swahili", category: "Dini" },
  { term: "christian worship swahili", category: "Dini" },
  { term: "gospel music africa", category: "Dini" },
  { term: "afrobeats 2026", category: "Afrobeats · 2026" },
  { term: "amapiano 2026", category: "Amapiano · 2026" },
  { term: "bongo 2025", category: "Bongo", country: "TZ" },
  { term: "singeli", category: "Bongo", country: "TZ" },
];

/** YouTube Music proxy — video search (ytm.vrma.dev) */
export const MUSIC_VIDEO_QUERIES: { q: string; category: string }[] = [
  { q: "Diamond Platnumz", category: "Video · Bongo" },
  { q: "Harmonize official", category: "Video · Bongo" },
  { q: "Rayvanny official video", category: "Video · Bongo" },
  { q: "Zuchu official", category: "Video · Bongo" },
  { q: "bongo flava 2026", category: "Video · 2026" },
  { q: "gospel tanzania official", category: "Video · Dini" },
  { q: "swahili gospel music video", category: "Video · Dini" },
  { q: "singeli official video", category: "Video · Bongo" },
  { q: "Wasafi music video", category: "Video · Bongo" },
  { q: "Ali Kiba official", category: "Video · Bongo" },
];

/** FreeToUse full MP3 tracks */
export const FREETOUSE_QUERIES = [
  "afrobeat",
  "africa",
  "reggae",
  "gospel",
  "world",
  "dance",
  "hip hop",
];

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
  music: {
    itunesSearch: "https://itunes.apple.com/search",
    ytmVideos: "https://ytm.vrma.dev/search",
    freetouse: "https://api.freetouse.com/v3/music/tracks/search",
  },
};

export type SeedItem = {
  title: string;
  linkUrl: string;
  coverUrl: string | null;
  category: string | null;
  description: string | null;
};

function mapItunesResults(
  results: Record<string, unknown>[],
  forcedCategory?: string
): SeedItem[] {
  return results.map((m) => {
    const art = String(m.artworkUrl100 || "");
    const year = String(m.releaseDate || "").slice(0, 4);
    const genre = String(m.primaryGenreName || "");
    let category = forcedCategory || genre || "Music";
    const blob = `${m.trackName || ""} ${m.artistName || ""} ${genre}`.toLowerCase();
    if (
      /gospel|worship|christian|injili|yesu|praise|choir|religious|dini/.test(
        blob
      )
    ) {
      category = forcedCategory?.includes("Dini") ? forcedCategory : "Dini";
    }
    if (year === "2026" && !category.includes("2026")) {
      category = `${category} · 2026`;
    }
    return {
      title: String(m.trackName || m.collectionName || "Untitled"),
      linkUrl: String(m.previewUrl || m.trackViewUrl || ""),
      coverUrl: art ? art.replace("100x100", "600x600") : null,
      category,
      description: m.artistName
        ? `${m.artistName}${year ? ` · ${year}` : ""}`
        : null,
    };
  });
}

async function fetchYtmVideos(): Promise<SeedItem[]> {
  const out: SeedItem[] = [];
  const seen = new Set<string>();

  await Promise.all(
    MUSIC_VIDEO_QUERIES.map(async ({ q, category }) => {
      try {
        const url = `https://ytm.vrma.dev/search?q=${encodeURIComponent(q)}&type=videos`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "ETUZA-HUB/1.0",
          },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return;
        const data = await res.json();
        const results = (data?.results || []) as {
          videoId?: string;
          title?: string;
          channel?: string;
          views?: string;
          duration?: string;
          thumbnails?: { url?: string }[];
        }[];
        for (const v of results) {
          if (!v.videoId || !v.title) continue;
          if (seen.has(v.videoId)) continue;
          seen.add(v.videoId);
          const thumb =
            v.thumbnails?.[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
          out.push({
            title: v.title.slice(0, 200),
            linkUrl: `https://www.youtube-nocookie.com/embed/${v.videoId}`,
            coverUrl: thumb,
            category,
            description: [v.channel, v.views, v.duration]
              .filter(Boolean)
              .join(" · "),
          });
        }
      } catch (e) {
        console.error("fetchYtmVideos", q, e);
      }
    })
  );

  return out;
}

async function fetchFreetouseTracks(): Promise<SeedItem[]> {
  const out: SeedItem[] = [];
  const seen = new Set<string>();

  await Promise.all(
    FREETOUSE_QUERIES.map(async (query) => {
      try {
        const url = `https://api.freetouse.com/v3/music/tracks/search?query=${encodeURIComponent(query)}&limit=30`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "ETUZA-HUB/1.0",
          },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = (data?.data || []) as {
          id?: string;
          title?: string;
          genre?: string;
          files?: { mp3?: string };
          thumbnails?: { lg?: string; md?: string; xl?: string };
          artists?: unknown;
        }[];
        for (const t of items) {
          const mp3 = t.files?.mp3;
          if (!mp3 || !t.title) continue;
          const key = (t.id || mp3).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          let artist = "";
          try {
            const a = t.artists;
            if (Array.isArray(a) && a[0]) {
              const first = a[0];
              if (Array.isArray(first) && first[1] && typeof first[1] === "object") {
                artist = String((first[1] as { name?: string }).name || "");
              }
            }
          } catch {
            /* ignore */
          }

          out.push({
            title: t.title.slice(0, 200),
            linkUrl: mp3,
            coverUrl: t.thumbnails?.lg || t.thumbnails?.md || t.thumbnails?.xl || null,
            category: t.genre ? `Free · ${t.genre}` : "Free Music",
            description: artist || null,
          });
        }
      } catch (e) {
        console.error("fetchFreetouseTracks", query, e);
      }
    })
  );

  return out;
}

/** Fetch many music tracks: iTunes + YTM videos + FreeToUse MP3 */
export async function fetchMusicCatalog(): Promise<SeedItem[]> {
  const collected: SeedItem[] = [];
  const seen = new Set<string>();

  const push = (item: SeedItem) => {
    if (!item.linkUrl || !item.title) return;
    const key = item.linkUrl.split("?")[0].toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(item);
  };

  // 1) iTunes previews
  await Promise.all(
    MUSIC_ITUNES_QUERIES.map(async (q) => {
      try {
        const params = new URLSearchParams({
          term: q.term,
          media: "music",
          entity: "song",
          limit: "50",
        });
        if (q.country) params.set("country", q.country);
        const url = `https://itunes.apple.com/search?${params}`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "ETUZA-HUB/1.0",
          },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return;
        const data = await res.json();
        const results = (data?.results || []) as Record<string, unknown>[];
        for (const item of mapItunesResults(results, q.category)) push(item);
      } catch (e) {
        console.error("fetchMusicCatalog itunes", q.term, e);
      }
    })
  );

  // 2) Video Music (ytm.vrma.dev)
  try {
    const videos = await fetchYtmVideos();
    for (const v of videos) push(v);
  } catch (e) {
    console.error("fetchMusicCatalog ytm", e);
  }

  // 3) FreeToUse full MP3
  try {
    const free = await fetchFreetouseTracks();
    for (const t of free) push(t);
  } catch (e) {
    console.error("fetchMusicCatalog freetouse", e);
  }

  return collected;
}

export function normalizePublicApi(data: unknown, type: string): SeedItem[] {
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

  if (
    type === "tv" &&
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown[] }).data)
  ) {
    return ((data as { data: Record<string, unknown>[] }).data || [])
      .filter((c) => c.free === 1 && c.has_source)
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

  const results = (data as { results?: Record<string, unknown>[] })?.results;
  if (Array.isArray(results) && results[0] && "trackId" in results[0]) {
    return mapItunesResults(results);
  }

  // ytm.vrma.dev video results
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { results?: unknown[] }).results) &&
    (data as { results: { videoId?: string }[] }).results[0]?.videoId
  ) {
    return ((data as { results: {
      videoId: string;
      title?: string;
      channel?: string;
      views?: string;
      duration?: string;
      thumbnails?: { url?: string }[];
    }[] }).results).map((v) => ({
      title: String(v.title || "Video"),
      linkUrl: `https://www.youtube-nocookie.com/embed/${v.videoId}`,
      coverUrl:
        v.thumbnails?.[0]?.url ||
        `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      category: "Video Music",
      description: [v.channel, v.views, v.duration].filter(Boolean).join(" · "),
    }));
  }

  // freetouse tracks
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown[] }).data) &&
    (data as { data: { files?: { mp3?: string } }[] }).data[0]?.files?.mp3
  ) {
    return ((data as { data: {
      title?: string;
      genre?: string;
      files?: { mp3?: string };
      thumbnails?: { lg?: string; md?: string };
    }[] }).data)
      .filter((t) => t.files?.mp3 && t.title)
      .map((t) => ({
        title: String(t.title),
        linkUrl: String(t.files!.mp3),
        coverUrl: t.thumbnails?.lg || t.thumbnails?.md || null,
        category: t.genre ? `Free · ${t.genre}` : "Free Music",
        description: null,
      }));
  }

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
    return (data as Record<string, unknown>[]).map((row, i) => ({
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
  if (type === "music") {
    return fetchMusicCatalog();
  }

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
    return normalizePublicApi(data, type).filter(
      (i) => i.title && (i.linkUrl || type === "tv")
    );
  } catch (e) {
    console.error("fetchPublicSeed", type, e);
    return [];
  }
}
