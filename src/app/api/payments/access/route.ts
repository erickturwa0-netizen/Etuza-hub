import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentSettings, userHasAccess } from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId") || "";

    const settings = await getPaymentSettings();
    if (!settings.enabled) {
      return NextResponse.json({ locked: false, enabled: false });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({
        locked: true,
        enabled: true,
        needLogin: true,
      });
    }

    if (session.role === "admin") {
      return NextResponse.json({ locked: false, enabled: true, admin: true });
    }

    // Content-level free?
    if (contentId) {
      const c = await prisma.content.findUnique({
        where: { id: contentId },
        select: { priceMode: true, priceTzs: true, type: true },
      });
      if (c && (c.priceMode === "free" || (!c.priceMode && !c.priceTzs))) {
        // still locked if global paywall and not free mode explicitly — treat missing as paid when global on
        if (c.priceMode === "free") {
          return NextResponse.json({ locked: false, enabled: true });
        }
      }
      if (c?.priceMode === "free") {
        return NextResponse.json({ locked: false, enabled: true });
      }

      const ok = await userHasAccess(session.userId, contentId);
      return NextResponse.json({
        locked: !ok,
        enabled: true,
        priceMode: c?.priceMode || "once",
        priceTzs: c?.priceTzs || 0,
      });
    }

    return NextResponse.json({ locked: true, enabled: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ locked: false, enabled: false });
  }
}
