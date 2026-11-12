import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { runAiToolsForMessage } from "@/lib/ai-tools";
import {
  detectMediaTypes,
  extractMediaQuery,
  findPlayables,
  playablesBlock,
  type Playable,
} from "@/lib/ai-playables";
import { randomUUID } from "crypto";

export const maxDuration = 60;
export const runtime = "nodejs";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_AGENT = `Wewe ni **ETUZA AI Agent** wa ETUZA HUB.

=== KANUNI YA DATA (LAZIMA) ===
1. TOOL RESULTS ni chanzo cha ukweli. Kama zipo, JIBU kutoka hapo PEKEE kwa mambo ya ukweli (nani, nini, wapi, bei, habari).
2. USIBAHATISHE. Usitoe majina, tarehe, au takwimu usizoziona kwenye TOOL RESULTS au history.
3. Kama tools hazikupata data: sema wazi "Sijapata taarifa ya kutosha mtandaoni" + toa tip — USIJENGE hadithi.
4. PLAYABLES: waambie wabonyeze **Cheza**.
5. IMAGE_GEN: kama tool image_gen OK, sema picha imeundwa na ImageURL inaonyeshwa UI — usidai umeshindwa kama URL ipo.

=== MUUNDO WA JIBU ===
- Anza na jibu fupi moja kwa moja
- Bullet 2–5 kutoka sources
- Mwisho: sources (URL) kama zipo
- USIandike "hatua 1,2,3" za thinking isipokuwa user aliomba inference
`;

const SYSTEM_HUB = `Wewe ni **ETUZA HUB assistant** (float).
Jibu kwa Kiswahili fupi kuhusu ETUZA HUB: movies, TV, radio, miziki, point, VPN, account.
Usidanganye. Kama hutajui, sema.
`;

const GREETING_AGENT =
  "# HABARI!\n\nMimi ni **ETUZA AI Agent**. Nina **search mtandaoni** na **tengeneza picha** (Horde). Uliza chochote.";
const GREETING_HUB =
  "Habari! Mimi ni msaidizi wa **ETUZA HUB**. Naweza kukusaidia kuhusu movies, TV, radio, point, VPN.";

function isGreeting(m: string) {
  return /^(habari|hujambo|jambo|hello|hi|hey|mambo)[!.?\s]*$/i.test(m.trim());
}

async function logAiUsage(opts: {
  sessionId: string;
  userId?: string | null;
  kind: string;
}) {
  try {
    await ensureUserSchema();
    await prisma.aiUsage.create({
      data: {
        sessionId: opts.sessionId,
        userId: opts.userId || null,
        kind: opts.kind,
      },
    });
  } catch {
    /* ignore */
  }
}

function localHelpHub(message: string) {
  return "Ninaweza kukusaidia kuhusu ETUZA HUB (movies, TV, radio, point, account). Uliza swali maalum.";
}

async function searchContent(q: string) {
  try {
    return await prisma.content.findMany({
      where: {
        status: "published",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    return [];
  }
}

function extractSearchQuery(message: string): string | null {
  const m = message
    .replace(/^(tafuta|search|nipatie|nataka|naomba)\s+/i, "")
    .trim();
  return m.length >= 2 ? m.slice(0, 120) : null;
}

export async function POST(req: Request) {
  await ensureUserSchema();
  const session = await getSession();
  const userId = session?.userId || null;

  let body: {
    message?: string;
    mode?: string;
    sessionId?: string;
    history?: { role: string; content: string }[];
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON batili" }, { status: 400 });
  }

  const message = String(body.message || "").trim();
  const mode = body.mode === "agent" ? "agent" : "hub";
  const sessionId = String(body.sessionId || randomUUID()).slice(0, 80);
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

  if (!message) {
    return NextResponse.json({ error: "Message tupu" }, { status: 400 });
  }

  if (isGreeting(message) && !/ATTACHMENTS/i.test(message)) {
    void logAiUsage({ sessionId, userId, kind: "greeting" });
    return NextResponse.json({
      reply: mode === "agent" ? GREETING_AGENT : GREETING_HUB,
      searched: null,
      playables: [],
      tools: [],
      images: [],
      mode,
    });
  }

  let toolBlock = "";
  let images: string[] = [];
  let toolMeta: {
    tool: string;
    ok: boolean;
    summary: string;
    imageUrl?: string;
  }[] = [];
  try {
    const ran = await runAiToolsForMessage(message, { mode });
    toolBlock = ran.block;
    toolMeta = ran.results.map((r) => ({
      tool: r.tool,
      ok: r.ok,
      summary: r.summary,
      imageUrl:
        typeof r.data?.imageUrl === "string" ? r.data.imageUrl : undefined,
    }));
    images = toolMeta
      .map((t) => t.imageUrl)
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"));
  } catch (e) {
    console.error("ai tools", e);
  }

  let researchBlock = "";
  let playables: Playable[] = [];
  const mediaTypes = detectMediaTypes(message);
  const mediaQ =
    extractMediaQuery(message) ||
    (mode === "hub" ? extractSearchQuery(message) : null);

  const wantsMedia =
    mode === "agent" &&
    (mediaTypes === null ||
      (Array.isArray(mediaTypes) && mediaTypes.length > 0) ||
      /\b(movie|filamu|radio|tv|channel|miziki|music|tamthilia|drama|play|cheza|nipatie|nataka|naomba|stream|watch|tazama|sikiliza)\b/i.test(
        message
      ));

  if (wantsMedia || (mode === "hub" && mediaQ)) {
    playables = await findPlayables({
      query: mediaQ,
      types: mediaTypes && mediaTypes.length ? mediaTypes : null,
      take: 8,
    });
    if (playables.length) researchBlock = playablesBlock(playables);
  }

  if (!playables.length && mode === "hub") {
    const q = extractSearchQuery(message);
    if (q) {
      const hits = await searchContent(q);
      if (hits.length) {
        playables = hits.map((h) => ({
          id: h.id,
          title: h.title,
          type: h.type,
          category: h.category || null,
          coverUrl: h.coverUrl || null,
          watchUrl: `/watch/${h.id}`,
        }));
        researchBlock = playablesBlock(playables);
      }
    }
  }

  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json({
      reply: playables.length
        ? "Nimeleta hizi — bonyeza **Cheza**."
        : toolBlock
          ? "**Data kutoka tools (mtandaoni):**\n" +
            toolMeta.map((t) => `- **${t.tool}**: ${t.summary}`).join("\n")
          : mode === "agent"
            ? "INCEPTION_API_KEY haipo kwenye Vercel."
            : localHelpHub(message),
      searched: mediaQ || null,
      playables,
      tools: toolMeta,
      images,
      mode,
    });
  }

  const systemBase = mode === "agent" ? SYSTEM_AGENT : SYSTEM_HUB;
  const system = systemBase + researchBlock + toolBlock;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          ...history.map((h) => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: String(h.content || "").slice(0, 4000),
          })),
          { role: "user", content: message.slice(0, 8000) },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(55000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      void logAiUsage({ sessionId, userId, kind: "fallback" });
      return NextResponse.json({
        reply: playables.length
          ? "Nimeleta content — bonyeza **Cheza**."
          : toolMeta.length
            ? "**Data kutoka tools:**\n" +
              toolMeta.map((t) => `- ${t.summary}`).join("\n")
            : "AI haikujibu. Jaribu tena.",
        playables,
        tools: toolMeta,
        images,
        mode,
      });
    }
    const reply =
      data?.choices?.[0]?.message?.content ||
      (toolMeta.length
        ? toolMeta.map((t) => `- ${t.summary}`).join("\n")
        : "Sijapata jibu.");
    void logAiUsage({ sessionId, userId, kind: "chat" });
    return NextResponse.json({
      reply,
      searched: mediaQ || null,
      playables,
      tools: toolMeta,
      images,
      mode,
    });
  } catch (e) {
    console.error("ai chat", e);
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json({
      reply: toolMeta.length
        ? toolMeta.map((t) => `- ${t.summary}`).join("\n")
        : "Tatizo la mtandao kwa AI. Jaribu tena.",
      playables,
      tools: toolMeta,
      images,
      mode,
    });
  }
}
