import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getPaymentSettings,
  savePaymentSettings,
  parseVpnPackages,
  CONTENT_TYPES,
} from "@/lib/payments";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  if (!session)
    return { error: NextResponse.json({ error: "Login" }, { status: 401 }) };
  if (session.role !== "admin")
    return {
      error: NextResponse.json({ error: "Admin only" }, { status: 403 }),
    };
  return { session };
}

const DEFAULT_SETTINGS = {
  id: "default",
  enabled: false,
  payPhone: "",
  payNetwork: "vodacom",
  priceWeek: 2000,
  priceMonth: 5000,
  priceYear: 40000,
  priceOnce: 1000,
  instructions: null as string | null,
  paidCategories: CONTENT_TYPES.join(","),
  showPackages: false,
  pointsAdsEnabled: true,
  vpnPackages: null as string | null,
};

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

    let settings = DEFAULT_SETTINGS;
    try {
      const s = await getPaymentSettings();
      settings = {
        ...DEFAULT_SETTINGS,
        ...s,
        vpnPackages: s.vpnPackages ?? null,
      };
    } catch (e) {
      console.error("getPaymentSettings", e);
    }

    let pending: unknown[] = [];
    let recent: unknown[] = [];

    try {
      pending = await prisma.paymentRequest.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { email: true, name: true } },
        },
      });
      recent = await prisma.paymentRequest.findMany({
        where: { status: { not: "pending" } },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
          user: { select: { email: true, name: true } },
        },
      });
    } catch (e) {
      console.error("paymentRequest list", e);
      try {
        const rows = await prisma.$queryRaw<
          {
            id: string;
            amount: number;
            status: string;
            content_type: string;
            notes: string | null;
            created_at: Date;
            email: string | null;
            name: string | null;
          }[]
        >`
          SELECT p.id, p.amount, p.status, p.content_type, p.notes,
                 p.created_at, u.email, u.name
          FROM "PaymentRequest" p
          LEFT JOIN "User" u ON u.id = p.user_id
          ORDER BY p.created_at DESC
          LIMIT 80
        `;
        pending = rows
          .filter((r) => r.status === "pending")
          .map((r) => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            contentType: r.content_type,
            notes: r.notes,
            createdAt: r.created_at,
            plan: r.content_type,
            senderPhone: "",
            senderNetwork: "",
            screenshotUrl: "",
            user: { email: r.email, fullName: r.name },
            content: null,
          }));
        recent = rows
          .filter((r) => r.status !== "pending")
          .map((r) => ({
            id: r.id,
            amount: r.amount,
            status: r.status,
            contentType: r.content_type,
            notes: r.notes,
            createdAt: r.created_at,
            plan: r.content_type,
            senderPhone: "",
            senderNetwork: "",
            screenshotUrl: "",
            user: { email: r.email, fullName: r.name },
            content: null,
          }));
      } catch (e2) {
        console.error("paymentRequest raw", e2);
      }
    }

    const mapReq = (r: Record<string, unknown>) => {
      const user = r.user as
        | { email?: string; name?: string; fullName?: string }
        | null;
      return {
        ...r,
        plan: r.plan || r.contentType || "once",
        senderPhone: r.senderPhone || "",
        senderNetwork: r.senderNetwork || "",
        screenshotUrl: r.screenshotUrl || "",
        user: user
          ? {
              email: user.email,
              fullName: user.fullName || user.name || null,
            }
          : { email: "—", fullName: null },
        content: r.content || null,
      };
    };

    return NextResponse.json({
      settings: {
        ...settings,
        vpnPackages: parseVpnPackages(
          typeof settings.vpnPackages === "string" ? settings.vpnPackages : null
        ),
      },
      pending: (pending as Record<string, unknown>[]).map(mapReq),
      recent: (recent as Record<string, unknown>[]).map(mapReq),
    });
  } catch (err) {
    console.error("admin payments GET", err);
    return NextResponse.json(
      {
        settings: DEFAULT_SETTINGS,
        pending: [],
        recent: [],
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
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
  pointsAdsEnabled: z.boolean().optional(),
  vpnPackages: z.unknown().optional(),
});

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

    const body = await req.json();
    const d = settingsSchema.parse(body);
    const paid =
      typeof d.paidCategories === "string"
        ? d.paidCategories
        : Array.isArray(d.paidCategories)
          ? d.paidCategories.join(",")
          : undefined;

    const patch: Parameters<typeof savePaymentSettings>[0] = {};
    if (d.enabled !== undefined) patch.enabled = d.enabled;
    if (d.payPhone !== undefined) patch.payPhone = d.payPhone;
    if (d.payNetwork !== undefined) patch.payNetwork = d.payNetwork;
    if (d.priceWeek !== undefined) patch.priceWeek = d.priceWeek;
    if (d.priceMonth !== undefined) patch.priceMonth = d.priceMonth;
    if (d.priceYear !== undefined) patch.priceYear = d.priceYear;
    if (d.priceOnce !== undefined) patch.priceOnce = d.priceOnce;
    if (d.instructions !== undefined) patch.instructions = d.instructions;
    if (paid !== undefined) patch.paidCategories = paid;
    if (d.showPackages !== undefined) patch.showPackages = d.showPackages;
    if (d.pointsAdsEnabled !== undefined)
      patch.pointsAdsEnabled = d.pointsAdsEnabled;
    if (d.vpnPackages !== undefined)
      patch.vpnPackages =
        typeof d.vpnPackages === "string"
          ? d.vpnPackages
          : JSON.stringify(d.vpnPackages);

    try {
      const settings = await savePaymentSettings(patch);
      return NextResponse.json({
        settings: {
          ...settings,
          vpnPackages: parseVpnPackages(settings.vpnPackages),
        },
      });
    } catch (e) {
      console.error("paymentSettings save", e);
      return NextResponse.json(
        {
          error: "Imeshindikana kuhifadhi",
          hint: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      );
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const reviewSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

    const body = await req.json();
    const { id, action } = reviewSchema.parse(body);
    const status = action === "approve" ? "approved" : "rejected";

    try {
      await prisma.paymentRequest.update({
        where: { id },
        data: { status },
      });
    } catch {
      await prisma.$executeRawUnsafe(
        `UPDATE "PaymentRequest" SET status = $1 WHERE id = $2`,
        status,
        id
      );
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
