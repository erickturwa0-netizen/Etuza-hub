import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureVpnTables } from "@/lib/vpn-referral";

async function requireAdmin() {
  const session = await getSession();
  if (!session)
    return { error: NextResponse.json({ error: "Login" }, { status: 401 }) };
  if (session.role !== "admin")
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  await ensureVpnTables();

  const orders = await prisma.$queryRawUnsafe<
    {
      id: string;
      payment_request_id: string | null;
      user_id: string;
      referrer_id: string | null;
      amount: number;
      plan: string;
      package_label: string | null;
      status: string;
      config_text: string | null;
      file_url: string | null;
      protocol: string | null;
      admin_note: string | null;
      delivered_at: Date | null;
      created_at: Date;
      email: string | null;
      full_name: string | null;
    }[]
  >(`
    SELECT o.*, u.email, u.full_name
    FROM "VpnOrder" o
    LEFT JOIN "User" u ON u.id = o.user_id
    ORDER BY
      CASE WHEN o.status = 'pending_config' THEN 0 ELSE 1 END,
      o.created_at DESC
    LIMIT 100
  `);

  const stats = await prisma.$queryRawUnsafe<
    { kind: string; cnt: bigint }[]
  >(`
    SELECT kind, COUNT(*)::bigint AS cnt
    FROM "VpnEvent"
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY kind
  `);

  const recentEvents = await prisma.$queryRawUnsafe<
    {
      id: string;
      kind: string;
      session_id: string | null;
      user_id: string | null;
      path: string | null;
      created_at: Date;
      email: string | null;
    }[]
  >(`
    SELECT e.*, u.email
    FROM "VpnEvent" e
    LEFT JOIN "User" u ON u.id = e.user_id
    ORDER BY e.created_at DESC
    LIMIT 40
  `);

  const bonuses = await prisma.$queryRawUnsafe<
    {
      id: string;
      user_id: string;
      from_user_id: string;
      team_level: string;
      amount_paid: number;
      bonus_hours: number;
      created_at: Date;
      email: string | null;
    }[]
  >(`
    SELECT b.*, u.email
    FROM "VpnBonusLog" b
    LEFT JOIN "User" u ON u.id = b.user_id
    ORDER BY b.created_at DESC
    LIMIT 40
  `);

  const mapStats: Record<string, number> = { view: 0, click: 0, pay: 0 };
  for (const s of stats) {
    mapStats[s.kind] = Number(s.cnt);
  }

  return NextResponse.json({
    stats: mapStats,
    orders,
    recentEvents,
    bonuses,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  await ensureVpnTables();
  const body = await req.json();
  const orderId = String(body?.orderId || "");
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const configText = body?.configText
    ? String(body.configText).slice(0, 50000)
    : "";
  const fileUrl = body?.fileUrl ? String(body.fileUrl).slice(0, 2000) : "";
  const protocol = body?.protocol ? String(body.protocol).slice(0, 80) : "";
  const adminNote = body?.adminNote
    ? String(body.adminNote).slice(0, 500)
    : null;

  if (!configText && !fileUrl) {
    return NextResponse.json(
      { error: "Weka config text au file URL" },
      { status: 400 }
    );
  }

  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      user_id: string;
      plan: string;
      amount: number;
      status: string;
    }[]
  >(
    `SELECT id, user_id, plan, amount, status FROM "VpnOrder" WHERE id = $1`,
    orderId
  );

  const order = rows[0];
  if (!order) {
    return NextResponse.json({ error: "Order haipo" }, { status: 404 });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "VpnOrder" SET
      status = 'delivered',
      config_text = $1,
      file_url = $2,
      protocol = $3,
      admin_note = $4,
      delivered_at = NOW(),
      updated_at = NOW()
     WHERE id = $5`,
    configText || null,
    fileUrl || null,
    protocol || null,
    adminNote,
    orderId
  );

  const days =
    order.plan === "year"
      ? 365
      : order.plan === "month"
        ? 30
        : order.plan === "week"
          ? 7
          : 30;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  try {
    await prisma.userAccess.create({
      data: {
        userId: order.user_id,
        contentId: null,
        plan: `vpn:${order.plan}`,
        expiresAt: expires,
      },
    });
  } catch (e) {
    console.error("userAccess vpn", e);
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET vpn_expires_at = CASE
         WHEN vpn_expires_at IS NULL OR vpn_expires_at < $1 THEN $1
         ELSE vpn_expires_at
       END WHERE id = $2`,
      expires,
      order.user_id
    );
  } catch (e) {
    console.error("vpn expires", e);
  }

  try {
    await prisma.content.create({
      data: {
        type: "vpn",
        title: `VPN Config · ${order.plan}`,
        description: adminNote || "Config baada ya malipo",
        linkUrl: fileUrl || "https://etuza-hub-v2.vercel.app/account",
        linkType: "download",
        configText: configText || null,
        fileUrl: fileUrl || null,
        protocol: protocol || null,
        status: "published",
        priceMode: "paid",
        priceTzs: order.amount,
        category: "Delivered",
        createdBy: "admin-vpn-order",
      },
    });
  } catch (e) {
    console.error("vpn content", e);
  }

  return NextResponse.json({ ok: true });
}
