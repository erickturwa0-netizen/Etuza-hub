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

      // Explicit free content → open
      if (priceMode === "free" && contentType !== "vpn") {
        // Still lock if category is bulk-paid (movies etc.)
        if (!contentType || !paidCats.includes(contentType)) {
          return NextResponse.json({
            locked: false,
            enabled: true,
            free: true,
          });
        }
      }

      if (priceMode === "free" && contentType === "vpn") {
        // VPN without price: lock only if any vpn package enabled
        const anyPkg = vpnPackages.some((p) => p.enabled && p.priceTzs > 0);
        if (!anyPkg) {
          return NextResponse.json({
            locked: false,
            enabled: true,
            free: true,
          });
        }
      }

      // Content has its own price → always lock (no category tick needed)
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
        });
      }

      const ok = await userHasAccess(session.userId, contentId);
      let vpnDeliver: {
        plan: string;
        fileUrl?: string;
        configText?: string;
        protocol?: string;
      } | null = null;

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
        vpnPackages: contentType === "vpn"
          ? vpnPackages.filter((p) => p.enabled)
          : [],
        vpnDeliver,
      });
    }

    const ok = await userHasAccess(session.userId, "");
    return NextResponse.json({ locked: !ok, enabled: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ locked: false, enabled: false });
  }
}
