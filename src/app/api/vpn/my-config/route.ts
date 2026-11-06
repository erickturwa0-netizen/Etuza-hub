import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureVpnTables } from "@/lib/vpn-referral";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ingia kwanza" }, { status: 401 });
  }

  await ensureVpnTables();

  try {
    const rows = await prisma.$queryRawUnsafe<
      {
        id: string;
        plan: string;
        amount: number;
        package_label: string | null;
        status: string;
        config_text: string | null;
        file_url: string | null;
        protocol: string | null;
        delivered_at: Date | null;
        created_at: Date;
      }[]
    >(
      `SELECT id, plan, amount, package_label, status, config_text, file_url, protocol, delivered_at, created_at
       FROM "VpnOrder"
       WHERE user_id = $1 AND status = 'delivered'
       ORDER BY delivered_at DESC NULLS LAST, created_at DESC
       LIMIT 20`,
      session.userId
    );

    return NextResponse.json({ configs: rows });
  } catch (e) {
    console.error("my-config", e);
    return NextResponse.json({ configs: [] });
  }
}
