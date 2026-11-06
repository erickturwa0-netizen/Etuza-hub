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

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_AGENT = `Wewe ni **ETUZA AI Agent** wa ETUZA HUB.

=== KANUNI YA DATA (LAZIMA) ===
1. TOOL RESULTS ni chanzo cha ukweli. Kama zipo, JIBU kutoka hapo PEKEE kwa mambo ya ukweli (nani, nini, wapi, bei, habari).
2. USIBAHATISHE. Usitoe majina, tarehe, au takwimu usizoziona kwenye TOOL RESULTS au history.
3. Kama tools hazikupata data: sema wazi "Sijapata taarifa ya kutosha mtandaoni" + toa tip — USIJENGE hadithi.
4. PLAYABLES: waambie wabonyeze **Cheza**.

=== MUUNDO WA JIBU ===
- Anza na jibu fupi moja kwa moja
- Bullet 2–5 kutoka sources
- Mwisho: sources (URL) kama zipo
- USIandike "hatua 1,2,3" za thinking isipokuwa user aliomba inference

=== LUGHA ===
Kiswahili rahisi. Markdown.`;

const SYSTEM_HUB = `Wewe ni msaidizi wa **ETUZA HUB** tu.
Maswali ya site pekee. Mingine → /ai.`;

function isGreeting(message: string): boolean {
  const m = message.trim().toLowerCase().replace(/[!?.]+$/g, "");
  if (m.length > 40) return false;
  const greets = [
    "habari", "hujambo", "jambo", "mambo", "vipi", "salama",
    "hello", "hi", "hey", "good morning", "good evening",
    "habari yako", "shikamoo", "asante", "thanks", "thank you",
  ];
  return greets.some(
    (g) => m === g || m.startsWith(g + " ") || m.endsWith(" " + g)
  );
}

const GREETING_HUB = "# HABARI!\n\nKaribu **ETUZA HUB**. Mingine → /ai";
const GREETING_AGENT =
  "# HABARI!\n\nMimi ni **ETUZA AI Agent**. Nina **search mtandaoni** (si kubahatisha). Uliza chochote — utaona hatua za tools.";

function localHelpHub(message: string): string {
  const m = message.toLowerCase();
  if (/point|poin/.test(m)) return "**Point** → /account";
  if (/movie|filamu/.test(m)) return "**Movies** → /movies";
  if (/tv|channel/.test(m)) return "**TV** → /tv";
  if (/music|miziki/.test(m)) return "**Miziki** → /music";
  return "**ETUZA HUB** → /ai kwa maswali ya nje";
}

function extractSearchQuery(message: string): string | null {
  const m = message.trim();
  if (m.length < 2 || isGreeting(m) || /https?:\/\//i.test(m)) return null;
  const patterns = [
    /(?:tafuta|search|nipatie|nataka|movie\s+ya|filamu\s+ya)(.+)/i,
    /(?:movie|filamu|tamthilia|drama|muziki|music|channel|tv)\s+(.+)/i,
  ];
  for (const re of patterns) {
    const hit = m.match(re);
    if (hit?.[1]) {
      const q = hit[1].replace(/[?!.]+$/g, "").trim();
      if (q.length >= 2 && q.length <= 80) return q;
    }
  }
  return null;
}

async function searchContent(q: string) {
  try {
    return await prisma.content.findMany({
      where: {
        status: "published",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        coverUrl: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  } catch {
    return [];
  }
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
        sessionId: opts.sessionId.slice(0, 80),
        userId: opts.userId || null,
        kind: opts.kind,
      },
    });
  } catch {
    /* ignore */
  }
}

export async function POST(req: Request) {
  let message = "";
  let history: { role: string; content: string }[] = [];
  let sessionId = "";
  let mode: "hub" | "agent" = "hub";

  try {
    const body = await req.json();
    message = String(body?.message || "").trim().slice(0, 8000);
    sessionId = String(body?.sessionId || "").trim().slice(0, 80);
    const rawMode = String(body?.mode || "hub").toLowerCase();
    mode = rawMode === "agent" || rawMode === "full" ? "agent" : "hub";

    if (Array.isArray(body?.attachments)) {
      const attLines: string[] = [];
      for (const a of body.attachments.slice(0, 4)) {
        const name = String(a?.name || "file").slice(0, 120);
        const type = String(a?.type || "").slice(0, 80);
        if (typeof a?.text === "string" && a.text.trim()) {
          attLines.push(
            `--- FILE: ${name} (${type}) ---\n${String(a.text).slice(0, 12000)}\n---`
          );
        } else if (
          typeof a?.dataUrl === "string" &&
          a.dataUrl.startsWith("data:")
        ) {
          attLines.push(`--- IMAGE: ${name} ---\n[Picha]\n---`);
        }
      }
      if (attLines.length) {
        message = (
          message +
          "\n\n=== ATTACHMENTS ===\n" +
          attLines.join("\n")
        ).slice(0, 16000);
      }
    }

    if (Array.isArray(body?.history)) {
      history = body.history
        .filter(
          (m: { role?: string; content?: string }) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .slice(-24)
        .map((m: { role: string; content: string }) => ({
          role: m.role,
          content: String(m.content).slice(0, 4000),
        }));
    }
  } catch {
    return NextResponse.json({ error: "Ombi batili" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Andika ujumbe" }, { status: 400 });
  }
  if (!sessionId) sessionId = randomUUID();

  let userId: string | null = null;
  try {
    const session = await getSession();
    userId = session?.userId || null;
  } catch {
    /* ignore */
  }

  if (isGreeting(message) && !/ATTACHMENTS/i.test(message)) {
    void logAiUsage({ sessionId, userId, kind: "greeting" });
    return NextResponse.json({
      reply: mode === "agent" ? GREETING_AGENT : GREETING_HUB,
      searched: null,
      playables: [],
      tools: [],
      mode,
    });
  }

  let toolBlock = "";
  let toolMeta: { tool: string; ok: boolean; summary: string }[] = [];
  try {
    const ran = await runAiToolsForMessage(message, { mode });
    toolBlock = ran.block;
    toolMeta = ran.results.map((r) => ({
      tool: r.tool,
      ok: r.ok,
      summary: r.summary,
    }));
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
      mode,
    });
  }

  const systemBase = mode === "agent" ? SYSTEM_AGENT : SYSTEM_HUB;
  const system = systemBase + researchBlock + toolBlock;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: message },
        ],
        temperature: mode === "agent" ? 0.35 : 0.45,
        max_tokens: mode === "agent" ? 3500 : 1200,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("inception", res.status, data);
      void logAiUsage({ sessionId, userId, kind: "fallback" });
      return NextResponse.json({
        reply: playables.length
          ? "Bonyeza **Cheza** hapa chini."
          : toolMeta.length
            ? "**Data kutoka tools:**\n" +
              toolMeta.map((t) => `- ${t.summary}`).join("\n")
            : "Model haikujibu. Jaribu tena.",
        playables,
        tools: toolMeta,
        mode,
      });
    }

    let reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "";
    reply = String(reply).trim();

    const refuse =
      !reply ||
      /^(samahani[,.]?\s*)+$/i.test(reply) ||
      /siwezi (kujibu|kusaidia|kutoa)/i.test(reply.slice(0, 120)) ||
      /database yangu/i.test(reply.slice(0, 200));

    if (refuse) {
      reply = playables.length
        ? "Nimepata hizi — bonyeza **Cheza**."
        : toolMeta.length
          ? "Kutoka mtandaoni:\n" +
            toolMeta.map((t) => `- ${t.summary}`).join("\n")
          : "Sijapata taarifa ya kutosha mtandaoni. Jaribu swali lingine.";
      void logAiUsage({ sessionId, userId, kind: "fallback" });
    } else {
      void logAiUsage({
        sessionId,
        userId,
        kind: mode === "agent" ? "agent_chat" : "hub_chat",
      });
    }

    return NextResponse.json({
      reply,
      searched: mediaQ || null,
      playables,
      tools: toolMeta,
      mode,
    });
  } catch (e) {
    console.error("ai chat", e);
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json({
      reply: "Tatizo la mtandao. Jaribu tena.",
      playables,
      tools: toolMeta,
      mode,
    });
  }
}
