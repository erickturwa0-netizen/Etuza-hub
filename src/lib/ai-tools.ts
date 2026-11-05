/**
 * ETUZA AI agent tools — HTTP scrape + simple browser (fetch page).
 * Runs server-side (Vercel-safe, no Playwright binary).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

const MAX_BODY = 400_000; // bytes to download
const MAX_TEXT = 12_000; // chars returned to model
const TIMEOUT_MS = 12_000;

function isPrivateIp(host: string): boolean {
  if (BLOCKED_HOSTS.has(host.toLowerCase())) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;
  return false;
}

export function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    if (isPrivateIp(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Extract first http(s) URL from text */
export function extractUrlFromText(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return normalizeUrl(m[0].replace(/[).,;]+$/, ""));
  // domain-like without scheme
  const d = text.match(
    /(?:^|\s)((?:[a-z0-9-]+\.)+(?:com|org|net|io|app|dev|co|tz|ke|uk|info)\/[\w./?%&=+#-]*)/i
  );
  if (d) return normalizeUrl(d[1]);
  return null;
}

export function wantsWebTool(message: string): boolean {
  const m = message.toLowerCase();
  if (extractUrlFromText(message)) return true;
  return /\b(scrape|browse|fungua\s+link|fungua\s+site|angalia\s+(site|web|ukurasa|link)|nenda\s+(kwa|kwenye)\s+http|visit\s+https?|soma\s+ukurasa|web\s+search|tafuta\s+mtandaoni|http_request|visit_web)\b/i.test(
    m
  );
}

function stripHtml(html: string): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).slice(0, 200) : "";
}

function extractLinks(html: string, base: string): string[] {
  const links: string[] = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && links.length < 15) {
    try {
      const href = new URL(m[1], base).toString();
      if (!/^https?:/i.test(href)) continue;
      const label = stripHtml(m[2]).slice(0, 80);
      links.push(label ? `${label} → ${href}` : href);
    } catch {
      /* ignore */
    }
  }
  return links;
}

export type ToolResult = {
  tool: string;
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

/** HTTP request / API scrape */
export async function httpRequest(opts: {
  url: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}): Promise<ToolResult> {
  const url = normalizeUrl(opts.url);
  if (!url) {
    return {
      tool: "http_request",
      ok: false,
      summary: "URL batili au imezuiwa (localhost/private IP).",
    };
  }

  const method = (opts.method || "GET").toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent":
          "ETUZA-AI-Bot/1.0 (+https://etuza-hub-v2.vercel.app; research)",
        Accept: "application/json, text/plain, text/html;q=0.9, */*;q=0.8",
        ...(opts.headers || {}),
      },
      body: method === "GET" || method === "HEAD" ? undefined : opts.body,
      signal: controller.signal,
      redirect: "follow",
    });

    const ctype = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    const slice = buf.subarray(0, MAX_BODY);
    const text = slice.toString("utf8");

    if (ctype.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      let pretty = text.slice(0, MAX_TEXT);
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2).slice(0, MAX_TEXT);
      } catch {
        /* keep raw */
      }
      return {
        tool: "http_request",
        ok: res.ok,
        summary: `HTTP ${res.status} JSON kutoka ${url}`,
        data: { status: res.status, contentType: ctype, body: pretty },
      };
    }

    const plain = stripHtml(text).slice(0, MAX_TEXT);
    return {
      tool: "http_request",
      ok: res.ok,
      summary: `HTTP ${res.status} text kutoka ${url}`,
      data: {
        status: res.status,
        contentType: ctype,
        title: extractTitle(text),
        body: plain,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return {
      tool: "http_request",
      ok: false,
      summary: `Imeshindikana: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Visit web page — extract title, text, links (simple browser) */
export async function visitWeb(urlRaw: string): Promise<ToolResult> {
  const url = normalizeUrl(urlRaw);
  if (!url) {
    return {
      tool: "visit_web",
      ok: false,
      summary: "URL batili au imezuiwa.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ETUZA-AI/1.0; +https://etuza-hub-v2.vercel.app)",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    const buf = Buffer.from(await res.arrayBuffer());
    const html = buf.subarray(0, MAX_BODY).toString("utf8");
    const title = extractTitle(html);
    const text = stripHtml(html).slice(0, MAX_TEXT);
    const links = extractLinks(html, url);

    return {
      tool: "visit_web",
      ok: res.ok,
      summary: `Ukurasa: ${title || url} (HTTP ${res.status})`,
      data: {
        status: res.status,
        url: res.url || url,
        title,
        text,
        links: links.slice(0, 12),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "visit failed";
    return {
      tool: "visit_web",
      ok: false,
      summary: `Imeshindikana kufungua: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Run tools based on user message; return block for system prompt */
export async function runAiToolsForMessage(
  message: string
): Promise<{ block: string; results: ToolResult[] }> {
  if (!wantsWebTool(message)) {
    return { block: "", results: [] };
  }

  const results: ToolResult[] = [];
  const url = extractUrlFromText(message);

  if (url) {
    const lower = message.toLowerCase();
    const preferHttp =
      /\b(api|json|http_request|endpoint)\b/i.test(lower) ||
      /\/api\//i.test(url);

    if (preferHttp) {
      results.push(await httpRequest({ url }));
    } else {
      results.push(await visitWeb(url));
      // if HTML thin / looks like JSON API, also try raw
      const r = results[0];
      if (
        r.data?.body &&
        typeof r.data.body === "string" &&
        r.data.body.length < 80
      ) {
        results.push(await httpRequest({ url }));
      }
    }
  }

  if (!results.length) {
    return {
      block: "",
      results: [],
    };
  }

  const block =
    "\n\n=== TOOL RESULTS (browser / http scrape) ===\n" +
    results
      .map((r) => {
        let s = `### ${r.tool} — ${r.ok ? "OK" : "FAIL"}\n${r.summary}\n`;
        if (r.data) {
          if (r.data.title) s += `Title: ${r.data.title}\n`;
          if (r.data.status) s += `Status: ${r.data.status}\n`;
          if (r.data.url) s += `URL: ${r.data.url}\n`;
          if (r.data.body) s += `Body:\n${String(r.data.body).slice(0, 8000)}\n`;
          if (r.data.text) s += `Text:\n${String(r.data.text).slice(0, 8000)}\n`;
          if (Array.isArray(r.data.links) && r.data.links.length) {
            s += `Links:\n- ${r.data.links.slice(0, 10).join("\n- ")}\n`;
          }
        }
        return s;
      })
      .join("\n") +
    "\n=== MWISHO TOOL RESULTS ===\nTumia data hii kujibu. Usidai umefungua link kama tool ilishindwa.\n";

  return { block, results };
}
