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

    let priceMode = "once";
    let priceTzs = 0;

    if (contentId) {
      try {
        const c = await prisma.content.findUnique({
          where: { id: contentId },
          select: { priceMode: true, priceTzs: true },
        });
        if (c) {
          priceMode = c.priceMode || "once";
          priceTzs = c.priceTzs || 0;
          // Explicit free content stays free even when global paywall is on
          if (priceMode === "free") {
            return NextResponse.json({ locked: false, enabled: true, free: true });
          }
        }
      } catch {
        /* columns may not exist yet */
      }

      const ok = await userHasAccess(session.userId, contentId);
      return NextResponse.json({
        locked: !ok,
        enabled: true,
        priceMode,
        priceTzs,
      });
    }

    // No contentId: require any active access
    const ok = await userHasAccess(session.userId, "");
    return NextResponse.json({ locked: !ok, enabled: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ locked: false, enabled: false });
  }
}
