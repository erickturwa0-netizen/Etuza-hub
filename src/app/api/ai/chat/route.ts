import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureUserSchema } from "@/lib/db-migrate";
import { randomUUID } from "crypto";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_BASE = `Wewe ni msaidizi rasmi wa ETUZA HUB (https://etuza-hub-v2.vercel.app) — Tanzania.
Jibu kwa Kiswahili rahisi, rafiki, na SAHIHI. Kiingereza tu mteja akitaka.

=== SHERIA KUU (LAZIMA) ===
1. JIBU kila swali kwa uwezo wako — USIKATAE bila sababu nzito.
2. USISEME "Samahani, siwezi" au "I can't help" kwa maswali ya kawaida (movies, TV, radio, point, VPN, jinsi ya kutumia site).
3. Kama huna data kamili, bado TOA msaada: elekeza kurasa (/movies, /tv, /music, /radio, /account) au ufafanuzi wa jinsi site inavyofanya kazi.
4. Usizushe content isiyopo kwenye database — lakini unaweza kutoa msaada wa jumla.

=== SALAMU ===
Salamu (habari, hujambo, mambo, hi, hello…) → jibu kwa urafiki. Usikatae.

=== MTINDO ===
- Nafasi kati ya sentensi; Markdown: **bold**, *italic*, # titles, orodha -, links.
- Aya fupi, wazi.

=== POINT ===
Zinakatwa TU baada ya video kuanza. Ads: zima VPN kisha jaribu tena.

=== USALAMA ===
Usitoe cracking, passwords za watu, au maelekezo ya uhalifu. Kwa mengine yote ya site — jibu.`;

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
- **Movies** na **Tamthilia**
- **TV channels** na **Radio**
- **Miziki** na **Games**
- **Point**, ads na **VPN**
- Jinsi ya kutumia site

*Uliza chochote* — niko hapa.`;

/** Local helpful replies when API key missing or upstream fails */
function localHelpReply(message: string): string {
  const m = message.toLowerCase();
  if (/point|poin|pointi/.test(m)) {
    return `**Kuhusu Point**

- Unapata point wakati wa **signup**, **invite**, na **ads**.
- Point zinakatwa **baada ya video kuanza** (si kabla).
- Ads hazifunguki? **Zima VPN** kisha jaribu tena.
- Angalia akaunti yako: [/account](https://etuza-hub-v2.vercel.app/account)`;
  }
  if (/vpn/.test(m)) {
    return `**VPN**

Fungua sehemu ya VPN kwenye site au angalia content aina ya VPN kwenye Admin catalog.
Kama unatafuta config, nenda kwenye kurasa za VPN zilizochapishwa kwenye hub.`;
  }
  if (/movie|filamu|sinema/.test(m)) {
    return `**Movies**

Tembelea: [/movies](https://etuza-hub-v2.vercel.app/movies)
Unaweza kutafuta jina la filamu kwenye chat — nitatafuta kwenye database yetu.`;
  }
  if (/tv|channel|chanel/.test(m)) {
    return `**TV Channels**

Tembelea: [/tv](https://etuza-hub-v2.vercel.app/tv)
Kuna maelfu ya channels — chagua group kisha play.`;
  }
  if (/radio/.test(m)) {
    return `**Radio**

Tembelea: [/radio](https://etuza-hub-v2.vercel.app/radio)`;
  }
  if (/music|miziki|nyimbo/.test(m)) {
    return `**Miziki**

Tembelea: [/music](https://etuza-hub-v2.vercel.app/music)
Kuna tabs: Video, Bongo, Dini, 2026, Free MP3.`;
  }
  if (/tamthilia|drama|series/.test(m)) {
    return `**Tamthilia / Drama**

Tembelea: [/drama](https://etuza-hub-v2.vercel.app/drama) au sehemu ya drama kwenye site.`;
  }
  return `**Karibu ETUZA HUB**

Naweza kukusaidia kuhusu movies, TV, radio, miziki, point na VPN.

Jaribu:
- [/movies](https://etuza-hub-v2.vercel.app/movies)
- [/tv](https://etuza-hub-v2.vercel.app/tv)
- [/music](https://etuza-hub-v2.vercel.app/music)
- [/radio](https://etuza-hub-v2.vercel.app/radio)
- [/account](https://etuza-hub-v2.vercel.app/account)

Uliza swali tena kwa undani zaidi.`;
}

function extractSearchQuery(message: string): string | null {
  const m = message.trim();
  if (m.length < 2) return null;
  if (isGreeting(m)) return null;

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
    const items = await prisma.content.findMany({
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
    return items;
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
    // table may not exist yet on first deploy — ignore
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

  // Always answer greetings even without API key
  if (isGreeting(message)) {
    void logAiUsage({ sessionId, userId, kind: "greeting" });
    return NextResponse.json({ reply: GREETING_REPLY, searched: null });
  }

  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json(
      { reply: localHelpReply(message), searched: null },
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
        "\n=== MWISHO ===\nTumia hii orodha. Usizushe vingine.";
    } else {
      researchBlock = `\n\n=== DATABASE ===\nHakuna matokeo kwa "${q}". Usizushe jina. Saidia kwa kurasa za site na jinsi ya kutafuta.\n`;
    }
  }

  const system = SYSTEM_BASE + researchBlock;

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
        temperature: 0.55,
        max_tokens: 1400,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("inception", res.status, data);
      void logAiUsage({ sessionId, userId, kind: "fallback" });
      return NextResponse.json({
        reply: localHelpReply(message),
        searched: q || null,
      });
    }

    let reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "";
    reply = String(reply).trim();

    // If model still refuses with empty/samahani-only, use local help
    const refuse =
      !reply ||
      /^(samahani[,.]?\s*)+$/i.test(reply) ||
      /siwezi (kujibu|kusaidia|kutoa)/i.test(reply.slice(0, 120));
    if (refuse) {
      reply = localHelpReply(message);
      void logAiUsage({ sessionId, userId, kind: "fallback" });
    } else {
      void logAiUsage({ sessionId, userId, kind: "chat" });
    }

    return NextResponse.json({
      reply,
      searched: q || null,
    });
  } catch (e) {
    console.error("ai chat", e);
    void logAiUsage({ sessionId, userId, kind: "fallback" });
    return NextResponse.json({
      reply: localHelpReply(message),
    });
  }
}
