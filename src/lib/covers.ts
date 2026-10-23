/**
 * Covers / logos
 * - Channels: logos.hunter.io/{domain} when we know the brand domain
 * - Fallback: ui-avatars
 * - Movies: iTunes artwork search (no API key)
 */

/** Brand domain hints from channel title keywords */
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
  { match: /cartoon\s*network|\bcn\b/i, domain: "cartoonnetwork.com" },
  { match: /disney/i, domain: "disney.com" },
  { match: /\bnick\b|nickelodeon/i, domain: "nick.com" },
  { match: /\bhbo\b/i, domain: "hbo.com" },
  { match: /\bcinemax\b/i, domain: "cinemax.com" },
  { match: /\bnetflix\b/i, domain: "netflix.com" },
  { match: /super\s*sport/i, domain: "supersport.com" },
  { match: /premier\s*sports/i, domain: "premiersports.com" },
  { match: /capuchin/i, domain: "capuchintv.org" },
  { match: /inooro/i, domain: "royalmedia.co.ke" },
];

export function hunterLogo(domain: string): string {
  const d = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  return `https://logos.hunter.io/${encodeURIComponent(d)}`;
}

/** Resolve a likely brand domain from a channel title */
export function domainFromTitle(title: string): string | null {
  const t = (title || "").trim();
  if (!t) return null;
  for (const { match, domain } of CHANNEL_DOMAINS) {
    if (match.test(t)) return domain;
  }
  // Heuristic: single-word brand → try .com
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
  const n = encodeURIComponent((name || "TV").slice(0, 28).trim() || "TV");
  const bg = opts?.bg || "1e293b";
  const color = opts?.color || "38bdf8";
  const size = opts?.size || 256;
  return `https://ui-avatars.com/api/?name=${n}&background=${bg}&color=${color}&size=${size}&bold=true&format=png`;
}

/**
 * TV / channel logo:
 * 1) existing URL if valid
 * 2) logos.hunter.io/{domain} from title map
 * 3) ui-avatars fallback
 */
export function tvCover(title: string, existing?: string | null): string {
  if (existing && /^https?:\/\//i.test(existing) && !existing.includes("undefined")) {
    // Skip weak avatar placeholders if we can do better
    if (!existing.includes("ui-avatars.com")) return existing;
  }

  const domain = domainFromTitle(title);
  if (domain) return hunterLogo(domain);

  const t = (title || "").toLowerCase();
  let bg = "1e293b";
  let color = "f87171";
  if (t.includes("sport") || t.includes("fifa") || t.includes("bein") || t.includes("stadium"))
    color = "4ade80";
  if (t.includes("news") || t.includes("france") || t.includes("bbc") || t.includes("sabc"))
    color = "60a5fa";
  if (t.includes("nasa") || t.includes("wild")) color = "a78bfa";
  return avatarCover(title, { bg, color, size: 256 });
}

export function radioCover(name: string, existing?: string | null): string {
  if (existing && /^https?:\/\//i.test(existing) && !existing.includes("undefined"))
    return existing;
  const domain = domainFromTitle(name);
  if (domain) return hunterLogo(domain);
  return avatarCover(name, { bg: "831843", color: "ffffff", size: 128 });
}

/**
 * Movie / series poster via iTunes Search (no key).
 * Returns high-res artwork URL or null.
 */
export async function fetchMovieCover(
  title: string,
  opts?: { country?: string }
): Promise<string | null> {
  const term = (title || "").trim();
  if (!term) return null;
  try {
    const country = opts?.country || "US";
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&media=movie&limit=5&country=${country}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    for (const r of results) {
      const art =
        r.artworkUrl100 ||
        r.artworkUrl60 ||
        r.artworkUrl30;
      if (typeof art === "string" && art.startsWith("http")) {
        // Bump resolution
        return art.replace(/100x100bb/, "600x600bb").replace(/100x100/, "600x600");
      }
    }
  } catch (e) {
    console.error("fetchMovieCover", term, e);
  }
  return null;
}

/** Sync-safe movie cover: existing poster or avatar */
export function movieCover(title: string, existing?: string | null): string {
  if (existing && /^https?:\/\//i.test(existing) && !existing.includes("undefined"))
    return existing;
  return avatarCover(title, { bg: "0f172a", color: "fbbf24", size: 400 });
}
