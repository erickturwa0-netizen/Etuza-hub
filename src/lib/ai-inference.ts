/**
 * Second-pass inference using the chat model (optional deep think).
 */

const ENDPOINT = "https://api.inceptionlabs.ai/v1/chat/completions";
const MODEL = "mercury-3";

export type InferencePassResult = {
  tool: string;
  ok: boolean;
  summary: string;
  data?: { body?: string };
};

/** Run a focused inference pass with the LLM when API key exists */
export async function runInferencePass(
  message: string,
  toolContext: string
): Promise<InferencePassResult> {
  const key = process.env.INCEPTION_API_KEY;
  if (!key) {
    return {
      tool: "inference_pass",
      ok: false,
      summary: "Hakuna INCEPTION_API_KEY — tumia inference scaffold pekee.",
    };
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
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `You are an inference engine. Think step-by-step. Reply in Kiswahili unless user uses English.
Output format:
**Uelewa:** …
**Ukweli:** …
**Reasoning:** …
**Hitimisho:** …
**Confidence:** low|medium|high`,
          },
          {
            role: "user",
            content:
              (toolContext ? `CONTEXT:\n${toolContext.slice(0, 6000)}\n\n` : "") +
              `QUESTION:\n${message.slice(0, 3000)}`,
          },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "";
    if (!res.ok || !String(text).trim()) {
      return {
        tool: "inference_pass",
        ok: false,
        summary: `Inference pass failed (${res.status})`,
      };
    }
    return {
      tool: "inference_pass",
      ok: true,
      summary: "Inference pass OK",
      data: { body: String(text).trim().slice(0, 5000) },
    };
  } catch (e) {
    return {
      tool: "inference_pass",
      ok: false,
      summary: e instanceof Error ? e.message : "inference failed",
    };
  }
}
