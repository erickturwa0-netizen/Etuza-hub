/**
 * Embeddings + light inference helpers for ETUZA AI Agent.
 * Uses Inception OpenAI-compatible embeddings when available,
 * else a deterministic local bag-of-tokens vector (no external key).
 */

import { prisma } from "@/lib/prisma";

const ENDPOINT =
  process.env.EMBEDDING_API_URL ||
  "https://api.inceptionlabs.ai/v1/embeddings";
const EMBED_MODEL =
  process.env.EMBEDDING_MODEL || "text-embedding-3-small";

export type EmbedResult = {
  tool: string;
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

/** Simple tokenizer for local fallback embeddings */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 256);
}

/** Deterministic 64-dim bag vector (local, no API) */
export function localEmbed(text: string): number[] {
  const dim = 64;
  const v = new Array(dim).fill(0);
  const toks = tokens(text);
  if (!toks.length) return v;
  for (const t of toks) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dim;
    v[idx] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}

/** Try remote embeddings API; fallback to localEmbed */
export async function embedText(text: string): Promise<{
  vector: number[];
  source: "api" | "local";
  model: string;
}> {
  const input = text.trim().slice(0, 8000);
  const key = process.env.INCEPTION_API_KEY || process.env.OPENAI_API_KEY;

  if (key && input) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: EMBED_MODEL,
          input,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const vec = data?.data?.[0]?.embedding;
      if (res.ok && Array.isArray(vec) && vec.length > 8) {
        return {
          vector: vec.map((x: number) => Number(x)),
          source: "api",
          model: EMBED_MODEL,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return { vector: localEmbed(input), source: "local", model: "local-bow-64" };
}

export async function embedTool(text: string): Promise<EmbedResult> {
  if (!text.trim()) {
    return { tool: "embed", ok: false, summary: "Nakala tupu." };
  }
  try {
    const { vector, source, model } = await embedText(text);
    return {
      tool: "embed",
      ok: true,
      summary: `Embedding OK (${source}, ${model}, dim=${vector.length})`,
      data: {
        source,
        model,
        dimensions: vector.length,
        preview: vector.slice(0, 8).map((x) => Number(x.toFixed(5))),
        // full vector only for internal use — truncated in tool block
        vectorLen: vector.length,
      },
    };
  } catch (e) {
    return {
      tool: "embed",
      ok: false,
      summary: e instanceof Error ? e.message : "embed failed",
    };
  }
}

/** Semantic search over published content titles/descriptions */
export async function semanticContentSearch(
  query: string,
  take = 8
): Promise<EmbedResult> {
  const q = query.trim().slice(0, 500);
  if (!q) {
    return { tool: "semantic_search", ok: false, summary: "Query tupu." };
  }

  try {
    const { vector: qv, source } = await embedText(q);
    const rows = await prisma.content.findMany({
      where: { status: "published" },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        description: true,
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    const scored = rows
      .map((r) => {
        const blob = `${r.title} ${r.category || ""} ${r.description || ""} ${r.type}`;
        const score = cosine(qv, localEmbed(blob));
        return { ...r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, take);

    const lines = scored.map(
      (r, i) =>
        `${i + 1}. **${r.title}** (${r.type}) score=${r.score.toFixed(3)}\n   https://etuza-hub-v2.vercel.app/watch/${r.id}`
    );

    return {
      tool: "semantic_search",
      ok: scored.length > 0,
      summary: `Semantic search (${source}): ${scored.length} hits for "${q}"`,
      data: {
        query: q,
        source,
        body: lines.join("\n") || "Hakuna karibu.",
        hits: scored.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          score: r.score,
        })),
      },
    };
  } catch (e) {
    return {
      tool: "semantic_search",
      ok: false,
      summary: e instanceof Error ? e.message : "semantic search failed",
    };
  }
}

export function wantsEmbed(message: string): boolean {
  return /\b(embed|embedding|vector|semantic|embeddings)\b/i.test(message);
}

export function wantsInference(message: string): boolean {
  return /\b(inference|infer|reason|fikiria|changanua|analyze|analyse|step by step|hatua kwa hatua)\b/i.test(
    message
  );
}

/** Structured inference scaffold (fed into model as tool result) */
export function inferenceScaffold(message: string): EmbedResult {
  const steps = [
    "1. Elewa swali na lengo la mwisho.",
    "2. Orodhesha ukweli unaojulikana + assumptions.",
    "3. Chagua zana (web_search / semantic_search / terminal) kama zinahitajika.",
    "4. Fanya reasoning ya hatua kwa hatua (chain-of-thought fupi).",
    "5. Toa jibu la mwisho wazi + confidence.",
  ];
  return {
    tool: "inference",
    ok: true,
    summary: "Inference plan (multi-step)",
    data: {
      query: message.slice(0, 500),
      body:
        `=== INFERENCE PLAN ===\n` +
        steps.join("\n") +
        `\n\nSwali: ${message.slice(0, 800)}\n` +
        `Fuata plan hii kwenye jibu lako (hatua 1–5, kisha JIBU LA MWISHO).`,
    },
  };
}
