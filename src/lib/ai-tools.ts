/**
 * ETUZA AI agent tools — Tavily (primary), web, terminal, embed, inference, image_gen
 * Server-side (Vercel-safe).
 */

import {
  runTerminal,
  wantsTerminal,
  extractCommand,
} from "@/lib/ai-terminal";
import {
  embedTool,
  semanticContentSearch,
  inferenceScaffold,
  wantsEmbed,
  wantsInference,
} from "@/lib/ai-embed";
import { runInferencePass } from "@/lib/ai-inference";
import { tavilySearch, tavilyExtract } from "@/lib/ai-tavily";
import {
  wantsImageGen,
  extractImagePrompt,
  generateImageHorde,
} from "@/lib/ai-image-gen";

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
    return { tool: "http_request", ok: false, summary: "URL batili au imezuiwa." };
  }
  try {
    const method = (opts.method || "GET").toUpperCase();
    const { ok, status, text } = await fetchText(url, {
      method,
      headers: {
        "User-Agent": "ETUZA-HUB-Agent/1.0",
        Accept: "application/json, text/plain, */*",
        ...(opts.headers || {}),
      },
      body: method !== "GET" && opts.body ? opts.body : undefined,
    });
    return {
      tool: "http_request",
      ok,
      summary: ok ? `HTTP ${status} OK` : `HTTP ${status}`,
      data: { url, status, body: text.slice(0, MAX_TEXT) },
    };
  } catch (e) {
    return {
      tool: "http_request",
      ok: false,
      summary: e instanceof Error ? e.message : "http fail",
    };
  }
}

export async function visitWeb(urlRaw: string): Promise<ToolResult> {
  const url = normalizeUrl(urlRaw);
  if (!url) return { tool: "visit_web", ok: false, summary: "URL batili." };
  try {
    const ex = await tavilyExtract([url]);
    if (ex.ok) {
      return {
        tool: "visit_web",
        ok: true,
        summary: ex.summary || "Page extracted",
        data: { url, body: ex.body, source: "tavily" },
      };
    }
    const { ok, status, text, finalUrl } = await fetchText(url, {
      headers: { "User-Agent": "ETUZA-HUB-Agent/1.0" },
    });
    const title = extractTitle(text);
    const body = stripHtml(text).slice(0, MAX_TEXT);
    return {
      tool: "visit_web",
      ok,
      summary: ok ? title || finalUrl : `HTTP ${status}`,
      data: { url: finalUrl, title, body },
    };
  } catch (e) {
    return {
      tool: "visit_web",
      ok: false,
      summary: e instanceof Error ? e.message : "visit fail",
    };
  }
}

export async function webSearch(query: string): Promise<ToolResult> {
  const q = query.trim().slice(0, 200);
  if (!q) return { tool: "web_search", ok: false, summary: "Query tupu." };
  try {
    const tav = await tavilySearch(q, { maxResults: 6 });
    if (tav.ok) {
      return {
        tool: "web_search",
        ok: true,
        summary: tav.summary,
        data: { query: q, source: "tavily", body: tav.body },
      };
    }
    return {
      tool: "web_search",
      ok: false,
      summary: tav.summary || "Search imeshindwa",
    };
  } catch (e) {
    return {
      tool: "web_search",
      ok: false,
      summary: e instanceof Error ? e.message : "search fail",
    };
  }
}

export async function runAiToolsForMessage(
  message: string,
  opts?: { mode?: "hub" | "agent" }
): Promise<{ block: string; results: ToolResult[] }> {
  const mode = opts?.mode || "hub";
  const url = extractUrlFromText(message);
  const force = mode === "agent";
  const want =
    force ||
    wantsWebTool(message) ||
    wantsImageGen(message) ||
    (mode === "agent" && message.trim().length >= 3) ||
    (mode === "agent" &&
      (wantsTerminal(message) ||
        wantsEmbed(message) ||
        wantsInference(message) ||
        wantsImageGen(message)));

  if (!want) {
    return { block: "", results: [] };
  }

  const results: ToolResult[] = [];

  if (url) {
    const preferHttp =
      /\b(api|json|http_request|endpoint)\b/i.test(message) ||
      /\/api\//i.test(url);
    if (preferHttp) results.push(await httpRequest({ url }));
    else results.push(await visitWeb(url));
  }

  if (mode === "agent" || (!url && wantsWebTool(message))) {
    if (mode === "agent" || force || wantsWebTool(message)) {
      const q = message
        .replace(
          /^(tafuta|search|google|nisaidie|niambie|eleza|nani\s+ni)\s+/i,
          ""
        )
        .trim()
        .slice(0, 200);
      const tav = await tavilySearch(q || message, { maxResults: 6 });
      if (tav.ok) {
        let body = tav.body;
        if (tav.results[0]?.url) {
          const ex = await tavilyExtract([tav.results[0].url]);
          if (ex.ok) body = (body + "\n\n" + ex.body).slice(0, 14000);
        }
        results.push({
          tool: "web_search",
          ok: true,
          summary: tav.summary,
          data: { query: q || message, source: "tavily", body },
        });
      } else {
        results.push(await webSearch(q || message));
      }
    }
  }

  if (mode === "agent" && wantsEmbed(message)) {
    results.push(await embedTool(message));
    results.push(await semanticContentSearch(message));
  }

  if (
    mode === "agent" &&
    force &&
    !wantsEmbed(message) &&
    /movie|filamu|miziki|music|tv|tamthilia|vpn|game/i.test(message)
  ) {
    results.push(await semanticContentSearch(message));
  }

  if (wantsImageGen(message) || (mode === "agent" && /\b(picha|image)\b/i.test(message))) {
    results.push(await generateImageHorde(extractImagePrompt(message)));
  }

  if (mode === "agent" && wantsInference(message)) {
    results.push(inferenceScaffold(message));
    const ctx = results
      .map((r) => r.summary + " " + (r.data?.body || r.data?.text || ""))
      .join("\n")
      .slice(0, 4000);
    results.push(await runInferencePass(message, ctx));
  }

  if (mode === "agent" && wantsTerminal(message)) {
    const cmd = extractCommand(message) || "node -v";
    results.push(await runTerminal(cmd));
  }

  if (!results.length) {
    return { block: "", results: [] };
  }

  const block =
    "\n=== TOOL RESULTS (LAZIMA tumia) ===\n" +
    results
      .map((r) => {
        let s = `### ${r.tool} — ${r.ok ? "OK" : "FAIL"}\n${r.summary}\n`;
        if (r.data) {
          if (r.data.title) s += `Title: ${r.data.title}\n`;
          if (r.data.url) s += `URL: ${r.data.url}\n`;
          if (r.data.query) s += `Query: ${r.data.query}\n`;
          if (r.data.source) s += `Source: ${r.data.source}\n`;
          if (r.data.command) s += `Command: ${r.data.command}\n`;
          if (r.data.stdout) s += `stdout:\n${String(r.data.stdout)}\n`;
          if (r.data.imageUrl) s += `ImageURL: ${r.data.imageUrl}\n`;
          if (r.data.prompt) s += `ImagePrompt: ${r.data.prompt}\n`;
          if (r.data.body) s += `${String(r.data.body).slice(0, 9000)}\n`;
          if (r.data.text) s += `${String(r.data.text).slice(0, 9000)}\n`;
        }
        return s;
      })
      .join("\n") +
    "\n=== MWISHO TOOLS ===\nLAZIMA: jibu kutoka data hii. USIBAHATISHE. Kama haitoshi sema wazi.\n";

  return { block, results };
}
