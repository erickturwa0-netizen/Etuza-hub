import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getPaymentSettings,
  expiresForPlan,
  NETWORKS,
  CONTENT_TYPES,
  parseVpnPackages,
  DEFAULT_VPN_PACKAGES,
} from "@/lib/payments";
import { POINTS } from "@/lib/points";
import { onVpnPaymentApproved, logVpnEvent } from "@/lib/vpn-referral";

async function requireAdmin() {
  const session = await getSession();
  if (!session)
    return { error: NextResponse.json({ error: "Login" }, { status: 401 }) };
  if (session.role !== "admin")
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { session };
}

async function ensureUserPackageCols() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "package_points" INTEGER NOT NULL DEFAULT 0
    `);
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "package_points_expires_at" TIMESTAMP
    `);
  } catch {
    /* ignore */
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const settings = await getPaymentSettings();
  const vpnPackages =
    (settings as { vpnPackages?: string | null }).vpnPackages || null;

  const pending = await prisma.paymentRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { email: true, fullName: true } },
      content: { select: { title: true, type: true } },
    },
  });
  const recent = await prisma.paymentRequest.findMany({
    where: { status: { not: "pending" } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      user: { select: { email: true, fullName: true } },
      content: { select: { title: true, type: true } },
    },
  });

  return NextResponse.json({
    settings: {
      ...settings,
      vpnPackages: parseVpnPackages(vpnPackages),
    },
    pending,
    recent,
  });
}

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  payPhone: z.string().optional(),
  payNetwork: z.string().optional(),
  priceWeek: z.number().optional(),
  priceMonth: z.number().optional(),
  priceYear: z.number().optional(),
  priceOnce: z.number().optional(),
  instructions: z.string().optional().nullable(),
  paidCategories: z.union([z.string(), z.array(z.string())]).optional(),
  showPackages: z.boolean().optional(),
  vpnPackages: z.any().optional(),
});

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data si sahihi" }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (Array.isArray(data.paidCategories)) {
    data.paidCategories = (data.paidCategories as string[]).join(",");
  }
  if (data.vpnPackages && typeof data.vpnPackages !== "string") {
    data.vpnPackages = JSON.stringify(data.vpnPackages);
  }

  const settings = await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      enabled: Boolean(data.enabled),
      payPhone: String(data.payPhone || ""),
      payNetwork: String(data.payNetwork || "vodacom"),
      priceWeek: Number(data.priceWeek ?? 2000),
      priceMonth: Number(data.priceMonth ?? 5000),
      priceYear: Number(data.priceYear ?? 40000),
      priceOnce: Number(data.priceOnce ?? 1000),
      instructions: (data.instructions as string) || null,
      paidCategories: String(
        data.paidCategories || CONTENT_TYPES.join(",")
      ),
      showPackages: Boolean(data.showPackages),
      vpnPackages:
        (data.vpnPackages as string) ||
        JSON.stringify(DEFAULT_VPN_PACKAGES),
    },
    update: data,
  });

  return NextResponse.json({
    settings: {
      ...settings,
      vpnPackages: parseVpnPackages(
        (settings as { vpnPackages?: string | null }).vpnPackages
      ),
    },
  });
}

const reviewSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data si sahihi" }, { status: 400 });
  }

  await ensureUserPackageCols();

  const reqRow = await prisma.paymentRequest.findUnique({
    where: { id: parsed.data.id },
    include: {
      content: { select: { accessDays: true, priceMode: true, type: true } },
    },
  });
  if (!reqRow) return NextResponse.json({ error: "Haipo" }, { status: 404 });
  if (reqRow.status !== "pending") {
    return NextResponse.json(
      { error: "Tayari imeshughulikiwa" },
      { status: 400 }
    );
  }

  if (parsed.data.action === "reject") {
    const updated = await prisma.paymentRequest.update({
      where: { id: reqRow.id },
      data: {
        status: "rejected",
        adminNote: parsed.data.adminNote || null,
      },
    });
    return NextResponse.json({ request: updated });
  }

  const accessDays = reqRow.content?.accessDays || 0;
  const plan =
    reqRow.plan === "timed" || reqRow.content?.priceMode === "timed"
      ? "timed"
      : reqRow.plan;
  const expiresAt = expiresForPlan(plan, new Date(), accessDays);

  await prisma.$transaction([
    prisma.paymentRequest.update({
      where: { id: reqRow.id },
      data: {
        status: "approved",
        adminNote: parsed.data.adminNote || null,
      },
    }),
    prisma.userAccess.create({
      data: {
        userId: reqRow.userId,
        contentId: reqRow.contentId,
        plan,
        expiresAt,
      },
    }),
  ]);

  // VPN: config order + Team A/B/C referral days
  try {
    const isVpn =
      reqRow.content?.type === "vpn" ||
      String(reqRow.plan || "").toLowerCase().includes("vpn");
    if (isVpn) {
      await onVpnPaymentApproved({
        paymentRequestId: reqRow.id,
        buyerId: reqRow.userId,
        amount: reqRow.amount,
        plan: reqRow.plan,
      });
      await logVpnEvent({
        kind: "pay",
        userId: reqRow.userId,
        path: "/vpn",
        meta: String(reqRow.amount),
      });
    }
  } catch (e) {
    console.error("vpn referral on approve", e);
  }

  // Grant package bonus points
  try {
    await prisma.user.update({
      where: { id: reqRow.userId },
      data: {
        packagePoints: POINTS.PACKAGE_BONUS,
        packagePointsExpiresAt: expiresAt,
      },
    });
    await prisma.pointLog.create({
      data: {
        userId: reqRow.userId,
        amount: POINTS.PACKAGE_BONUS,
        reason: "package_bonus",
        meta: plan,
      },
    });
  } catch (e) {
    console.error("package points grant", e);
  }

  return NextResponse.json({ ok: true });
}
