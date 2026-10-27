/**
 * Covers / logos for TV, movies, drama, music, radio
 */
import { tmdbPosterByTitle } from "@/lib/tmdb";

const CHANNEL_DOMAINS: { match: RegExp; domain: string }[] = [
  // Global TV / news
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
  { match: /\bmbc\b/i, domain: "mbc.net" },
  { match: /disney/i, domain: "disney.com" },
  { match: /\bhbo\b/i, domain: "hbo.com" },
  { match: /\bvoa\b|voice of america/i, domain: "voanews.com" },
  // TZ media / radio
  { match: /\bwasafi\b/i, domain: "wasafi.com" },
  { match: /\bazam\b/i, domain: "azamtv.co.tz" },
  { match: /\btbc\b/i, domain: "tbc.go.tz" },
  { match: /clouds\s*fm|\bclouds\b/i, domain: "cloudsfm.co.tz" },
  { match: /radio\s*one|radioone/i, domain: "radioone.co.tz" },
  { match: /east\s*africa\s*radio|eastafrica|\bea\s*radio\b/i, domain: "eatv.tv" },
  { match: /capital\s*radio/i, domain: "capitalradiotanzania.com" },
  { match: /radio\s*maria/i, domain: "radiomaria.org" },
  { match: /passion\s*fm/i, domain: "passionfm.co.tz" },
  { match: /abood/i, domain: "abood.com" },
  { match: /times\s*fm/i, domain: "timesfm.co.tz" },
  { match: /\bitv\b/i, domain: "itv.co.tz" },
  { match: /channel\s*10/i, domain: "channel10.co.tz" },
  { match: /startimes|star\s*times/i, domain: "startimes.com" },
  { match: /\bdstv\b/i, domain: "dstv.com" },
  { match: /bongo\s*radio|bongoradio/i, domain: "bongoradio.com" },
  { match: /afro\s*fm|afrofm/i, domain: "afrofm.com" },
  { match: /kiss\s*fm/i, domain: "kissfm.co.tz" },
  { match: /classic\s*fm/i, domain: "classicfm.co.tz" },
  { match: /breeze\s*fm/i, domain: "breezefm.co.tz" },
  { match: /ebony\s*fm/i, domain: "ebonyfm.co.tz" },
  { match: /utume/i, domain: "radiomaria.org" },
  { match: /safina/i, domain: "safina.co.tz" },
  { match: /magic\s*fm/i, domain: "magicfm.co.tz" },
  { match: /radio\s*free\s*africa|rfa\b/i, domain: "radiofreeafrica.com" },
  { match: /uhuru\s*fm/i, domain: "uhurufm.co.tz" },
  { match: /\bfm\s*radio\b|tanzania\s*fm/i, domain: "tbc.go.tz" },
  // Networks / VPN style titles
  { match: /vodacom|m-?pesa/i, domain: "vodacom.co.tz" },
  { match: /airtel/i, domain: "airtel.co.tz" },
  { match: /halotel|\bhalo\b/i, domain: "halotel.co.tz" },
  { match: /\btigo\b|mix\s*by\s*yas|\byas\b/i, domain: "tigo.co.tz" },
  { match: /\bttcl\b/i, domain: "ttcl.co.tz" },
  { match: /openvpn/i, domain: "openvpn.net" },
  { match: /wireguard/i, domain: "wireguard.com" },
  { match: /nordvpn|\bnord\b/i, domain: "nordvpn.com" },
  { match: /expressvpn/i, domain: "expressvpn.com" },
  { match: /surfshark/i, domain: "surfshark.com" },
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

/** Prefer real favicon → hunter logo → soft gradient avatar (not letters-only look) */
export function radioCover(name: string, existing?: string | null): string {
  if (
    hasValidUrl(existing) &&
    !existing.includes("ui-avatars.com") &&
    !existing.includes("placeholder")
  ) {
    return existing;
  }
  const domain = domainFromTitle(name);
  if (domain) return hunterLogo(domain);
  // Try first word as .com brand
  const word = (name || "")
    .toLowerCase()
    .replace(/radio|fm|tanzania|tz|live|stream/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .find((w) => w.length >= 3);
  if (word) return hunterLogo(`${word}.com`);
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
  const domain = domainFromTitle(title);
  if (domain) return hunterLogo(domain);
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
