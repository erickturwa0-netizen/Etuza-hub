import { NextResponse } from "next/server";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM = `Wewe ni msaidizi rasmi wa ETUZA HUB (etuza-hub-v2.vercel.app) — platform ya Tanzania: movies, TV, radio, muziki, tamthilia, games na VPN.
Jibu kwa Kiswahili rahisi, fupi na wazi. Tumia Kiingereza tu mteja akitaka.

=== SEHEMU ZA SITE ===
- Home: dashibodi, categories (Movies, TV, Tamthilia, Miziki, Radio, Games, VPN)
- /movies — filamu; /tv — TV channels; /drama — tamthilia; /music — muziki; /radio — radio stations; /games — michezo; /vpn — configs
- /watch/[id] — kucheza content
- Login / Sign in with Google
- Admin: /admin (Dashboard, Content, Add Content, Malipo, Ripoti, Users, Settings)

=== POINT ===
- User huanza na point chache.
- Point zinakatwa TU baada ya video/audio KUANZA kucheza (si wakati wa kufungua tu).
- Ikiwa haikucheza → point HAZIKATWI.
- Njia za kupata point: invite marafiki, tazama tangazo (ads), lipia kifurushi.
- Kama malipo + ads zimewashwa, dialog inaonesha: Invite, Tazama tangazo, Lipia kifurushi, Play.
- Kifurushi kilicholipiwa kinaweza kutoa point nyingi za muda (mf. package points) na kuruka ads hadi muda uishe.

=== MALIPO ===
- Admin anaweza kuwasha/zima malipo na kuweka namba ya kupokea (Vodacom, Airtel, Halotel, Mix by Yas).
- Mtumiaji hutuma pesa, anapakia screenshot ya muamala + namba aliyotuma nayo + mtandao.
- Admin anaona orodha kwenye /admin/payments na anaapprove.
- Content inaweza kuwa free, once, week, month, au timed; VPN ina packages (wiki/mwezi) zinazochaguliwa wakati wa kuongeza content.

=== RADIO ===
- Fungua /radio, bofya station.
- Player ni bar nyembamba FIXED juu — stations zinascroll, player HABAKI.
- Play/Pause + X kufunga.

=== ALAMA ZA CONTENT (dots) ===
- Dot KIJANI = stream inacheza (ok)
- Dot KIJIVU = bado haijulikani (unknown)
- Dot NYEKUNDU = haichezi (bad)
- Mpangilio: kijani juu (mpya kwanza) → kijivu → nyekundu chini.
- System inajaribu (probe) streams kiotomatiki wakati wa kufungua Movies/Tamthilia.
- Pia player inatiakiki status inapocheza au kushindwa.

=== RIPOTI HAICUCHEZA ===
- Kwenye watch page: kitufe "Haikucheza? Ripoti & rudisha point".
- Andika maelezo + pakia screenshot → tuma.
- Admin → /admin/reports → anaona ripoti na kitufe "Rudisha point".

=== AI CHAT (wewe) ===
- Kitufe cha violet chini kulia (MessageCircle).
- Chat ikifunguliwa, kitufe kikubwa cha float kinafichwa; funga kwa X ya header.
- Andika swali kwenye "Uliza kitu…" kisha Send.

=== LOGIN ===
- Sign in with Google (Firebase).
- User anaonekana kwenye admin baada ya kuingia.

=== SHERIA ===
- Usitoe ushauri haramu, cracking, DRM bypass, au stream za kulipia bila ruhusa.
- Usidai unaweza kurekebisha server au kuapprove malipo wewe mwenyewe — elekeza admin.
- Usitoe API keys au secrets.
- Kama hujui jibu, sema wazi na elekeza sehemu sahihi ya site.

Jibu kwa lugha ya msaada, hatua kwa hatua ikihitajika.`;

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
          { role: "system", content: SYSTEM },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.5,
        max_tokens: 900,
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

    return NextResponse.json({ reply: String(reply).trim() });
  } catch (e) {
    console.error("ai chat", e);
    return NextResponse.json({ error: "Tatizo la mtandao" }, { status: 500 });
  }
}
