/**
 * Tavily web search + page extract (primary scrape for ETUZA AI Agent).
 * Keys: TAVILY_API_KEY (Vercel env). Optional WEB_SEARCH_API_KEY reserved.
 */

export type TavilyHit = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

function tavilyKey(): string {
  return (
    process.env.TAVILY_API_KEY ||
    process.env.TAVILY_KEY ||
    // fallback provided by project owner for agent tools
    "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"
  );
}

export async function tavilySearch(
  query: string,
  opts?: { maxResults?: number; depth?: "basic" | "advanced" }
): Promise<{
  ok: boolean;
  answer: string;
  results: TavilyHit[];
  summary: string;
  body: string;
}> {
  const q = query.trim().slice(0, 400);
  const key = tavilyKey();
  if (!q || !key) {
    return {
      ok: false,
      answer: "",
      results: [],
      summary: "Tavily: key au query haipo",
      body: "",
    };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: q,
        search_depth: opts?.depth || "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: opts?.maxResults ?? 6,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      answer?: string;
      results?: {
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }[];
      detail?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        answer: "",
        results: [],
        summary: `Tavily HTTP ${res.status}: ${data.error || data.detail || "fail"}`,
        body: "",
      };
    }

    const results: TavilyHit[] = (data.results || [])
      .map((r) => ({
        title: String(r.title || "").slice(0, 200),
        url: String(r.url || ""),
        content: String(r.content || "").slice(0, 2000),
        score: r.score,
      }))
      .filter((r) => r.url || r.content);

    const answer = String(data.answer || "").slice(0, 2500);
    const lines: string[] = [];
    if (answer) lines.push(`=== Tavily Answer ===\n${answer}`);
    if (results.length) {
      lines.push(
        "=== Tavily Results ===\n" +
          results
            .map(
              (r, i) =>
                `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`
            )
            .join("\n")
      );
    }
    const body = lines.join("\n\n").slice(0, 12000);
    return {
      ok: body.length > 30,
      answer,
      results,
      summary: body.length > 30
        ? `Tavily OK: "${q}" (${results.length} hits)`
        : `Tavily: hakuna data kwa "${q}"`,
      body,
    };
  } catch (e) {
    return {
      ok: false,
      answer: "",
      results: [],
      summary: e instanceof Error ? e.message : "tavily failed",
      body: "",
    };
  }
}

export async function tavilyExtract(urls: string[]): Promise<{
  ok: boolean;
  summary: string;
  body: string;
  pages: { url: string; content: string }[];
}> {
  const key = tavilyKey();
  const list = urls.map((u) => u.trim()).filter(Boolean).slice(0, 3);
  if (!key || !list.length) {
    return { ok: false, summary: "Tavily extract: URL/key haipo", body: "", pages: [] };
  }
  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, urls: list }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      results?: { url?: string; raw_content?: string; content?: string }[];
      failed_results?: unknown[];
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        summary: `Tavily extract HTTP ${res.status}`,
        body: "",
        pages: [],
      };
    }
    const pages = (data.results || []).map((r) => ({
      url: String(r.url || ""),
      content: String(r.raw_content || r.content || "").slice(0, 8000),
    }));
    const body = pages
      .map((p) => `=== Extract ${p.url} ===\n${p.content}`)
      .join("\n\n")
      .slice(0, 14000);
    return {
      ok: body.length > 40,
      summary: `Tavily extract: ${pages.length} page(s)`,
      body,
      pages,
    };
  } catch (e) {
    return {
      ok: false,
      summary: e instanceof Error ? e.message : "extract failed",
      body: "",
      pages: [],
    };
  }
}
