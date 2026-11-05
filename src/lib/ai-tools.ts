/**
 * ETUZA AI agent tools — web_search, visit_web, http_request
 * Server-side (Vercel-safe).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

const MAX_BODY = 400_000;
const MAX_TEXT = 14_000;
const TIMEOUT_MS = 15_000;

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

export function extractUrlFromText(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return normalizeUrl(m[0].replace(/[).,;]+$/, ""));
  const d = text.match(
    /(?:^|\s)((?:[a-z0-9-]+\.)+(?:com|org|net|io|app|dev|co|tz|ke|uk|info|ai)\/[\w./?%&=+#-]*)/i
  );
  if (d) return normalizeUrl(d[1]);
  return null;
}

export function wantsWebTool(message: string): boolean {
  const m = message.toLowerCase();
  if (extractUrlFromText(message)) return true;
  return /\b(scrape|browse|fungua|angalia\s+(site|web)|tafuta|web\s+search|taarifa|habari|search|google|wikipedia|nani\s+ni|nini\s+maana|bei\s+ya|weather)\b/i.test(
    m
  );
}

export function agentShouldSearch(message: string): boolean {
  const m = message.trim();
  if (m.length < 2) return false;
  if (extractUrlFromText(m)) return true;
  if (/^(habari|hujambo|jambo|hello|hi|hey|asante|thanks)[!.?\s]*$/i.test(m))
    return false;
  if (/[?]/.test(m)) return true;
  if (m.split(/\s+/).length >= 2) return true;
  return wantsWebTool(m);
}

function stripHtml(html: string): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  return t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).slice(0, 200) : "";
}

function extractLinks(html: string, base: string): string[] {
  const links: string[] = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && links.length < 12) {
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

async function fetchText(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      ok: res.ok,
      status: res.status,
      text: buf.subarray(0, MAX_BODY).toString("utf8"),
      finalUrl: res.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
}

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
      summary: "URL batili au imezuiwa.",
    };
  }
  try {
    const method = (opts.method || "GET").toUpperCase();
    const { ok, status, text } = await fetchText(url, {
      method,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ETUZA-AI/1.0; +https://etuza-hub-v2.vercel.app)",
        Accept: "application/json, text/plain, text/html;q=0.9,*/*;q=0.8",
        ...(opts.headers || {}),
      },
      body: method === "GET" || method === "HEAD" ? undefined : opts.body,
    });
    if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
      let pretty = text.slice(0, MAX_TEXT);
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2).slice(0, MAX_TEXT);
      } catch {
        /* */
      }
      return {
        tool: "http_request",
        ok,
        summary: `HTTP ${status} JSON`,
        data: { status, body: pretty },
      };
    }
    return {
      tool: "http_request",
      ok,
      summary: `HTTP ${status} text`,
      data: {
        status,
        title: extractTitle(text),
        body: stripHtml(text).slice(0, MAX_TEXT),
      },
    };
  } catch (e) {
    return {
      tool: "http_request",
      ok: false,
      summary: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

export async function visitWeb(urlRaw: string): Promise<ToolResult> {
  const url = normalizeUrl(urlRaw);
  if (!url) {
    return { tool: "visit_web", ok: false, summary: "URL batili." };
  }
  try {
    const { ok, status, text, finalUrl } = await fetchText(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "sw,en;q=0.9",
      },
    });
    return {
      tool: "visit_web",
      ok,
      summary: `Ukurasa: ${extractTitle(text) || finalUrl} (${status})`,
      data: {
        status,
        url: finalUrl,
        title: extractTitle(text),
        text: stripHtml(text).slice(0, MAX_TEXT),
        links: extractLinks(text, finalUrl).slice(0, 10),
      },
    };
  } catch (e) {
    return {
      tool: "visit_web",
      ok: false,
      summary: e instanceof Error ? e.message : "visit failed",
    };
  }
}

async function wikiSearch(query: string, lang: "en" | "sw"): Promise<string[]> {
  const lines: string[] = [];
  try {
    const openUrl =
      `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=` +
      encodeURIComponent(query) +
      `&limit=5&namespace=0&format=json&origin=*`;
    const { text } = await fetchText(openUrl, {
      headers: { Accept: "application/json" },
    });
    const data = JSON.parse(text) as unknown[];
    const titles = (data[1] as string[]) || [];
    const descs = (data[2] as string[]) || [];
    const urls = (data[3] as string[]) || [];
    for (let i = 0; i < titles.length; i++) {
      lines.push(
        `• ${titles[i]}${descs[i] ? " — " + descs[i] : ""}${urls[i] ? " (" + urls[i] + ")" : ""}`
      );
    }
    // extract first page summary
    if (titles[0]) {
      const sumUrl =
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/` +
        encodeURIComponent(titles[0]);
      const sum = await fetchText(sumUrl, {
        headers: { Accept: "application/json" },
      });
      try {
        const j = JSON.parse(sum.text) as {
          extract?: string;
          description?: string;
          title?: string;
        };
        if (j.extract) {
          lines.unshift(
            `Wikipedia (${lang}): **${j.title || titles[0]}** — ${j.extract.slice(0, 1200)}`
          );
        } else if (j.description) {
          lines.unshift(`Wikipedia (${lang}): ${j.title}: ${j.description}`);
        }
      } catch {
        /* */
      }
    }
  } catch {
    /* ignore wiki errors */
  }
  return lines;
}

async function ddgHtmlSearch(
  query: string
): Promise<{ title: string; url: string; snippet: string }[]> {
  const results: { title: string; url: string; snippet: string }[] = [];
  try {
    const htmlUrl =
      "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
    const { text: html } = await fetchText(htmlUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ETUZA-AI/1.0; +https://etuza-hub-v2.vercel.app)",
        Accept: "text/html",
      },
    });
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/)?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < 8) {
      let url = m[1];
      try {
        const u = new URL(url, "https://duckduckgo.com");
        const uddg = u.searchParams.get("uddg");
        if (uddg) url = decodeURIComponent(uddg);
      } catch {
        /* */
      }
      results.push({
        title: stripHtml(m[2]).slice(0, 140),
        url,
        snippet: stripHtml(m[3] || "").slice(0, 300),
      });
    }
  } catch {
    /* */
  }
  return results;
}

/** Multi-source web search — always try hard */
export async function webSearch(query: string): Promise<ToolResult> {
  const q = query.trim().slice(0, 200);
  if (!q) {
    return { tool: "web_search", ok: false, summary: "Query tupu." };
  }

  try {
    const [wikiEn, wikiSw, ddg] = await Promise.all([
      wikiSearch(q, "en"),
      wikiSearch(q, "sw"),
      ddgHtmlSearch(q),
    ]);

    const parts: string[] = [];
    if (wikiSw.length) parts.push("=== Wikipedia SW ===\n" + wikiSw.join("\n"));
    if (wikiEn.length) parts.push("=== Wikipedia EN ===\n" + wikiEn.join("\n"));
    if (ddg.length) {
      parts.push(
        "=== Web results ===\n" +
          ddg
            .map(
              (r, i) =>
                `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`
            )
            .join("\n")
      );
    }

    // If still thin, fetch first DDG page text
    if (parts.join("").length < 200 && ddg[0]?.url) {
      try {
        const page = await visitWeb(ddg[0].url);
        if (page.data?.text) {
          parts.push(
            `=== Page extract (${ddg[0].url}) ===\n` +
              String(page.data.text).slice(0, 3000)
          );
        }
      } catch {
        /* */
      }
    }

    const body = parts.join("\n\n").slice(0, MAX_TEXT);
    const ok = body.length > 40;

    return {
      tool: "web_search",
      ok,
      summary: ok
        ? `Utafutaji OK: "${q}" (wiki+web)`
        : `Hakuna data nyingi kwa "${q}" — jibu kwa maarifa yako kama unaweza`,
      data: { query: q, body, results: ddg },
    };
  } catch (e) {
    return {
      tool: "web_search",
      ok: false,
      summary: e instanceof Error ? e.message : "search failed",
    };
  }
}

export async function runAiToolsForMessage(
  message: string,
  opts?: { mode?: "hub" | "agent" }
): Promise<{ block: string; results: ToolResult[] }> {
  const mode = opts?.mode || "hub";
  const url = extractUrlFromText(message);
  const force = mode === "agent" && agentShouldSearch(message);
  const want = force || wantsWebTool(message);

  if (!want) {
    return { block: "", results: [] };
  }

  const results: ToolResult[] = [];

  if (url) {
    const preferHttp =
      /\b(api|json|http_request|endpoint)\b/i.test(message) ||
      /\/api\//i.test(url);
    if (preferHttp) {
      results.push(await httpRequest({ url }));
    } else {
      results.push(await visitWeb(url));
    }
  }

  // Agent (or explicit search intent): always web_search the question
  if (mode === "agent" || (!url && wantsWebTool(message))) {
    const q = message
      .replace(
        /^(tafuta|search|google|nisaidie|niambie|eleza|nani\s+ni)\s+/i,
        ""
      )
      .trim()
      .slice(0, 200);
    results.push(await webSearch(q || message));
  }

  if (!results.length) {
    return { block: "", results: [] };
  }

  const block =
    "\n\n=== TOOL RESULTS (LAZIMA UTUMIE) ===\n" +
    results
      .map((r) => {
        let s = `### ${r.tool} — ${r.ok ? "OK" : "FAIL"}\n${r.summary}\n`;
        if (r.data) {
          if (r.data.title) s += `Title: ${r.data.title}\n`;
          if (r.data.url) s += `URL: ${r.data.url}\n`;
          if (r.data.query) s += `Query: ${r.data.query}\n`;
          if (r.data.body) s += `${String(r.data.body).slice(0, 9000)}\n`;
          if (r.data.text) s += `${String(r.data.text).slice(0, 9000)}\n`;
        }
        return s;
      })
      .join("\n") +
    "\n=== MWISHO TOOLS ===\nJibu swali la mtumiaji kwa kutumia data hapo juu AU maarifa yako. USISEME 'database yangu haina' — wewe SI database ya movies pekee. USIULIZE ruhusa ya kutafuta — tayari umetafuta.\n";

  return { block, results };
}
