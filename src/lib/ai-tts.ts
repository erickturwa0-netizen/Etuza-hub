/**
 * Omegatech Nicevoice TTS (text → mp3)
 * Never expose account/token to the client.
 */
const BASE =
  process.env.OMEGATECH_TTS_API ||
  "https://api.omegatech.app/api/ai/Nicevoice";

export type TtsResult = {
  ok: boolean;
  audioUrl?: string;
  error?: string;
  remainingDailyTasks?: number;
};

function cleanTextForSpeech(raw: string): string {
  let s = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#>*_~]/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, 800);
}

export async function nicevoiceTts(
  text: string,
  voice = "elevenlabs-adam"
): Promise<TtsResult> {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned || cleaned.length < 2) {
    return { ok: false, error: "Maandishi ni mafupi sana kwa sauti" };
  }

  try {
    const startUrl =
      BASE +
      "?action=tts&voice=" +
      encodeURIComponent(voice) +
      "&text=" +
      encodeURIComponent(cleaned);

    const startRes = await fetch(startUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!startRes.ok) {
      return { ok: false, error: `TTS start HTTP ${startRes.status}` };
    }
    const start = (await startRes.json()) as {
      success?: boolean;
      data?: {
        taskSn?: string;
        account?: string;
        token?: string;
        remainingDailyTasks?: number;
        audioUrl?: string;
        pending?: boolean;
      };
      error?: string;
    };
    if (!start.success || !start.data?.taskSn) {
      return {
        ok: false,
        error: start.error || "TTS haikuanzisha task",
      };
    }

    const { taskSn, account, token, remainingDailyTasks } = start.data;
    if (start.data.audioUrl) {
      return {
        ok: true,
        audioUrl: start.data.audioUrl,
        remainingDailyTasks,
      };
    }

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 2000 : 2500));
      const q = new URLSearchParams({
        action: "result",
        taskSn: taskSn!,
        wait: "true",
      });
      if (account) q.set("account", account);
      if (token) q.set("token", token);
      const pollRes = await fetch(BASE + "?" + q.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });
      if (!pollRes.ok) continue;
      const poll = (await pollRes.json()) as {
        data?: {
          pending?: boolean;
          audioUrl?: string | null;
          statusStr?: string;
        };
      };
      const audio = poll.data?.audioUrl;
      if (audio && typeof audio === "string") {
        return {
          ok: true,
          audioUrl: audio,
          remainingDailyTasks,
        };
      }
      if (poll.data?.statusStr === "failed") {
        return { ok: false, error: "TTS imeshindwa" };
      }
    }

    return {
      ok: false,
      error: "Sauti bado haijakamilika. Jaribu tena.",
      remainingDailyTasks,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "TTS error",
    };
  }
}
