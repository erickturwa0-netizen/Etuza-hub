import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { runAiToolsForMessage } from "@/lib/ai-tools";
import { randomUUID } from "crypto";

 cons ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_BASE = `Wewe ni msaidizi rasmi wa ETUZA HUB (https://etuza-hub-v2.vercel.app) — Tanzania.
Jibu kwa Kiswahili rahisi, rafiki, na SAHIHI. Kiingereza tu mteja akitaka.

=== UWEZO WA TOOLS ===
Una **browser/scrape tools** (server inafanya kazi):
- **visit_web**: fungua ukurasa wa web, soma title, text, links
- **http_request**: piga API/URL, pata JSON au text
Mtumiaji akituma link au kuomba "fungua / scrape / angalia site", matokeo yatakuwa kwenye TOOL RESULTS. Tumia kuyajibu.

=== SHERIA KUU (LAZIMA) ===
1. JIBU kila swali kwa uwezo wako — USIKATAE bila sababu nzito.
2. USISEME "Samahani, siwezi" au "I can't help" kwa maswali ya kawaida (movies, TV, radio, point, VPN, web link).
3. Kama huna data kamili, bado TOA msaada: elekeza kurasa (/movies, /tv, /music, /radio, /account).
4. Usizushe content isiyopo kwenye database — lakini unaweza kutoa msaada wa jumla.
5. Usitoe cracking, passwords za watu, au maelekezo ya uhalifu.

=== SALAMU ===
Salamu → jibu kwa urafiki.

=== MTINDO ===
Markdown: **bold**, *italic*, # titles, orodha -, links. Aya fupi.

=== POINT ===
Zinakatwa TU baada ya video kuanza. Ads: zima VPN kisha jaribu tena.`;

function isGreeting(message: string): boolean {
  const m = message.trim().toLowerCase().replace(/[!?.]+$/g, "");
  if (m.length > 40) return false;
  const greets = [
    "habari",
    "hujambo",
    "jambo",
    "mambo",
    "vipi",
    "salama",
    "hello",
    "hi",
    "hey",
    "good morning",
    "good evening",
    "habari yako",
    "habari za asubuhi",
    "habari za jioni",
    "shikamoo",
    "asante",
    "thanks",
    "thank you",
  ];
  return greets.some((g) => m === g || m.startsWith(g + " ") || m.endsWith(" " + g));
}

const GREETING_REPLY = `# HABARI!

Karibu **ETUZA HUB** 👋

Naweza kukusaidia kuhusu:
- **Movies**, **TV**, **Radio**, **Miziki**
- **Point** na **VPN**
- **Kufungua / kusoma link** (browser + scrape)

*Uliza chochote* — niko hapa.`;

function localHelpReply(message: string): string {
  const m = message.toLowerCase();
  if (/point|poin|pointi/.test(m)) {
    return `**Kuhusu Point**

- Signup / invite / ads → point
- Zinakatwa baada ya video kuanza
- Ads? Zima VPN
- [/account](https://etuza-hub-v2.vercel.app/account)`;
  }
  if (/vpn/.test(m)) {
    return `**VPN** — angalia sehemu ya VPN kwenye hub / catalog.`;
  }
  if (/movie|filamu|sinema/.test(m)) {
    return `**Movies** → [/movies](https://etuza-hub-v2.vercel.app/movies)`;
  }
  if (/tv|channel|chanel/.test(m)) {
    return `**TV** → [/tv](https://etuza-hub-v2.vercel.app/tv)`;
  }
  if (/radio/.test(m)) {
    return `**Radio** → [/radio](https://etuza-hub-v2.vercel.app/radio)`;
  }
  if (/music|miziki|nyimbo/.test(m)) {
    return `**Miziki** → [/music](https://etuza-hub-v2.vercel.app/music)`;
  }
  if (/http|scrape|browse|link|web/.test(m)) {
    return `**Browser / scrape**

Tuma **link kamili** (https://...) nikusomee ukurasa au API.
Mfano: *Fungua https://example.com*`;
  }
  return `**Karibu ETUZA HUB**

Movies, TV, radio, miziki, point, VPN, na kusoma link za web.

- [/movies](https://etuza-hub-v2.vercel.app/movies)
- [/tv](https://etuza-hub-v2.vercel.app/tv)
- [/music](https://etuza-hub-v2.vercel.app/music)`;
}

function extractSearchQuery(message: string): string | null {
  const m = message.trim();
  if (m.length < 2) return null;
  if (isGreeting(m)) return null;
  if (/https?:\/\//i.test(m)) return null;

  const patterns = [
    /(?:tafuta|search|nipatie|nipa|naomba|nataka|nimesikia|ipo\s+movie|movie\s+ya|filamu\s+ya|tamthilia\s+ya|series\s+ya|wapi\s+)(.+)/i,
    /(?:una\s+)?(?:movie|filamu|tamthilia|drama|muziki|music|game|vpn|channel|tv)\s+(.+)/i,
    /^(.+?)\s+(?:ipo|inapatikana|inacheza)\??$/i,
  ];

  for (const re of patterns) {
    const hit = m.match(re);
    if (hit?.[1]) {
      const q = hit[1].replace(/[?!.]+$/g, "").trim();
      if (q.length >= 2 && q.length <= 80) return q;
    }
  }

  if (m.length <= 48 && !/[?]/.test(m) && m.split(/\s+/).length <= 6) {
    const lower = m.toLowerCase();
    const skip = [
      "habari",
      "hello",
      "hi",
      "point",
      "vipi",
      "asante",
      "thanks",
      "help",
      "msaada",
      "mambo",
      "hujambo",
    ];
    if (!skip.some((s) => lower === s || lower.startsWith(s + " "))) {
      return m;
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

  if (isGreeting(message)) {
    void logAiUsage({ sessionId, userId, kind: "greeting" });
    return NextResponse.json({ reply: GREETING_REPLY, searched: null, tools: [] });
  }

  // --- Tools: browser + http scrape ---
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
    // Still return tool results if any
    if (toolBlock) {
      return NextResponse.json({
        reply:
          `**Nimesoma link / data:**\n\n` +
          toolMeta.map((t) => `- ${t.tool}: ${t.summary}`).join("\n") +
          `\n\n(AI model haipo — nimepata data mbichi. Weka INCEPTION_API_KEY kwa muhtasari bora.)`,
        tools: toolMeta,
      });
    }
    return NextResponse.json(
      { reply: localHelpReply(message), searched: null, tools: [] },
      { status: 200 }
    );
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
            toolMeta.map((t) => `- **${t.tool}**: ${t.summary}`).join("\n") +
            `\n\nModel haikujibu — jaribu tena.`,
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
          toolMeta.map((t) => `- ${t.summary}`).join("\n") +
          `\n\nUliza swali mahususi kuhusu matokeo.`
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
