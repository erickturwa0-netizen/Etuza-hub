/**
 * Omegatech AI Horde freeimage — image generation for ETUZA AI
 */
export type ImageGenResult = {
  tool: "image_gen";
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

export function wantsImageGen(message: string): boolean {
  const m = message.toLowerCase();
  return /\b(picha|image|img|draw|generate\s+image|tengeneza\s+picha|unda\s+picha|create\s+(an?\s+)?image|chora|horde|stable\s*diffusion|ai\s*art|generate\s+picha)\b/i.test(
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

function pickImageUrl(data: Record<string, unknown>): string {
  const gens = (data.generations as { img?: string; image?: string }[]) || [];
  for (const g of gens) {
    if (g?.img && typeof g.img === "string") return g.img;
    if (g?.image && typeof g.image === "string") return g.image;
  }
  if (typeof data.imageUrl === "string") return data.imageUrl;
  if (typeof data.img === "string") return data.img;
  if (typeof data.url === "string" && /^https?:\/\//i.test(data.url))
    return data.url;
  return "";
}

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
      signal: AbortSignal.timeout(30000),
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
      id?: string;
    };
    const id = sub?.data?.id || sub?.id;
    if (!id) {
      return {
        tool: "image_gen",
        ok: false,
        summary: "Horde haikutoa job id.",
      };
    }

    let imageUrl = "";
    let last: Record<string, unknown> = {};

    // Try blocking wait once (server-side poll)
    try {
      const waitUrl =
        HORDE_BASE +
        "?action=horde-wait&id=" +
        encodeURIComponent(id);
      const wRes = await fetch(waitUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(90000),
      });
      if (wRes.ok) {
        const wj = (await wRes.json()) as { data?: Record<string, unknown> };
        const data = (wj.data || wj) as Record<string, unknown>;
        last = data;
        imageUrl = pickImageUrl(data);
      }
    } catch {
      /* fall through to status loop */
    }

    // Poll status up to ~90s
    for (let i = 0; i < 18 && !imageUrl; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 2000 : 4500));
      const stUrl =
        HORDE_BASE +
        "?action=horde-status&id=" +
        encodeURIComponent(id);
      const stRes = await fetch(stUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!stRes.ok) continue;
      const st = (await stRes.json()) as { data?: Record<string, unknown> };
      const data = (st.data || st) as Record<string, unknown>;
      last = data;
      if (data.faulted) {
        return {
          tool: "image_gen",
          ok: false,
          summary: "Horde job imefeli (faulted).",
          data: { jobId: id },
        };
      }
      imageUrl = pickImageUrl(data);
    }

    if (!imageUrl) {
      return {
        tool: "image_gen",
        ok: false,
        summary:
          "Picha bado haijakamilika (foleni ya Horde). Andika tena: tengeneza picha ... baada ya sekunde 30.",
        data: {
          jobId: id,
          queue_position: last.queue_position,
          wait_time: last.wait_time,
        },
      };
    }

    // Base64 data URL or https
    const finalUrl = imageUrl.startsWith("http")
      ? imageUrl
      : imageUrl.startsWith("data:")
        ? imageUrl
        : `data:image/webp;base64,${imageUrl}`;

    return {
      tool: "image_gen",
      ok: true,
      summary: `Picha imetengenezwa: "${p.slice(0, 80)}"`,
      data: {
        prompt: p,
        imageUrl: finalUrl,
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
