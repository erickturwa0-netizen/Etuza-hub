/**
 * ETUZA AI agent tools — HTTP scrape + visit_web + web_search.
 * Server-side (Vercel-safe, no Playwright binary).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

const MAX_BODY = 400_000;
const MAX_TEXT = 12_000;
const TIMEOUT_MS = 14_000;

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

/** When user clearly wants online info (no URL required) */
export function wantsWebTool(message: string): boolean {
  const m = message.toLowerCase();
  if (extractUrlFromText(message)) return true;
  return /\b(scrape|browse|fungua\s+link|fungua\s+site|angalia\s+(site|web|ukurasa|link)|nenda\s+(kwa|kwenye)\s+http|visit\s+https?|soma\s+ukurasa|web\s+search|tafuta\s+mtandaoni|http_request|visit_web|taarifa|habari\s+za|search\s+online|google|wikipedia|nani\s+ni|nini\s+maana|wapi\s+iko|bei\s+ya|weather|hali\s+ya\s+hewa|leo\s+ni)\b/i.test(
    m
  );
}

/** Agent mode: almost any real question should try the web */
export function agentShouldSearch(message: string): boolean {
  const m = message.trim();
  if (m.length < 3) return false;
  if (extractUrlFromText(m)) return true;
  if (wantsWebTool(m)) return true;
  // short pure greetings only → no
  if (/^(habari|hujambo|jambo|hello|hi|hey|asante|thanks)[!.?\s]*$/i.test(m))
    return false;
  // factual / open questions
  if (/[?]/.test(m)) return true;
  if (m.split(/\s+/).length >= 3) return true;
  return false;
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
          "Mozilla/5.0 (compatible; ETUZA-AI/1.0; +https://etuza-hub-v2.vercel.app)",
        Accept: "application/json, text/plain, text/html;q=0.9, */*;q=0.8",
        ...(opts.headers || {}),
      },
      body: method === "GET" || method === "HEAD" ? undefined : opts.body,
      signal: controller.signal,
      redirect: "follow",
    });

    const ctype = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.subarray(0, MAX_BODY).toString("utf8");

    if (
      ctype.includes("application/json") ||
      text.trim().startsWith("{") ||
      text.trim().startsWith("[")
    ) {
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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "sw,en;q=0.8",
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

/** DuckDuckGo HTML search — no API key */
export async function webSearch(query: string): Promise<ToolResult> {
  const q = query.trim().slice(0, 200);
  if (!q) {
    return { tool: "web_search", ok: false, summary: "Query tupu." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 1) Instant Answer API
    const iaUrl =
      "https://api.duckduckgo.com/?q=" +
      encodeURIComponent(q) +
      "&format=json&no_html=1&skip_disambig=1";
    const iaRes = await fetch(iaUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ETUZA-AI/1.0",
        Accept: "application/json",
      },
    });
    const ia = (await iaRes.json().catch(() => ({}))) as {
      AbstractText?: string;
      AbstractURL?: string;
      Heading?: string;
      Answer?: string;
      Definition?: string;
      RelatedTopics?: { Text?: string; FirstURL?: string }[];
    };

    const snippets: string[] = [];
    if (ia.Heading) snippets.push(`Heading: ${ia.Heading}`);
    if (ia.AbstractText) snippets.push(ia.AbstractText.slice(0, 1500));
    if (ia.Answer) snippets.push(`Answer: ${ia.Answer}`);
    if (ia.Definition) snippets.push(`Definition: ${ia.Definition}`);
    if (ia.AbstractURL) snippets.push(`Source: ${ia.AbstractURL}`);
    if (Array.isArray(ia.RelatedTopics)) {
      for (const t of ia.RelatedTopics.slice(0, 6)) {
        if (t.Text) snippets.push(`• ${t.Text.slice(0, 300)}`);
      }
    }

    // 2) HTML results for more coverage
    const htmlUrl =
      "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    const htmlRes = await fetch(htmlUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ETUZA-AI/1.0; +https://etuza-hub-v2.vercel.app)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    const html = (await htmlRes.text()).slice(0, 200_000);

    const results: { title: string; url: string; snippet: string }[] = [];
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < 8) {
      const href = m[1];
      const title = stripHtml(m[2]).slice(0, 120);
      const snippet = stripHtml(m[3] || "").slice(0, 280);
      let url = href;
      // DDG redirect
      try {
        const u = new URL(href, "https://duckduckgo.com");
        const uddg = u.searchParams.get("uddg");
        if (uddg) url = decodeURIComponent(uddg);
      } catch {
        /* keep */
      }
      if (title) results.push({ title, url, snippet });
    }

    // fallback parse looser
    if (!results.length) {
      const re2 =
        /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((m = re2.exec(html)) && results.length < 6) {
        results.push({
          title: stripHtml(m[2]).slice(0, 120),
          url: m[1],
          snippet: "",
        });
      }
    }

    const ok = snippets.length > 0 || results.length > 0;
    const body =
      (snippets.length ? snippets.join("\n") + "\n\n" : "") +
      results
        .map(
          (r, i) =>
            `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`
        )
        .join("\n");

    return {
      tool: "web_search",
      ok,
      summary: ok
        ? `Utafutaji: "${q}" — ${results.length} matokeo`
        : `Hakuna matokeo ya wazi kwa "${q}"`,
      data: {
        query: q,
        body: body.slice(0, MAX_TEXT),
        results,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "search failed";
    return {
      tool: "web_search",
      ok: false,
      summary: `Utafutaji umeshindikana: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runAiToolsForMessage(
  message: string,
  opts?: { mode?: "hub" | "agent" }
): Promise<{ block: string; results: ToolResult[] }> {
  const mode = opts?.mode || "hub";
  const url = extractUrlFromText(message);
  const force =
    mode === "agent" && agentShouldSearch(message);
  const want = force || wantsWebTool(message);

  if (!want) {
    return { block: "", results: [] };
  }

  const results: ToolResult[] = [];

  if (url) {
    const lower = message.toLowerCase();
    const preferHttp =
      /\b(api|json|http_request|endpoint)\b/i.test(lower) ||
      /\/api\//i.test(url);

    if (preferHttp) {
      results.push(await httpRequest({ url }));
    } else {
      results.push(await visitWeb(url));
      const r = results[0];
      if (
        r.data?.body &&
        typeof r.data.body === "string" &&
        r.data.body.length < 80
      ) {
        results.push(await httpRequest({ url }));
      }
    }
  } else if (mode === "agent" || wantsWebTool(message)) {
    // No URL → search the web
    const q = message
      .replace(/^(tafuta|search|google|nisaidie|niambie|eleza)\s+/i, "")
      .trim()
      .slice(0, 200);
    results.push(await webSearch(q || message));
  }

  if (!results.length) {
    return { block: "", results: [] };
  }

  const block =
    "\n\n=== TOOL RESULTS (browser / http / web_search) ===\n" +
    results
      .map((r) => {
        let s = `### ${r.tool} — ${r.ok ? "OK" : "FAIL"}\n${r.summary}\n`;
        if (r.data) {
          if (r.data.title) s += `Title: ${r.data.title}\n`;
          if (r.data.status) s += `Status: ${r.data.status}\n`;
          if (r.data.url) s += `URL: ${r.data.url}\n`;
          if (r.data.query) s += `Query: ${r.data.query}\n`;
          if (r.data.body) s += `Body:\n${String(r.data.body).slice(0, 8000)}\n`;
          if (r.data.text) s += `Text:\n${String(r.data.text).slice(0, 8000)}\n`;
          if (Array.isArray(r.data.links) && r.data.links.length) {
            s += `Links:\n- ${r.data.links.slice(0, 10).join("\n- ")}\n`;
          }
        }
        return s;
      })
      .join("\n") +
    "\n=== MWISHO TOOL RESULTS ===\nTumia data hii kujibu kwa usahihi. Usidai umetafuta kama tool ilishindwa.\n";

  return { block, results };
}
