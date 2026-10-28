import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM_BASE = `Wewe ni msaidizi rasmi wa ETUZA HUB (https://etuza-hub-v2.vercel.app) — Tanzania.
Jibu kwa Kiswahili rahisi, fupi, sahihi. Kiingereza tu mteja akitaka.

=== TOA MOVIE / CONTENT NDANI YA CHAT ===
Ukipata orodha ya CONTENT KUTOKA DATABASE hapa chini, TUMIA hiyo tu.
- Orodhesha jina, aina (movie/tv/drama/music/radio/game/vpn), na link ya kucheza: https://etuza-hub-v2.vercel.app/watch/{id}
- Usizusha movie ambazo hazipo kwenye orodha hiyo.
- Kama hakuna matokeo, sema "Sijapata content hiyo kwenye ETUZA HUB" na pendekeza kutafuta kwenye /movies au /drama.

=== POINT ===
- Point zinakatwa TU baada ya video/audio KUANZA kucheza.
- Haikucheza → point hazikatwi.
- Pata point: invite marafiki, tazama tangazo (ads), lipia kifurushi.
- Dialog inaweza kuonyesha: Invite | Tazama tangazo | Lipia | Play.

=== ADS + VPN (MUHIMU) ===
Ikiwa tangazo (ads) HALIONESHI au point haziingii baada ya "tazama tangazo":
1. ZIMA VPN / proxy / Private DNS / ad-blocker
2. Tumia internet ya kawaida (bando la simu au WiFi bila VPN)
3. Refresh ukurasa, jaribu tena "Tazama tangazo"
Ads nyingi hazichezi kupitia VPN — hii ndiyo sababu ya kawaida.

=== RADIO ===
/radio → bofya station → player FIXED juu (haipandi na scroll).

=== DOTS ===
Kijani=inacheza, Kijivu=haijulikani, Nyekundu=haichezi.
Mpangilio: kijani juu → kijivu → nyekundu chini.

=== RIPOTI ===
Watch page → "Haikucheza? Ripoti & rudisha point" → screenshot → Admin /admin/reports anarudisha point.

=== MALIPO ===
Tuma pesa kwenye namba ya admin → screenshot + namba + mtandao → Admin anaapprove.

=== SHERIA ===
Usitoe cracking/DRM/stream za kulipia bila ruhusa. Usitoe secrets. Usidai unaapprove malipo wewe.
Kama hujui, sema wazi.`;

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

  // Short messages that look like a title search
  if (m.length <= 48 && !/[?]/.test(m) && m.split(/\s+/).length <= 6) {
    const lower = m.toLowerCase();
    const skip = ["habari", "hello", "hi", "point", "vipi", "asante", "thanks", "help", "msaada"];
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

  // Research: search catalog when user asks for content
  let researchBlock = "";
  const q = extractSearchQuery(message);
  if (q) {
    const hits = await searchContent(q);
    if (hits.length) {
      researchBlock =
        "\n\n=== CONTENT KUTOKA DATABASE (tumia hii kujibu) ===\n" +
        hits
          .map(
            (h, i) =>
              `${i + 1}. [${h.type}] ${h.title}${h.category ? " (" + h.category + ")" : ""}\n   Link: https://etuza-hub-v2.vercel.app/watch/${h.id}`
          )
          .join("\n") +
        "\n=== MWISHO WA DATABASE ===\n";
    } else {
      researchBlock = `\n\n=== CONTENT KUTOKA DATABASE ===\nHakuna matokeo kwa utafutaji: "${q}". Usizusha.===\n`;
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
        temperature: 0.45,
        max_tokens: 1000,
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
