/**
 * Covers / logos for TV, movies, drama, music, radio
 */
import { tmdbPosterByTitle } from "@/lib/tmdb";

const CHANNEL_DOMAINS: { match: RegExp; domain: string }[] = [
  { match: /france\s*24/i, domain: "france24.com" },
  { match: /al\s*jazeera/i, domain: "aljazeera.com" },
  { match: /\bbbc\b/i, domain: "bbc.com" },
  { match: /\bnasa\b/i, domain: "nasa.gov" },
  { match: /\bfifa\b/i, domain: "fifa.com" },
  { match: /red\s*bull/i, domain: "redbull.com" },
  { match: /\bdw\b|deutsche\s*welle/i, domain: "dw.com" },
  { match: /\bcgtn\b/i, domain: "cgtn.com" },
  { match: /abc\s*news/i, domain: "abcnews.go.com" },
  { match: /\bcnn\b/i, domain: "cnn.com" },
  { match: /\bespn\b/i, domain: "espn.com" },
  { match: /\bwasafi\b/i, domain: "wasafi.com" },
  { match: /\bazam\b/i, domain: "azamtv.com" },
  { match: /\btbc\b/i, domain: "tbc.go.tz" },
  { match: /\bmbc\b/i, domain: "mbc.net" },
  { match: /disney/i, domain: "disney.com" },
  { match: /\bhbo\b/i, domain: "hbo.com" },
];

function hasValidUrl(u?: string | null): u is string {
  return !!(
    u &&
    /^https?:\/\//i.test(u) &&
    !u.includes("undefined") &&
    !u.includes("null")
  );
}

export function hunterLogo(domain: string): string {
  const d = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  return `https://logos.hunter.io/${encodeURIComponent(d)}`;
}

export function domainFromTitle(title: string): string | null {
  const t = (title || "").trim();
  if (!t) return null;
  for (const { match, domain } of CHANNEL_DOMAINS) {
    if (match.test(t)) return domain;
  }
  return null;
}

export function avatarCover(
  name: string,
  opts?: { bg?: string; color?: string; size?: number }
): string {
  const n = encodeURIComponent((name || "Item").slice(0, 28).trim() || "Item");
  const bg = opts?.bg || "1e293b";
  const color = opts?.color || "38bdf8";
  const size = opts?.size || 256;
  return `https://ui-avatars.com/api/?name=${n}&background=${bg}&color=${color}&size=${size}&bold=true&format=png`;
}

export function tvCover(title: string, existing?: string | null): string {
  if (hasValidUrl(existing) && !existing.includes("ui-avatars.com")) return existing;
  const domain = domainFromTitle(title);
  if (domain) return hunterLogo(domain);
  return avatarCover(title, { bg: "1e293b", color: "f87171", size: 256 });
}

export function radioCover(name: string, existing?: string | null): string {
  if (hasValidUrl(existing) && !existing.includes("ui-avatars.com")) return existing;
  const domain = domainFromTitle(name);
  if (domain) return hunterLogo(domain);
  return avatarCover(name, { bg: "831843", color: "ffffff", size: 256 });
}

export function movieCover(title: string, existing?: string | null): string {
  if (hasValidUrl(existing) && !existing.includes("ui-avatars.com")) return existing;
  return avatarCover(title, { bg: "4c1d95", color: "fbbf24", size: 400 });
}

export function dramaCover(title: string, existing?: string | null): string {
  if (hasValidUrl(existing) && !existing.includes("ui-avatars.com")) return existing;
  return avatarCover(title, { bg: "9a3412", color: "fdba74", size: 400 });
}

export function musicCover(title: string, existing?: string | null): string {
  if (hasValidUrl(existing) && !existing.includes("ui-avatars.com")) return existing;
  return avatarCover(title, { bg: "5b21b6", color: "e9d5ff", size: 400 });
}

export function contentCover(
  type: string,
  title: string,
  existing?: string | null
): string {
  switch (type) {
    case "tv":
      return tvCover(title, existing);
    case "radio":
      return radioCover(title, existing);
    case "music":
      return musicCover(title, existing);
    case "drama":
      return dramaCover(title, existing);
    case "movie":
    default:
      return movieCover(title, existing);
  }
}

/** Real poster from TMDB (preferred) */
export async function fetchMovieCover(
  title: string,
  opts?: { country?: string; media?: "movie" | "tvShow" | "music" }
): Promise<string | null> {
  const term = (title || "").trim();
  if (!term) return null;
  const media = opts?.media === "tvShow" ? "tv" : "movie";
  const fromTmdb = await tmdbPosterByTitle(term, media as "movie" | "tv");
  if (fromTmdb) return fromTmdb;
  return null;
}
