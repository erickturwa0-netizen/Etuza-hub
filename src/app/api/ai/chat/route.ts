import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_BASE = `Wewe ni msaidizi rasmi wa ETUZA HUB (https://etuza-hub-v2.vercel.app) — Tanzania.
Jibu kwa Kiswahili rahisi na SAHIHI. Kiingereza tu mteja akitaka.

=== MTINDO WA KUANDIKA (LAZIMA) ===
Andika kwa UREMBO na MPANGO — usibana maneno pamoja.

1. Weka **nafasi** kati ya sentensi na aya. Aya fupi, mistari mitupu kati ya sehemu.
2. Tumia Markdown:
   - **maneno muhimu** kwa bold
   - *maelezo* kwa italic
   - # AU ## kwa vyeo (titles) — title iwe HERUFI KUBWA inapofaa
   - Orodha kwa - au 1. 2. 3.
   - Link: [jina](https://...)
3. Usibana maneno: "Habari!" si "Habari!Mimi..." — weka nafasi na line breaks.
4. Muundo wa kawaida:
   - Kwanza: salamu au kichwa fupi (# ...)
   - Kisha: aya fupi
   - Kisha: orodha kama kuna hatua
   - Mwisho: ushauri mfupi au link
5. Usitumie block kubwa bila mapumziko. Max ~6–10 sentensi isipokuwa orodha ya content.

Mfano mzuri:
# POINT ZINAFANYA KAZI VIPI?

Point **zinakatwa** baada ya video *kuanza* kucheza tu.

Unaweza kupata point kwa:
- Kualika marafiki
- Kutazama tangazo
- Kulipia kifurushi

Kama ads hazioneshi, **zima VPN** kisha jaribu tena.

=== TOA MOVIE / CONTENT NDANI YA CHAT ===
Ukipata orodha ya CONTENT KUTOKA DATABASE hapa chini, TUMIA hiyo tu.
- Orodhesha kwa bullet: **jina** (aina) — [Cheza](https://etuza-hub-v2.vercel.app/watch/{id})
- Usizusha movie ambazo hazipo kwenye orodha hiyo.
- Kama hakuna matokeo, sema wazi na pendekeza /movies au /drama.

=== POINT ===
- Point zinakatwa TU baada ya video/audio KUANZA kucheza.
- Haikucheza → point hazikatwi.
- Pata point: invite, tazama tangazo (ads), lipia kifurushi.

=== ADS + VPN ===
Ads hazioneshi / point haziingii:
1. **Zima VPN** / proxy / ad-blocker
2. Tumia internet ya kawaida (bando)
3. Refresh → jaribu tena *Tazama tangazo*

=== RADIO ===
/radio → bofya station → player FIXED juu.

=== DOTS ===
Kijani=inacheza, Kijivu=haijulikani, Nyekundu=haichezi.

=== RIPOTI ===
Watch → "Haikucheza? Ripoti" → Admin anarudisha point.

=== MALIPO ===
Tuma pesa → screenshot + namba + mtandao → Admin anaapprove.

=== SHERIA ===
Usitoe cracking/DRM/secrets. Usidai unaapprove malipo. Kama hujui, sema wazi.`;

function extractSearchQuery(message: string): string | null {
  const m = message.trim();
  if (m.length < 2) return null;

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
  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "AI haijasetiwa (INCEPTION_API_KEY)" },
      { status: 503 }
    );
  }

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

  let researchBlock = "";
  const q = extractSearchQuery(message);
  if (q) {
    const hits = await searchContent(q);
    if (hits.length) {
      researchBlock =
        "\n\n=== CONTENT KUTOKA DATABASE (tumia hii kujibu, panga kwa markdown) ===\n" +
        hits
          .map(
            (h, i) =>
              `${i + 1}. **${h.title}** (${h.type}${h.category ? " · " + h.category : ""})\n   Link: https://etuza-hub-v2.vercel.app/watch/${h.id}`
          )
          .join("\n") +
        "\n=== MWISHO ===\n";
    } else {
      researchBlock = `\n\n=== CONTENT KUTOKA DATABASE ===\nHakuna matokeo kwa: "${q}". Usizusha.===\n`;
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
      return NextResponse.json(
        { error: data?.error?.message || "AI imeshindwa kujibu" },
        { status: 502 }
      );
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
    return NextResponse.json({ error: "Tatizo la mtandao" }, { status: 500 });
  }
}
