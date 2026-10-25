import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getPaymentSettings,
  expiresForPlan,
  NETWORKS,
} from "@/lib/payments";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Login" }, { status: 401 }) };
  if (session.role !== "admin")
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const [settings, pending, recent] = await Promise.all([
    getPaymentSettings(),
    prisma.paymentRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { email: true, fullName: true } },
        content: { select: { title: true, type: true } },
      },
    }),
    prisma.paymentRequest.findMany({
      where: { status: { not: "pending" } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: {
        user: { select: { email: true, fullName: true } },
        content: { select: { title: true, type: true } },
      },
    }),
  ]);

  return NextResponse.json({ settings, pending, recent });
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  payPhone: z.string().min(9).max(20),
  payNetwork: z.enum(NETWORKS as unknown as [string, ...string[]]),
  priceWeek: z.number().int().min(0),
  priceMonth: z.number().int().min(0),
  priceYear: z.number().int().min(0),
  priceOnce: z.number().int().min(0),
  instructions: z.string().optional().nullable(),
});

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data si sahihi" }, { status: 400 });
  }
  const d = parsed.data;
  const settings = await prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...d, instructions: d.instructions || null },
    update: { ...d, instructions: d.instructions || null },
  });
  return NextResponse.json({ settings });
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

  const reqRow = await prisma.paymentRequest.findUnique({
    where: { id: parsed.data.id },
  });
  if (!reqRow) return NextResponse.json({ error: "Haipo" }, { status: 404 });
  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "Tayari imeshughulikiwa" }, { status: 400 });
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

  const expiresAt = expiresForPlan(reqRow.plan);
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
        plan: reqRow.plan,
        expiresAt,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
