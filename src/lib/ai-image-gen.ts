/**
 * Omegatech AI Horde freeimage — image generation tool for ETUZA AI
 */
export type ImageGenResult = {
  tool: "image_gen";
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

export function wantsImageGen(message: string): boolean {
  const m = message.toLowerCase();
  return /\b(picha|image|img|draw|generate\s+image|tengeneza\s+picha|create\s+(an?\s+)?image|chora|horde|stable\s*diffusion|ai\s*art)\b/i.test(
    m
  );
}

export function extractImagePrompt(message: string): string {
  let s = message
    .replace(
      /^(tafadhali\s+)?(tengeneza|unda|create|generate|draw|chora|nitatengenezee|nitengenezee)\s+(picha\s+(ya\s+)?|image\s+(of\s+)?|an?\s+image\s+(of\s+)?)/i,
      ""
    )
    .replace(/\b(picha\s+ya|image\s+of)\b/i, "")
    .trim();
  if (s.length < 3) s = message.trim();
  return s.slice(0, 500);
}

const HORDE_BASE =
  process.env.OMEGATECH_IMAGE_API ||
  "https://api.omegatech.app/api/ai/freeimage";

export async function generateImageHorde(prompt: string): Promise<ImageGenResult> {
  const p = (prompt || "").trim().slice(0, 500);
  if (!p) {
    return { tool: "image_gen", ok: false, summary: "Prompt tupu." };
  }
  try {
    const submitUrl =
      HORDE_BASE + "?action=horde&prompt=" + encodeURIComponent(p);
    const subRes = await fetch(submitUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (!subRes.ok) {
      return {
        tool: "image_gen",
        ok: false,
        summary: `Horde submit imeshindwa (HTTP ${subRes.status})`,
      };
    }
    const sub = (await subRes.json()) as {
      data?: { id?: string };
    };
    const id = sub?.data?.id;
    if (!id) {
      return {
        tool: "image_gen",
        ok: false,
        summary: "Horde haikutoa job id.",
      };
    }

    let imageUrl = "";
    let last: Record<string, unknown> = {};
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 2500 : 4000));
      const stUrl =
        HORDE_BASE +
        "?action=horde-status&id=" +
        encodeURIComponent(id);
      const stRes = await fetch(stUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!stRes.ok) continue;
      const st = (await stRes.json()) as {
        data?: {
          done?: boolean;
          faulted?: boolean;
          generations?: { img?: string }[];
          wait_time?: number;
          queue_position?: number;
        };
      };
      const data = st.data || {};
      last = data as Record<string, unknown>;
      if (data.faulted) {
        return {
          tool: "image_gen",
          ok: false,
          summary: "Horde job imefeli (faulted).",
          data: { jobId: id },
        };
      }
      const gens = data.generations || [];
      const img = gens.find((g) => g.img)?.img;
      if (img) {
        imageUrl = img;
        break;
      }
    }

    if (!imageUrl) {
      return {
        tool: "image_gen",
        ok: false,
        summary:
          "Picha bado haijakamilika (foleni ya Horde). Jaribu tena baada ya dakika 1.",
        data: {
          jobId: id,
          queue_position: last.queue_position,
          wait_time: last.wait_time,
        },
      };
    }

    return {
      tool: "image_gen",
      ok: true,
      summary: `Picha imetengenezwa: "${p.slice(0, 80)}"`,
      data: {
        prompt: p,
        imageUrl,
        jobId: id,
        source: "omegatech-horde",
      },
    };
  } catch (e) {
    return {
      tool: "image_gen",
      ok: false,
      summary: `Image gen error: ${e instanceof Error ? e.message : "fail"}`,
    };
  }
}
