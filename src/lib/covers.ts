/**
 * Covers / logos for TV, movies, drama, music, radio
 * - Channels: logos.hunter.io/{domain}
 * - Movies/drama: existing poster or styled avatar (iTunes via fetchMovieCover)
 * - Music/radio: existing art or avatar / hunter logo
 */

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
  { match: /sky\s*news/i, domain: "news.sky.com" },
  { match: /\beurosport\b/i, domain: "eurosport.com" },
  { match: /bein\s*sport/i, domain: "beinsports.com" },
  { match: /\bespn\b/i, domain: "espn.com" },
  { match: /man\s*u|manchester\s*united|\bmutv\b/i, domain: "manutd.com" },
  { match: /liverpool/i, domain: "liverpoolfc.com" },
  { match: /\bwasafi\b/i, domain: "wasafi.com" },
  { match: /\bazam\b/i, domain: "azamtv.com" },
  { match: /\btbc\b/i, domain: "tbc.go.tz" },
  { match: /mahaasin/i, domain: "mahaasintv.com" },
  { match: /\bdstv\b|\bmultichoice\b/i, domain: "dstv.com" },
  { match: /startimes|startime/i, domain: "startimestv.com" },
  { match: /\bsabc\b/i, domain: "sabc.co.za" },
  { match: /\bmbc\b/i, domain: "mbc.net" },
  { match: /national\s*geographic|\bnat\s*geo\b/i, domain: "nationalgeographic.com" },
  { match: /discovery/i, domain: "discovery.com" },
  { match: /cartoon\s*network/i, domain: "cartoonnetwork.com" },
  { match: /disney/i, domain: "disney.com" },
  { match: /nickelodeon|\bnick\b/i, domain: "nick.com" },
  { match: /\bhbo\b/i, domain: "hbo.com" },
  { match: /\bcinemax\b/i, domain: "cinemax.com" },
  { match: /super\s*sport/i, domain: "supersport.com" },
  { match: /clouds\s*fm|cloudsfm/i, domain: "cloudsfm.co.tz" },
  { match: /radio\s*one|radio1/i, domain: "radioone.co.tz" },
  { match: /eafm|ea\s*fm/i, domain: "eafm.co.tz" },
  { match: /boom\s*boom/i, domain: "boomboom.co.tz" },
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
  const word = t.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/)[0];
  if (word && word.length >= 3 && word.length <= 20) {
    return `${word.toLowerCase()}.com`;
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
  const t = (title || "").toLowerCase();
  let color = "f87171";
  if (/sport|fifa|bein|stadium/.test(t)) color = "4ade80";
  if (/news|france|bbc|sabc/.test(t)) color = "60a5fa";
  if (/nasa|wild/.test(t)) color = "a78bfa";
  return avatarCover(title, { bg: "1e293b", color, size: 256 });
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

/** Unified cover by content type — never returns empty */
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

/** Async: iTunes movie/TV artwork */
export async function fetchMovieCover(
  title: string,
  opts?: { country?: string; media?: "movie" | "tvShow" | "music" }
): Promise<string | null> {
  const term = (title || "").trim();
  if (!term) return null;
  try {
    const country = opts?.country || "US";
    const media = opts?.media || "movie";
    const entity =
      media === "tvShow" ? "tvSeason" : media === "music" ? "song" : "movie";
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&media=${media === "music" ? "music" : media === "tvShow" ? "tvShow" : "movie"}&entity=${entity}&limit=5&country=${country}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    for (const r of results) {
      const art = r.artworkUrl100 || r.artworkUrl60;
      if (typeof art === "string" && art.startsWith("http")) {
        return art
          .replace(/100x100bb/, "600x600bb")
          .replace(/100x100/, "600x600");
      }
    }
  } catch (e) {
    console.error("fetchMovieCover", term, e);
  }
  return null;
}
