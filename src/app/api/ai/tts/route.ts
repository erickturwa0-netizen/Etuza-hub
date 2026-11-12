import { NextResponse } from "next/server";
import { nicevoiceTts } from "@/lib/ai-tts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { text?: string; voice?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON batili" }, { status: 400 });
  }

  const text = String(body.text || "").trim();
  const voice = String(body.voice || "elevenlabs-adam").slice(0, 64);
  if (!text) {
    return NextResponse.json({ error: "Maandishi yanahitajika" }, { status: 400 });
  }

  const result = await nicevoiceTts(text, voice);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "TTS imeshindwa" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    audioUrl: result.audioUrl,
  });
}
