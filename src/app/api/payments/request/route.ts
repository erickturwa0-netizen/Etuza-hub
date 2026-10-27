import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getPaymentSettings,
  priceForPlan,
  NETWORKS,
} from "@/lib/payments";
import { enabledVpnPackages } from "@/lib/vpn-packages";

const schema = z.object({
  contentId: z.string().optional().nullable(),
  plan: z.enum(["once", "week", "month", "year", "timed"]),
  senderPhone: z.string().min(9).max(20),
  senderNetwork: z.enum(NETWORKS as unknown as [string, ...string[]]),
  screenshotUrl: z.string().min(20),
  amount: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Ingia kwanza" }, { status: 401 });
    }

    const settings = await getPaymentSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "Malipo yamezimwa" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Jaza namba, mtandao na screenshot" },
        { status: 400 }
      );
    }

    let contentPrice: number | null = null;
    let contentType = "";
    let vpnAmount: number | null = null;

    if (parsed.data.contentId) {
      const c = await prisma.content.findUnique({
        where: { id: parsed.data.contentId },
        select: {
          priceTzs: true,
          priceMode: true,
          type: true,
          vpnPackages: true,
        },
      });
      if (c) {
        contentType = c.type;
        if (c.priceTzs > 0) contentPrice = c.priceTzs;
        if (c.type === "vpn") {
          const pkgs = enabledVpnPackages(
            (c as { vpnPackages?: string | null }).vpnPackages
          );
          const pkg = pkgs.find((p) => p.plan === parsed.data.plan);
          if (pkg) vpnAmount = pkg.priceTzs;
        }
      }
    }

    const showPackages =
      (settings as { showPackages?: boolean }).showPackages === true;

    const amount =
      vpnAmount != null
        ? vpnAmount
        : parsed.data.amount && parsed.data.amount > 0
          ? parsed.data.amount
          : priceForPlan(
              settings,
              parsed.data.plan,
              contentPrice,
              null,
              showPackages && contentType !== "vpn"
            );

    if (parsed.data.screenshotUrl.length > 2_000_000) {
      return NextResponse.json(
        { error: "Screenshot ni kubwa mno (max ~1.5MB)" },
        { status: 400 }
      );
    }

    const row = await prisma.paymentRequest.create({
      data: {
        userId: session.userId,
        contentId: parsed.data.contentId || null,
        plan: parsed.data.plan,
        amount,
        senderPhone: parsed.data.senderPhone,
        senderNetwork: parsed.data.senderNetwork,
        screenshotUrl: parsed.data.screenshotUrl,
        status: "pending",
      },
    });

    return NextResponse.json({ request: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}
