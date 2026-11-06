import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logVpnEvent } from "@/lib/vpn-referral";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kind = String(body?.kind || "view");
    if (!["view", "click", "pay"].includes(kind)) {
      return NextResponse.json({ error: "kind" }, { status: 400 });
    }
    let userId: string | null = null;
    try {
      const s = await getSession();
      userId = s?.userId || null;
    } catch {
      /* */
    }
    const sessionId = String(body?.sessionId || "").slice(0, 80) || null;
    await logVpnEvent({
      kind: kind as "view" | "click" | "pay",
      sessionId,
      userId,
      path: String(body?.path || "/vpn").slice(0, 120),
      meta: body?.meta ? String(body.meta).slice(0, 200) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
