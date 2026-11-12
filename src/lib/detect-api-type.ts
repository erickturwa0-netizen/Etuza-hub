/**
 * Auto-detect API source type from URL (and optional response shape).
 * Admin only pastes URL — category is inferred so data routes to the right place.
 */
export type DetectedApiCategory =
  | "movie"
  | "drama"
  | "tv"
  | "radio"
  | "music"
  | "game"
  | "vpn"
  | "ai"
  | "other";

const RULES: { re: RegExp; category: DetectedApiCategory; label: string }[] = [
  {
    re: /\/ai\/|freeimage|horde|nicevoice|sonu|wrmgpt|wormgpt|wan-fast|\/ai\b|openai|inception/i,
    category: "ai",
    label: "AI",
  },
  {
    re: /anime|crunchyroll|gogoanime|anilist|myanimelist|tamthilia|series|eliteplex.*series/i,
    category: "drama",
    label: "Tamthilia / Anime",
  },
  {
    re: /movie|tmdb|film|cinema|eliteplex.*movie|moviebox/i,
    category: "movie",
    label: "Movie",
  },
  {
    re: /iptv|\.m3u|live-?tv|channel|modobo|easyapi.*tv|epg/i,
    category: "tv",
    label: "TV / Live",
  },
  {
    re: /radio|radio-browser|shoutcast|icecast/i,
    category: "radio",
    label: "Radio",
  },
  {
    re: /music|itunes|spotify|audio|track|song|freetouse|ytm\.|youtube.*music/i,
    category: "music",
    label: "Music",
  },
  {
    re: /game|freetogame|steam|itch\.io/i,
    category: "game",
    label: "Game",
  },
  {
    re: /vpn|v2ray|clash|wireguard|outline/i,
    category: "vpn",
    label: "VPN",
  },
];

export function detectApiCategoryFromUrl(url: string): {
  category: DetectedApiCategory;
  label: string;
  confidence: "high" | "medium" | "low";
} {
  const u = (url || "").trim();
  if (!u) {
    return { category: "other", label: "Other", confidence: "low" };
  }

  for (const rule of RULES) {
    if (rule.re.test(u)) {
      return {
        category: rule.category,
        label: rule.label,
        confidence: "high",
      };
    }
  }

  return { category: "other", label: "Other", confidence: "low" };
}

export function refineCategoryFromPayload(
  data: unknown,
  fallback: DetectedApiCategory
): DetectedApiCategory {
  try {
    const s = JSON.stringify(data || {}).toLowerCase();
    if (/crid|crunchyroll|anime|episode/.test(s)) return "drama";
    if (/videourl|stream\.mp4|m3u8/.test(s) && /channel|live/.test(s))
      return "tv";
    if (/previewurl|trackname|artistname|itunes/.test(s)) return "music";
    if (/station|bitrate|codec/.test(s)) return "radio";
    if (
      /kudos|horde|image_url|audio_url|tasksn|taskid/.test(s) &&
      /ai|prompt/.test(s)
    )
      return "ai";
    if (/imdb|poster_path|release_date|runtime/.test(s)) return "movie";
  } catch {
    /* ignore */
  }
  return fallback;
}

export function suggestNameFromUrl(url: string, category: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.split("/").filter(Boolean).slice(0, 3).join("/");
    const base = path || host;
    const cat =
      category === "drama"
        ? "Anime/Tamthilia"
        : category === "ai"
          ? "AI"
          : category;
    return `${cat} · ${base}`.slice(0, 80);
  } catch {
    return `API · ${category}`;
  }
}
