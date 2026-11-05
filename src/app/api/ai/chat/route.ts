import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { runAiToolsForMessage } from "@/lib/ai-tools";
import { randomUUID } from "crypto";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_BASE = `Wewe ni msaidizi rasmi wa ETUZA HUB (https://etuza-hub-v2.vercel.app) — Tanzania.
Jibu kwa Kiswahili rahisi, rafiki, na SAHIHI. Kiingereza tu mteja akitaka.

=== UWEZO WA TOOLS ===
Una **browser/scrape tools** (server inafanya kazi):
- **visit_web**: fungua ukurasa wa web, soma title, text, links
- **http_request**: piga API/URL, pata JSON au text
Mtumiaji akituma link au kuomba "fungua / scrape / angalia site", matokeo yatakuwa kwenye TOOL RESULTS. Tumia kuyajibu.
Kama kuna ATTACHMENTS kwenye ujumbe, zisomwe na utumie kwenye jibu.

=== SHERIA KUU (LAZIMA) ===
1. JIBU kila swali kwa uwezo wako — USIKATAE bila sababu nzito.
2. USISEME "Samahani, siwezi" kwa maswali ya kawaida.
3. Usizushe content isiyopo kwenye database.
4. Usitoe cracking, passwords za watu, au maelekezo ya uhalifu.

=== MTINDO ===
Markdown: **bold**, *italic*, # titles, orodha -, links.

=== POINT ===
Zinakatwa TU baada ya video kuanza. Ads: zima VPN kisha jaribu tena.`;

function isGreeting(message: string): boolean {
  const m = message.trim().toLowerCase().replace(/[!?.]+$/g, "");
  if (m.length > 40) return false;
  const greets = [
    "habari", "hujambo", "jambo", "mambo", "vipi", "salama",
    "hello", "hi", "hey", "good morning", "good evening",
    "habari yako", "shikamoo", "asante", "thanks", "thank you",
  ];
  return greets.some((g) => m === g || m.startsWith(g + " ") || m.endsWith(" " + g));
}

const GREETING_REPLY = `# HABARI!\n\nKaribu **ETUZA HUB** 👋\n\nNaweza kukusaidia kuhusu movies, TV, radio, miziki, point, VPN, **browser/scrape** na **attachments**.`;

function localHelpReply(message: string): string {
  const m = message.toLowerCase();
  if (/point|poin/.test(m)) {
    return `**Point** — signup/invite/ads. Zinakatwa baada ya video. [/account](https://etuza-hub-v2.vercel.app/account)`;
  }
  if (/http|scrape|browse|link|web|attachment|faili/.test(m)) {
    return `**Browser / scrape / attachments**\n\nTuma link (https://...) au pakia faili kwenye [/ai](https://etuza-hub-v2.vercel.app/ai).`;
  }
  if (/movie|filamu/.test(m)) return `**Movies** → [/movies](https://etuza-hub-v2.vercel.app/movies)`;
  if (/tv|channel/.test(m)) return `**TV** → [/tv](https://etuza-hub-v2.vercel.app/tv)`;
  if (/music|miziki/.test(m)) return `**Miziki** → [/music](https://etuza-hub-v2.vercel.app/music)`;
  if (/radio/.test(m)) return `**Radio** → [/radio](https://etuza-hub-v2.vercel.app/radio)`;
  return `**Karibu ETUZA HUB** — movies, TV, miziki, AI agent: [/ai](https://etuza-hub-v2.vercel.app/ai)`;
}

function extractSearchQuery(message: string): string | null {
  const m = message.trim();
  if (m.length < 2 || isGreeting(m) || /https?:\/\//i.test(m) || /ATTACHMENTS/i.test(m))
    return null;
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
  if (m.length <= 48 && m.split(/\s+/).length <= 6) return m;
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
      select: { id: true, title: true, type: true, category: true, coverUrl: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  } catch (e) {
    console.error("ai content search", e);
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
  } catch (e) {
    console.error("ai usage log", e);
  }
}

export async function POST(req: Request) {
  let message = "";
  let history: { role: string; content: string }[] = [];
  let sessionId = "";
  try {
    const body = await req.json();
    message = String(body?.message || "").trim().slice(0, 2000);
    sessionId = String(body?.sessionId || "").trim().slice(0, 80);

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
          attLines.push(
            `--- IMAGE ATTACHED: ${name} (${type}) ---\n[Picha imepakiwa, size=${String(a.dataUrl).length} chars.]
---`
          );
        } else {
          attLines.push(`--- FILE META: ${name} (${type}) ---`);
        }
      }
      if (attLines.length) {
        message =
          message +
          "\n\n=== ATTACHMENTS ===\n" +
          attLines.join("\n") +
          "\n=== END ATTACHMENTS ===";
        message = message.slice(0, 16000);
      }
    }
    if (typeof body?.context === "string" && body.context.trim()) {
      message =
        `[Context section: ${String(body.context).slice(0, 40)}]\n` + message;
    }

    if (Array.isArray(body?.history)) {
      history = body.history
        .filter(
          (m: { role?: string; content?: string }) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .slice(-12)
        .map((m: { role: string; content: string }) => ({
          role: m.role,
          content: String(m.content).slice(0, 2000),
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
      reply: GREETING_REPLY,
      searched: null,
      tools: [],
    });
  }

  let toolBlock = "";
  let toolMeta: { tool: string; ok: boolean; summary: string }[] = [];
  try {
    const ran = await runAiToolsForMessage(message);
    toolBlock = ran.block;
    toolMeta = ran.results.map((r) => ({
      tool: r.tool,
      ok: r.ok,
      summary: r.summary,
    }));
  } catch (e) {
    console.error("ai tools", e);
  }

  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    if (toolBlock) {
      return NextResponse.json({
        reply:
          `**Nimesoma link / data:**\n\n` +
          toolMeta.map((t) => `- ${t.tool}: ${t.summary}`).join("\n") +
          `\n\nWeka INCEPTION_API_KEY kwa muhtasari bora.`,
        tools: toolMeta,
      });
    }
    return NextResponse.json({
      reply: localHelpReply(message),
      searched: null,
      tools: [],
    });
  }

  let researchBlock = "";
  const q = extractSearchQuery(message);
  if (q) {
    const hits = await searchContent(q);
    if (hits.length) {
      researchBlock =
        "\n\n=== CONTENT KUTOKA DATABASE ===\n" +
        hits
          .map(
            (h, i) =>
              `${i + 1}. **${h.title}** (${h.type})\n   https://etuza-hub-v2.vercel.app/watch/${h.id}`
          )
          .join("\n") +
        "\n=== MWISHO ===\n";
    } else {
      researchBlock = `\n\n=== DATABASE ===\nHakuna matokeo kwa "${q}".\n`;
    }
  }

  const system = SYSTEM_BASE + researchBlock + toolBlock;

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
        temperature: 0.5,
        max_tokens: 1600,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("inception", res.status, data);
      void logAiUsage({ sessionId, userId, kind: "fallback" });
      if (toolBlock) {
        return NextResponse.json({
          reply:
            `**Data kutoka web:**\n` +
            toolMeta.map((t) => `- **${t.tool}**: ${t.summary}`).join("\n"),
          tools: toolMeta,
          searched: q || null,
        });
      }
      return NextResponse.json({
        reply: localHelpReply(message),
        searched: q || null,
        tools: toolMeta,
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
      /siwezi (kujibu|kusaidia|kutoa)/i.test(reply.slice(0, 120));
    if (refuse) {
      reply = toolBlock
        ? `Nimefungua / kusoma data:\n` +
          toolMeta.map((t) => `- ${t.summary}`).join("\n")
        : localHelpReply(message);
      void logAiUsage({
        sessionId,
        userId,
        kind: toolBlock ? "tool" : "fallback",
      });
    } else {
      void logAiUsage({
        sessionId,
        userId,
        kind: toolBlock ? "tool_chat" : "chat",
      });
    }

    return NextResponse.json({
      reply,
      searched: q || null,
      tools: toolMeta,
    });
  } catch (e) {
    console.error("ai chat", e);
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json({
      reply: localHelpReply(message),
      tools: toolMeta,
    });
  }
}
