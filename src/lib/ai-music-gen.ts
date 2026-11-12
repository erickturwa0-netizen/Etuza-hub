/**
 * Omegatech Sonu3 / Mureka AI music generation
 */
const BASE =
  process.env.OMEGATECH_MUSIC_API ||
  "https://api.omegatech.app/api/ai/sonu3";

export type MusicGenResult = {
  tool: "music_gen";
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

export function wantsMusicGen(message: string): boolean {
  const m = message.toLowerCase();
  return /\b(wimbo|song|music\s*gen|tengeneza\s+(wimbo|song|music)|generate\s+(a\s+)?(song|music|wimbo)|unda\s+wimbo|compose|beat|melody|sonu)\b/i.test(
    m
  );
}

export function extractMusicPrompt(message: string): string {
  let s = message
    .replace(
      /^(tafadhali\s+)?(tengeneza|unda|create|generate|compose)\s+(wimbo\s+(wa\s+)?|song\s+(about\s+)?|a\s+song\s+(about\s+)?|music\s+(about\s+)?)/i,
      ""
    )
    .replace(/\b(wimbo\s+wa|song\s+about)\b/i, "")
    .trim();
  if (s.length < 3) s = message.trim();
  return s.slice(0, 400);
}

export async function generateMusicSonu3(
  prompt: string
): Promise<MusicGenResult> {
  const p = (prompt || "").trim().slice(0, 400);
  if (!p) {
    return { tool: "music_gen", ok: false, summary: "Prompt tupu." };
  }

  try {
    const startUrl =
      BASE + "?action=generate&prompt=" + encodeURIComponent(p);
    const startRes = await fetch(startUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!startRes.ok) {
      return {
        tool: "music_gen",
        ok: false,
        summary: `Music start HTTP ${startRes.status}`,
      };
    }
    const start = (await startRes.json()) as {
      success?: boolean;
      taskId?: string;
      status?: string;
      error?: string;
    };
    const taskId = start.taskId;
    if (!taskId) {
      return {
        tool: "music_gen",
        ok: false,
        summary: start.error || "Music haikuanzisha task",
      };
    }

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 8000 : 5000));
      const resUrl =
        BASE + "?action=result&taskId=" + encodeURIComponent(taskId);
      const res = await fetch(resUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        status?: string;
        title?: string;
        url?: string;
        thumbnail?: string;
        lyrics?: string;
        duration?: number;
        tags?: string;
        prompt?: string;
      };
      if (data.status === "done" && data.url) {
        return {
          tool: "music_gen",
          ok: true,
          summary: `Wimbo uko tayari: "${data.title || p.slice(0, 40)}"`,
          data: {
            prompt: p,
            title: data.title || null,
            audioUrl: data.url,
            thumbnail: data.thumbnail || null,
            lyrics: data.lyrics || null,
            duration: data.duration || null,
            tags: data.tags || null,
            taskId,
            source: "omegatech-sonu3",
          },
        };
      }
      if (data.status === "failed" || data.status === "error") {
        return {
          tool: "music_gen",
          ok: false,
          summary: "Uundaji wa wimbo umeshindwa",
          data: { taskId },
        };
      }
    }

    return {
      tool: "music_gen",
      ok: false,
      summary:
        "Wimbo bado haujakamilika (inachukua ~90s). Jaribu tena baada ya dakika 1.",
      data: { taskId },
    };
  } catch (e) {
    return {
      tool: "music_gen",
      ok: false,
      summary: `Music gen error: ${e instanceof Error ? e.message : "fail"}`,
    };
  }
}
