import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

/** Hours of VPN config bonus by team level and purchase tier */
export const VPN_REFERRAL_HOURS: Record<
  "A" | "B" | "C",
  Record<1500 | 2500 | 8000, number>
> = {
  A: { 1500: 24, 2500: 48, 8000: 120 }, // +1d +2d +5d
  B: { 1500: 12, 2500: 24, 8000: 60 }, // +12h +1d +2.5d
  C: { 1500: 8, 2500: 12, 8000: 48 }, // +8h +12h +2d
};

export function purchaseTier(amount: number): 1500 | 2500 | 8000 {
  if (amount >= 6000) return 8000;
  if (amount >= 2000) return 2500;
  return 1500;
}

export function formatBonusHours(h: number): string {
  if (h >= 24 && h % 24 === 0) return `+${h / 24} DAY${h / 24 > 1 ? "S" : ""}`;
  if (h === 60) return "+2.5 DAYS";
  return `+${h} HOURS`;
}

/** Ensure VPN referral tables exist */
export async function ensureVpnTables() {
  const stmts = [
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS vpn_expires_at TIMESTAMP(3)`,
    `CREATE TABLE IF NOT EXISTS "VpnEvent" (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      session_id TEXT,
      user_id TEXT,
      path TEXT,
      meta TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "VpnEvent_kind_idx" ON "VpnEvent"(kind)`,
    `CREATE INDEX IF NOT EXISTS "VpnEvent_created_at_idx" ON "VpnEvent"(created_at)`,
    `CREATE TABLE IF NOT EXISTS "VpnOrder" (
      id TEXT PRIMARY KEY,
      payment_request_id TEXT UNIQUE,
      user_id TEXT NOT NULL,
      referrer_id TEXT,
      amount INTEGER NOT NULL,
      plan TEXT NOT NULL,
      package_label TEXT,
      status TEXT NOT NULL DEFAULT 'pending_config',
      config_text TEXT,
      file_url TEXT,
      protocol TEXT,
      admin_note TEXT,
      delivered_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "VpnOrder_status_idx" ON "VpnOrder"(status)`,
    `CREATE INDEX IF NOT EXISTS "VpnOrder_user_id_idx" ON "VpnOrder"(user_id)`,
    `CREATE TABLE IF NOT EXISTS "VpnBonusLog" (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      team_level TEXT NOT NULL,
      amount_paid INTEGER NOT NULL,
      bonus_hours INTEGER NOT NULL,
      payment_request_id TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "VpnBonusLog_user_id_idx" ON "VpnBonusLog"(user_id)`,
  ];
  for (const s of stmts) {
    try {
      await prisma.$executeRawUnsafe(s);
    } catch (e) {
      console.error("ensureVpnTables", e);
    }
  }
}

async function extendVpnExpiry(userId: string, hours: number) {
  const rows = await prisma.$queryRawUnsafe<
    { vpn_expires_at: Date | null }[]
  >(`SELECT vpn_expires_at FROM "User" WHERE id = $1`, userId);
  const cur = rows[0]?.vpn_expires_at
    ? new Date(rows[0].vpn_expires_at)
    : null;
  const base =
    cur && cur.getTime() > Date.now() ? cur.getTime() : Date.now();
  const next = new Date(base + hours * 60 * 60 * 1000);
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET vpn_expires_at = $1 WHERE id = $2`,
    next,
    userId
  );
  return next;
}

/** After VPN payment approved: create config order + Team A/B/C bonuses */
export async function onVpnPaymentApproved(opts: {
  paymentRequestId: string;
  buyerId: string;
  amount: number;
  plan: string;
}) {
  await ensureVpnTables();
  const tier = purchaseTier(opts.amount);

  const buyer = await prisma.user.findUnique({
    where: { id: opts.buyerId },
    select: { id: true, referredById: true, email: true, fullName: true },
  });
  if (!buyer) return;

  // Order for admin to attach config
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "VpnOrder" (id, payment_request_id, user_id, referrer_id, amount, plan, package_label, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_config',NOW(),NOW())
       ON CONFLICT (payment_request_id) DO NOTHING`,
      randomUUID(),
      opts.paymentRequestId,
      opts.buyerId,
      buyer.referredById || null,
      opts.amount,
      opts.plan,
      `TSh ${opts.amount} · ${opts.plan}`
    );
  } catch (e) {
    console.error("VpnOrder create", e);
  }

  // Team chain: A = direct, B = parent of A, C = parent of B
  const chain: { userId: string; level: "A" | "B" | "C" }[] = [];
  let cursor = buyer.referredById;
  const levels: ("A" | "B" | "C")[] = ["A", "B", "C"];
  for (const level of levels) {
    if (!cursor) break;
    chain.push({ userId: cursor, level });
    const parent = await prisma.user.findUnique({
      where: { id: cursor },
      select: { referredById: true },
    });
    cursor = parent?.referredById || null;
  }

  for (const { userId, level } of chain) {
    const hours = VPN_REFERRAL_HOURS[level][tier];
    try {
      await extendVpnExpiry(userId, hours);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "VpnBonusLog" (id, user_id, from_user_id, team_level, amount_paid, bonus_hours, payment_request_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        randomUUID(),
        userId,
        opts.buyerId,
        level,
        opts.amount,
        hours,
        opts.paymentRequestId
      );
    } catch (e) {
      console.error("vpn bonus", level, e);
    }
  }
}

export async function logVpnEvent(opts: {
  kind: "view" | "click" | "pay";
  sessionId?: string | null;
  userId?: string | null;
  path?: string;
  meta?: string;
}) {
  await ensureVpnTables();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "VpnEvent" (id, kind, session_id, user_id, path, meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      randomUUID(),
      opts.kind,
      opts.sessionId || null,
      opts.userId || null,
      opts.path || "/vpn",
      opts.meta || null
    );
  } catch (e) {
    console.error("logVpnEvent", e);
  }
}
