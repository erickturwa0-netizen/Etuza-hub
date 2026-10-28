import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_BASE = `Wewe ni msaidizi rasmi wa ETUZA HUB (https://etuza-hub-v2.vercel.app) — Tanzania.
Jibu kwa Kiswahili rahisi na SAHIHI. Kiingereza tu mteja akitaka.

=== SALAMU (LAZIMA) ===
Ukipokea salamu (habari, hujambo, mambo, hi, hello, vipi, za asubuhi, n.k.) JIBU kwa urafiki.
USIKATAE salamu. Usiseme "siwezi". Jibu mfano:

# HABARI!

Karibu *ETUZA HUB*. Unaweza kuniuliza kuhusu **movies**, **TV**, **radio**, **point** au **VPN**.

=== MTINDO WA KUANDIKA (LAZIMA) ===
Andika kwa UREMBO na MPANGO — usibana maneno pamoja.
1. Weka **nafasi** kati ya sentensi na aya.
2. Tumia Markdown: **bold**, *italic*, # titles, orodha -, links.
3. Usibana maneno. Aya fupi + line breaks.

=== CONTENT KUTOKA DATABASE ===
Ukipata orodha hapa chini, tumia hiyo tu. Usizusha.

=== POINT ===
Zinakatwa TU baada ya video kuanza. Ads: zima VPN kisha jaribu tena.

=== SHERIA ===
Usitoe cracking/secrets. Kama hujui, sema wazi.`;

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
- **Point**, ads na **VPN**
- Jinsi ya kutumia site

*Uliza chochote* — niko hapa.`;

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

export async function POST(req: Request) {
  let message = "";
  let history: { role: string; content: string }[] = [];
  try {
    const body = await req.json();
    message = String(body?.message || "").trim().slice(0, 2000);
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

  // Always answer greetings even without API key
  if (isGreeting(message)) {
    return NextResponse.json({ reply: GREETING_REPLY, searched: null });
  }

  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        reply:
          "**Samahani**\n\nAI haijasetiwa kikamilifu sasa (*INCEPTION_API_KEY*).\n\nBado naweza kukusaidia kwa mambo ya msingi ya site: **/movies**, **/tv**, **/radio**, point na VPN.",
      },
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
      researchBlock = `\n\n=== DATABASE ===\nHakuna matokeo kwa "${q}". Usizusha.\n`;
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
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("inception", res.status, data);
      // Friendly fallback instead of hard error
      return NextResponse.json({
        reply:
          "**Samahani**, sijaweza kufikia AI sasa.\n\nJaribu tena baadaye, au tembelea:\n- [Movies](https://etuza-hub-v2.vercel.app/movies)\n- [TV](https://etuza-hub-v2.vercel.app/tv)\n- [Radio](https://etuza-hub-v2.vercel.app/radio)",
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "Samahani, sijapata jibu.";

    return NextResponse.json({
      reply: String(reply).trim(),
      searched: q || null,
    });
  } catch (e) {
    console.error("ai chat", e);
    return NextResponse.json({
      reply:
        "**Tatizo la mtandao.**\n\nJaribu tena baada ya sekunde chache.",
    });
  }
}
