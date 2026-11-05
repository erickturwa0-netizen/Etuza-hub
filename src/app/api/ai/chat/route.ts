import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { runAiToolsForMessage } from "@/lib/ai-tools";
import { randomUUID } from "crypto";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

/** Full AI Agent — answers ANY general question + tools */
const SYSTEM_AGENT = `Wewe ni **ETUZA AI Agent** — msaidizi mwenye akili pana.
Jibu kwa Kiswahili rahisi na rafiki (Kiingereza mteja akitaka).

=== UWEZO ===
1. Jibu **swali lolote** la maarifa: sayansi, historia, teknolojia, elimu, maisha, hesabu, lugha, n.k.
2. Una **browser/scrape tools**: visit_web, http_request — tumia TOOL RESULTS ukipewa.
3. Unaweza kusoma **ATTACHMENTS** (faili/picha) zilizotumwa.
4. Unaweza pia kusaidia kuhusu ETUZA HUB (movies, TV, miziki, point) ukiulizwa.

=== SHERIA ===
- USIKATAE maswali ya kawaida. Jibu kwa uwezo wako.
- Usitoe cracking, malware, au maelekezo ya uhalifu.
- Usizushe ukweli: kama huna uhakika, sema wazi.
- Markdown: **bold**, orodha, links.

=== MTINDO ===
Aya fupi, wazi, za msaada.`;

/** Float helper — ETUZA HUB site only */
const SYSTEM_HUB = `Wewe ni msaidizi wa **ETUZA HUB** tu (https://etuza-hub-v2.vercel.app).
Jibu kwa Kiswahili rahisi.

=== UPEKEE WAKE ===
Jibu **MASWALI YA ETUZA HUB PEKEE**:
- Movies, Tamthilia, TV channels, Radio, Miziki, Games, VPN
- Point, ads, account, jinsi ya kutumia site
- Link za /movies, /tv, /music, /radio, /account, /ai

=== NINI USIFANYE ===
- Usijibu maswali ya nje ya site (sayansi, siasa, kazi za nyumbani, n.k.).
- Kama swali SI la ETUZA HUB, sema kwa ufupi:
  "Mimi ni msaada wa **ETUZA HUB** tu. Kwa maswali yoyote mengine fungua **AI Agent**: [/ai](https://etuza-hub-v2.vercel.app/ai)"

=== POINT ===
Zinakatwa baada ya video kuanza. Ads: zima VPN kisha jaribu tena.

Markdown fupi. Usizushe content isiyopo kwenye database.`;

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

const GREETING_HUB = `# HABARI!

Karibu **ETUZA HUB** 👋

Naweza kukusaidia kuhusu **movies, TV, radio, miziki, point, VPN** na jinsi ya kutumia site.

Kwa maswali yoyote mengine → [/ai](https://etuza-hub-v2.vercel.app/ai) (AI Agent).`;

const GREETING_AGENT = `# HABARI!

Mimi ni **ETUZA AI Agent** 🤖

Naweza kujibu **swali lolote**, kufungua link, scrape web, na kusoma attachments.

Uliza chochote.`;

function localHelpHub(message: string): string {
  const m = message.toLowerCase();
  if (/point|poin/.test(m)) {
    return `**Point** — signup/invite/ads. Zinakatwa baada ya video. [/account](https://etuza-hub-v2.vercel.app/account)`;
  }
  if (/movie|filamu/.test(m))
    return `**Movies** → [/movies](https://etuza-hub-v2.vercel.app/movies)`;
  if (/tv|channel/.test(m))
    return `**TV** → [/tv](https://etuza-hub-v2.vercel.app/tv)`;
  if (/music|miziki/.test(m))
    return `**Miziki** → [/music](https://etuza-hub-v2.vercel.app/music)`;
  if (/radio/.test(m))
    return `**Radio** → [/radio](https://etuza-hub-v2.vercel.app/radio)`;
  if (/vpn/.test(m)) return `**VPN** — angalia sehemu ya VPN kwenye hub.`;
  // Off-topic for hub mode
  if (
    !/etuza|movie|filamu|tv|radio|miziki|music|point|vpn|game|tamthilia|drama|account|login|ads|tangazo/.test(
      m
    )
  ) {
    return `Mimi ni msaada wa **ETUZA HUB** tu (movies, TV, miziki, point…).

Kwa swali lolote lingine fungua **AI Agent**:
[/ai](https://etuza-hub-v2.vercel.app/ai)`;
  }
  return `**ETUZA HUB** — [/movies](https://etuza-hub-v2.vercel.app/movies) · [/tv](https://etuza-hub-v2.vercel.app/tv) · [/music](https://etuza-hub-v2.vercel.app/music) · [/ai](https://etuza-hub-v2.vercel.app/ai)`;
}

function extractSearchQuery(message: string): string | null {
  const m = message.trim();
  if (
    m.length < 2 ||
    isGreeting(m) ||
    /https?:\/\//i.test(m) ||
    /ATTACHMENTS/i.test(m)
  )
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
  /** hub = float (site only); agent = full AI */
  let mode: "hub" | "agent" = "hub";

  try {
    const body = await req.json();
    message = String(body?.message || "").trim().slice(0, 2000);
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
          attLines.push(
            `--- IMAGE ATTACHED: ${name} (${type}) ---\n[Picha imepakiwa, size=${String(a.dataUrl).length} chars.]\n---`
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
      reply: mode === "agent" ? GREETING_AGENT : GREETING_HUB,
      searched: null,
      tools: [],
      mode,
    });
  }

  // Tools: agent always; hub only if clearly a URL/scrape for site help
  let toolBlock = "";
  let toolMeta: { tool: string; ok: boolean; summary: string }[] = [];
  try {
    if (mode === "agent" || /https?:\/\//i.test(message)) {
      const ran = await runAiToolsForMessage(message);
      toolBlock = ran.block;
      toolMeta = ran.results.map((r) => ({
        tool: r.tool,
        ok: r.ok,
        summary: r.summary,
      }));
    }
  } catch (e) {
    console.error("ai tools", e);
  }

  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    if (toolBlock && mode === "agent") {
      return NextResponse.json({
        reply:
          `**Nimesoma link / data:**\n\n` +
          toolMeta.map((t) => `- ${t.tool}: ${t.summary}`).join("\n"),
        tools: toolMeta,
        mode,
      });
    }
    return NextResponse.json({
      reply:
        mode === "agent"
          ? "AI Agent inahitaji INCEPTION_API_KEY. Weka kwenye Vercel env."
          : localHelpHub(message),
      searched: null,
      tools: [],
      mode,
    });
  }

  let researchBlock = "";
  // Catalog search mainly for hub mode (and agent if about content)
  const q =
    mode === "hub" ||
    /movie|filamu|tv|radio|miziki|music|tamthilia|drama|etuza/i.test(message)
      ? extractSearchQuery(message)
      : null;
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
    } else if (mode === "hub") {
      researchBlock = `\n\n=== DATABASE ===\nHakuna matokeo kwa "${q}".\n`;
    }
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
        temperature: mode === "agent" ? 0.6 : 0.45,
        max_tokens: mode === "agent" ? 2000 : 1200,
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
          mode,
        });
      }
      return NextResponse.json({
        reply:
          mode === "agent"
            ? "Samahani, model haikujibu. Jaribu tena."
            : localHelpHub(message),
        searched: q || null,
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
      /siwezi (kujibu|kusaidia|kutoa)/i.test(reply.slice(0, 120));
    if (refuse) {
      reply = toolBlock
        ? `Nimefungua / kusoma data:\n` +
          toolMeta.map((t) => `- ${t.summary}`).join("\n")
        : mode === "agent"
          ? "Jaribu kuuliza tena kwa undani zaidi."
          : localHelpHub(message);
      void logAiUsage({
        sessionId,
        userId,
        kind: toolBlock ? "tool" : "fallback",
      });
    } else {
      void logAiUsage({
        sessionId,
        userId,
        kind: mode === "agent" ? "agent_chat" : "hub_chat",
      });
    }

    return NextResponse.json({
      reply,
      searched: q || null,
      tools: toolMeta,
      mode,
    });
  } catch (e) {
    console.error("ai chat", e);
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json({
      reply:
        mode === "agent"
          ? "Tatizo la mtandao. Jaribu tena."
          : localHelpHub(message),
      tools: toolMeta,
      mode,
    });
  }
}
