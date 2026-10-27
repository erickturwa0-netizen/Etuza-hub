import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getPaymentSettings,
  priceForPlan,
  NETWORKS,
  PLANS,
  parseVpnPackages,
} from "@/lib/payments";

const schema = z.object({
  contentId: z.string().optional().nullable(),
  plan: z.enum(PLANS as unknown as [string, ...string[]]),
  senderPhone: z.string().min(9).max(20),
  senderNetwork: z.enum(NETWORKS as unknown as [string, ...string[]]),
  screenshotUrl: z.string().min(20),
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
    if (parsed.data.contentId) {
      const c = await prisma.content.findUnique({
        where: { id: parsed.data.contentId },
        select: { priceTzs: true, priceMode: true, type: true },
      });
      if (c) {
        contentType = c.type;
        if (c.priceTzs > 0) contentPrice = c.priceTzs;
      }
    }

    const vpnPackages = parseVpnPackages(
      (settings as { vpnPackages?: string | null }).vpnPackages
    );
    const vpnPkg =
      contentType === "vpn"
        ? vpnPackages.find((p) => p.plan === parsed.data.plan && p.enabled)
        : null;

    const amount = priceForPlan(
      settings,
      parsed.data.plan,
      contentPrice,
      vpnPkg
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
        senderPhone: parsed.data.senderPhone.trim(),
        senderNetwork: parsed.data.senderNetwork,
        screenshotUrl: parsed.data.screenshotUrl,
        status: "pending",
      },
    });

    return NextResponse.json({
      ok: true,
      id: row.id,
      message: "Ombi limetumwa. Subiri admin aidhinishe.",
    });
  } catch (e) {
    console.error("payment request", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
