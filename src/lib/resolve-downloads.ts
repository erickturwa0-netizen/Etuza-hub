/** Extract download-host links from a webpage HTML (MediaFire, Drive, Mega, etc.) */

const HOST_RE =
  /https?:\/\/(?:[\w.-]+\.)?(?:mediafire\.com|mega\.nz|drive\.google\.com|docs\.google\.com|pixeldrain\.com|gofile\.io|anonfiles\.com|workupload\.com|1fichier\.com|krakenfiles\.com|uploadhaven\.com|dailyuploads\.net|racaty\.net|solidfiles\.com|dropbox\.com|onedrive\.live\.com|mediafire\.com\/file\/[\w]+|download\.[\w.-]+)[\w\-._~:/?#[\]@!$&'()*+,;=%]*/gi;

const ANY_URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;

const SKIP_HOST =
  /(?:googleusercontent|blogger\.com|googleapis|gstatic|cloudflare|facebook|twitter|instagram|youtube|fonts\.|w3\.org|schema\.org|ogp\.me|templateify|cdnjs)/i;

export type ResolvedLink = {
  url: string;
  host: string;
  label: string;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function labelOf(url: string, host: string) {
  const path = (() => {
    try {
      return decodeURIComponent(new URL(url).pathname);
    } catch {
      return url;
    }
  })();
  const file = path.split("/").filter(Boolean).pop() || "";
  if (/\.(zip|rar|7z|iso|cso|apk|mp4)$/i.test(file)) return file;
  if (host.includes("mediafire")) return "MediaFire Download";
  if (host.includes("mega")) return "Mega Download";
  if (host.includes("google")) return "Google Drive";
  if (host.includes("pixeldrain")) return "Pixeldrain";
  return host;
}

function uniq(urls: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const clean = u.replace(/[),.;]+$/, "").replace(/&amp;/g, "&");
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

export function extractDownloadLinks(html: string): ResolvedLink[] {
  const fromHosts = html.match(HOST_RE) || [];
  const all = html.match(ANY_URL_RE) || [];

  // Also catch mediafire in encoded / obfuscated form
  const decoded = html
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/");
  const fromDecoded = decoded.match(HOST_RE) || [];

  const candidates = uniq([...fromHosts, ...fromDecoded, ...all]).filter((u) => {
    if (SKIP_HOST.test(u)) return false;
    const h = hostOf(u);
    // Prefer known file hosts; also keep intermediate cloaker links that look like download gates
    if (
      /mediafire|mega\.nz|drive\.google|pixeldrain|gofile|1fichier|workupload|krakenfiles|uploadhaven|dropbox|onedrive/i.test(
        h
      )
    )
      return true;
    // Short binary-looking paths on unknown hosts (common ad redirectors on game blogs)
    if (/\/[0-9a-f]{8,}\/?$/i.test(u) && !/dzgurus|blogger|blogspot/i.test(h)) return true;
    return false;
  });

  // Prefer real file hosts first
  const ranked = candidates.sort((a, b) => {
    const score = (u: string) => {
      const h = hostOf(u);
      if (h.includes("mediafire")) return 100;
      if (h.includes("mega")) return 90;
      if (h.includes("google")) return 80;
      if (h.includes("pixeldrain")) return 70;
      return 10;
    };
    return score(b) - score(a);
  });

  return ranked.slice(0, 12).map((url) => {
    const host = hostOf(url);
    return { url, host, label: labelOf(url, host) };
  });
}

/** Follow one redirect hop to surface MediaFire behind cloakers */
export async function followToFileHost(
  url: string,
  timeoutMs = 8000
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,*/*",
      },
    });
    clearTimeout(t);
    const loc = res.headers.get("location");
    if (loc) {
      const abs = loc.startsWith("http") ? loc : new URL(loc, url).href;
      if (/mediafire|mega\.nz|drive\.google|pixeldrain/i.test(abs)) return abs;
      return abs;
    }
    // Some return HTML with meta refresh or JS location
    const text = await res.text();
    const m =
      text.match(/mediafire\.com\/file\/[\w\/.-]+/i) ||
      text.match(/https?:\/\/www\.mediafire\.com[^"'\s<>]+/i);
    if (m) return m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
    return null;
  } catch {
    return null;
  }
}

export async function resolvePageDownloads(pageUrl: string): Promise<{
  links: ResolvedLink[];
  title?: string;
  error?: string;
}> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return { links: [], error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const title =
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || undefined;

    let links = extractDownloadLinks(html);

    // Resolve cloaker / intermediate links one hop
    const resolved: ResolvedLink[] = [];
    const seen = new Set<string>();
    for (const L of links.slice(0, 8)) {
      if (/mediafire|mega\.nz|drive\.google|pixeldrain/i.test(L.host)) {
        if (!seen.has(L.url)) {
          seen.add(L.url);
          resolved.push(L);
        }
        continue;
      }
      const next = await followToFileHost(L.url);
      if (next && /mediafire|mega\.nz|drive\.google|pixeldrain/i.test(next)) {
        if (!seen.has(next)) {
          seen.add(next);
          const host = hostOf(next);
          resolved.push({ url: next, host, label: labelOf(next, host) });
        }
      } else if (!seen.has(L.url)) {
        seen.add(L.url);
        resolved.push(L);
      }
    }

    // Prefer file hosts only in final list if any exist
    const fileHosts = resolved.filter((l) =>
      /mediafire|mega\.nz|drive\.google|pixeldrain|gofile/i.test(l.host)
    );

    return {
      links: fileHosts.length > 0 ? fileHosts : resolved,
      title,
    };
  } catch (e) {
    return {
      links: [],
      error: e instanceof Error ? e.message : "Resolve failed",
    };
  }
}
