import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPaymentSettings,
  userHasAccess,
  parsePaidCategories,
} from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId") || "";

    const settings = await getPaymentSettings();

    // Global paywall switch must be ON
    if (!settings.enabled) {
      return NextResponse.json({
        locked: false,
        enabled: false,
        reason: "payments_off",
      });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({
        locked: true,
        enabled: true,
        needLogin: true,
      });
    }

    const paidCats = parsePaidCategories(
      (settings as { paidCategories?: string }).paidCategories
    );

    let priceMode = "free";
    let priceTzs = 0;
    let accessDays = 0;
    let contentType = "";

    if (contentId) {
      try {
        const c = await prisma.content.findUnique({
          where: { id: contentId },
          select: {
            priceMode: true,
            priceTzs: true,
            accessDays: true,
            type: true,
          },
        });
        if (c) {
          priceMode = c.priceMode || "free";
          priceTzs = c.priceTzs || 0;
          accessDays = c.accessDays || 0;
          contentType = c.type || "";
        }
      } catch {
        /* columns missing */
      }

      // Explicit free → always open
      if (priceMode === "free") {
        return NextResponse.json({
          locked: false,
          enabled: true,
          free: true,
        });
      }

      // Paid content (once / week / month / year / timed)
      // OR type is in paid categories list
      const explicitlyPaid =
        priceMode === "once" ||
        priceMode === "week" ||
        priceMode === "month" ||
        priceMode === "year" ||
        priceMode === "timed" ||
        (priceTzs > 0 && priceMode !== "free");

      const categoryPaid =
        !!contentType && paidCats.includes(contentType);

      // If neither content nor category requires payment → open
      if (!explicitlyPaid && !categoryPaid) {
        return NextResponse.json({
          locked: false,
          enabled: true,
          free: true,
        });
      }

      // Has access already?
      const ok = await userHasAccess(session.userId, contentId);
      return NextResponse.json({
        locked: !ok,
        enabled: true,
        priceMode,
        priceTzs,
        accessDays,
        admin: session.role === "admin",
      });
    }

    const ok = await userHasAccess(session.userId, "");
    return NextResponse.json({
      locked: !ok,
      enabled: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ locked: false, enabled: false });
  }
}
