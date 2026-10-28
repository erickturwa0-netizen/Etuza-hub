import { NextResponse } from "next/server";

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

const SYSTEM = `Wewe ni msaidizi wa ETUZA HUB — platform ya movies, TV, radio, muziki, tamthilia, games na VPN (Tanzania).
Jibu kwa Kiswahili rahisi isipokuwa mteja aombe Kiingereza.
Saidia: jinsi ya kutumia site, point, malipo, radio, VPN, download, login.
Usitoe ushauri haramu. Usidai unaweza kucheza DRM au kutoa stream za kulipia bila ruhusa.
Jibu fupi na wazi.`;

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
        temperature: 0.6,
        max_tokens: 800,
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
