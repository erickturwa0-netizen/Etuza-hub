/** Map title keywords → domain for logos.hunter.io */

const NETWORK_DOMAINS: { keys: string[]; domain: string }[] = [
  { keys: ["vodacom", "m-pesa", "mpesa", "voda"], domain: "vodacom.co.tz" },
  { keys: ["airtel", "airtel money"], domain: "airtel.co.tz" },
  { keys: ["halotel", "halo"], domain: "halotel.co.tz" },
  { keys: ["tigo", "mix by yas", "yas", "mixbyyas"], domain: "tigo.co.tz" },
  { keys: ["ttcl"], domain: "ttcl.co.tz" },
  { keys: ["zantel"], domain: "zantel.co.tz" },
  { keys: ["smile"], domain: "smile.co.tz" },
  { keys: ["azam", "azamtv"], domain: "azamtv.co.tz" },
  { keys: ["startimes", "star times"], domain: "startimes.com" },
  { keys: ["dstv", "multichoice"], domain: "dstv.com" },
  { keys: ["bbc"], domain: "bbc.com" },
  { keys: ["voa"], domain: "voanews.com" },
  { keys: ["cloud", "clouds fm", "cloudsfm"], domain: "cloudsfm.co.tz" },
  { keys: ["wasafi"], domain: "wasafi.com" },
  { keys: ["eafm", "ea fm"], domain: "eafm.co.tz" },
  { keys: ["radio one", "radio1"], domain: "radioone.co.tz" },
  { keys: ["times fm", "timesfm"], domain: "timesfm.co.tz" },
  { keys: ["tbc"], domain: "tbc.go.tz" },
  { keys: ["itv"], domain: "itv.co.tz" },
  { keys: ["channel 10", "channel10"], domain: "channel10.co.tz" },
  { keys: ["google"], domain: "google.com" },
  { keys: ["openvpn"], domain: "openvpn.net" },
  { keys: ["wireguard"], domain: "wireguard.com" },
  { keys: ["nordvpn", "nord"], domain: "nordvpn.com" },
  { keys: ["expressvpn"], domain: "expressvpn.com" },
  { keys: ["surfshark"], domain: "surfshark.com" },
];

export function domainFromTitle(title: string): string | null {
  const t = (title || "").toLowerCase().trim();
  if (!t) return null;

  for (const row of NETWORK_DOMAINS) {
    for (const k of row.keys) {
      if (t.includes(k)) return row.domain;
    }
  }

  // If title looks like a domain
  const m = t.match(/([a-z0-9-]+\.(com|co\.tz|go\.tz|net|org|io|fm|tv))/i);
  if (m) return m[1].toLowerCase();

  // Slug first word as .com guess
  const word = t.replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/)[0];
  if (word && word.length >= 3) return `${word}.com`;

  return null;
}

export function hunterLogoUrl(domain: string) {
  return `https://logos.hunter.io/${encodeURIComponent(domain)}`;
}

export function logoUrlFromTitle(title: string): string | null {
  const d = domainFromTitle(title);
  if (!d) return null;
  return hunterLogoUrl(d);
}

/** Client-side: check logo loads */
export async function resolveLogoFromTitle(
  title: string
): Promise<string | null> {
  const url = logoUrlFromTitle(title);
  if (!url) return null;
  try {
    const res = await fetch(url, { method: "GET", mode: "cors" });
    if (!res.ok) return null;
    return url;
  } catch {
    // Still return URL — <img> may load even if CORS blocks fetch
    return url;
  }
}
