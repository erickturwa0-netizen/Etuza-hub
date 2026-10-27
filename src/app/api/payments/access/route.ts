import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPaymentSettings,
  userHasAccess,
  parsePaidCategories,
  getUserAccessRow,
} from "@/lib/payments";
import {
  enabledVpnPackages,
  parseContentVpnPackages,
} from "@/lib/vpn-packages";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId") || "";

    const settings = await getPaymentSettings();
    const session = await getSession();

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

    let priceMode = "free";
    let priceTzs = 0;
    let accessDays = 0;
    let contentType = "";
    let vpnRaw: string | null = null;

    if (contentId) {
      try {
        const c = await prisma.content.findUnique({
          where: { id: contentId },
          select: {
            priceMode: true,
            priceTzs: true,
            accessDays: true,
            type: true,
            vpnPackages: true,
            fileUrl: true,
            configText: true,
            protocol: true,
            linkUrl: true,
          },
        });
        if (c) {
          priceMode = c.priceMode || "free";
          priceTzs = c.priceTzs || 0;
          accessDays = c.accessDays || 0;
          contentType = c.type || "";
          vpnRaw = (c as { vpnPackages?: string | null }).vpnPackages || null;
        }
      } catch {
        /* ignore */
      }

      const contentVpnPkgs = enabledVpnPackages(vpnRaw);

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
        if (!contentVpnPkgs.length) {
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
        contentType === "vpn" && contentVpnPkgs.length > 0;

      if (!explicitlyPaid && !categoryPaid && !vpnNeedsPay) {
        return NextResponse.json({
          locked: false,
          enabled: true,
          free: true,
          hasPaidAccess,
        });
      }

      const ok =
        hasPaidAccess || (await userHasAccess(session.userId, contentId));

      let vpnDeliver = null as null | {
        plan: string;
        title?: string;
        fileUrl?: string;
        configText?: string;
        protocol?: string;
        accessDays?: number;
      };

      if (ok && contentType === "vpn") {
        const row = await getUserAccessRow(session.userId, contentId);
        const all = parseContentVpnPackages(vpnRaw);
        const pkg = all.find((p) => p.plan === row?.plan && p.enabled);
        if (pkg) {
          vpnDeliver = {
            plan: pkg.plan,
            title: pkg.title,
            fileUrl: pkg.fileUrl || undefined,
            configText: pkg.configText || undefined,
            protocol: pkg.protocol || undefined,
            accessDays: pkg.accessDays,
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
        // packages for THIS content only (for paywall picker)
        vpnPackages: contentType === "vpn" ? contentVpnPkgs : [],
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
    return NextResponse.json({
      locked: false,
      enabled: false,
      hasPaidAccess: false,
    });
  }
}
