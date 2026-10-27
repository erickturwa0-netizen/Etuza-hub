import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPaymentSettings,
  userHasAccess,
  parsePaidCategories,
  parseVpnPackages,
  getUserAccessRow,
} from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId") || "";

    const settings = await getPaymentSettings();
    const session = await getSession();

    // Paid package active? (even if global paywall off — for skipping ads)
    let hasPaidAccess = false;
    if (session && contentId) {
      hasPaidAccess = await userHasAccess(session.userId, contentId);
    } else if (session) {
      hasPaidAccess = await userHasAccess(session.userId, "");
    }

    if (!settings.enabled) {
      return NextResponse.json({
        locked: false,
        enabled: false,
        hasPaidAccess,
        reason: "payments_off",
      });
    }

    if (!session) {
      return NextResponse.json({
        locked: true,
        enabled: true,
        needLogin: true,
        hasPaidAccess: false,
      });
    }

    const paidCats = parsePaidCategories(
      (settings as { paidCategories?: string }).paidCategories
    );
    const vpnPackages = parseVpnPackages(
      (settings as { vpnPackages?: string | null }).vpnPackages
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
        /* ignore */
      }

      if (priceMode === "free" && contentType !== "vpn") {
        if (!contentType || !paidCats.includes(contentType)) {
          return NextResponse.json({
            locked: false,
            enabled: true,
            free: true,
            hasPaidAccess,
          });
        }
      }

      if (priceMode === "free" && contentType === "vpn") {
        const anyPkg = vpnPackages.some((p) => p.enabled && p.priceTzs > 0);
        if (!anyPkg) {
          return NextResponse.json({
            locked: false,
            enabled: true,
            free: true,
            hasPaidAccess,
          });
        }
      }

      const explicitlyPaid =
        priceMode === "once" ||
        priceMode === "week" ||
        priceMode === "month" ||
        priceMode === "year" ||
        priceMode === "timed" ||
        priceTzs > 0;

      const categoryPaid =
        contentType !== "vpn" &&
        !!contentType &&
        paidCats.includes(contentType);

      const vpnNeedsPay =
        contentType === "vpn" &&
        (explicitlyPaid ||
          vpnPackages.some((p) => p.enabled && p.priceTzs > 0));

      if (!explicitlyPaid && !categoryPaid && !vpnNeedsPay) {
        return NextResponse.json({
          locked: false,
          enabled: true,
          free: true,
          hasPaidAccess,
        });
      }

      const ok = hasPaidAccess || (await userHasAccess(session.userId, contentId));
      let vpnDeliver = null as null | {
        plan: string;
        fileUrl?: string;
        configText?: string;
        protocol?: string;
      };

      if (ok && contentType === "vpn") {
        const row = await getUserAccessRow(session.userId, contentId);
        const pkg = vpnPackages.find((p) => p.plan === row?.plan);
        if (pkg) {
          vpnDeliver = {
            plan: pkg.plan,
            fileUrl: pkg.fileUrl || undefined,
            configText: pkg.configText || undefined,
            protocol: pkg.protocol || undefined,
          };
        }
      }

      return NextResponse.json({
        locked: !ok,
        enabled: true,
        priceMode,
        priceTzs,
        accessDays,
        contentType,
        isVpn: contentType === "vpn",
        hasPaidAccess: ok,
        vpnPackages: contentType === "vpn"
          ? vpnPackages.filter((p) => p.enabled)
          : [],
        vpnDeliver,
      });
    }

    const ok = await userHasAccess(session.userId, "");
    return NextResponse.json({
      locked: !ok,
      enabled: true,
      hasPaidAccess: ok,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ locked: false, enabled: false, hasPaidAccess: false });
  }
}
