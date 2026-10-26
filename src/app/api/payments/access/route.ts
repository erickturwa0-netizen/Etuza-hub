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

    const paidCats = parsePaidCategories(
      (settings as { paidCategories?: string }).paidCategories
    );

    let priceMode = "once";
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
          priceMode = c.priceMode || "once";
          priceTzs = c.priceTzs || 0;
          accessDays = c.accessDays || 0;
          contentType = c.type;

          if (priceMode === "free") {
            return NextResponse.json({
              locked: false,
              enabled: true,
              free: true,
            });
          }

          // Category not in paid list → free unless content itself is priced
          if (
            contentType &&
            !paidCats.includes(contentType) &&
            (priceMode === "free" || !priceMode)
          ) {
            return NextResponse.json({ locked: false, enabled: true });
          }
          if (contentType && !paidCats.includes(contentType) && priceTzs <= 0 && priceMode === "free") {
            return NextResponse.json({ locked: false, enabled: true });
          }
          // If category not ticked as paid and content is free-mode
          if (contentType && !paidCats.includes(contentType)) {
            // Only lock if this specific content is explicitly sold
            if (priceMode === "free" || !priceMode) {
              return NextResponse.json({ locked: false, enabled: true });
            }
          }
        }
      } catch {
        /* ignore */
      }

      const ok = await userHasAccess(session.userId, contentId);
      return NextResponse.json({
        locked: !ok,
        enabled: true,
        priceMode,
        priceTzs,
        accessDays,
      });
    }

    const ok = await userHasAccess(session.userId, "");
    return NextResponse.json({ locked: !ok, enabled: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ locked: false, enabled: false });
  }
}
