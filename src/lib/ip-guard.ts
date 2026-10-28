import { prisma } from "@/lib/prisma";

/** Client IP from common proxy headers (Vercel). */
export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = req.headers.get("x-real-ip") || "";
  if (real) return real.trim().slice(0, 64);
  const cf = req.headers.get("cf-connecting-ip") || "";
  if (cf) return cf.trim().slice(0, 64);
  return "unknown";
}

export async function ensureIpColumns() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS last_ip TEXT`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP(3)`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "User_last_ip_idx" ON "User"(last_ip)`
    );
  } catch {
    /* ignore */
  }
}

/**
 * Block second account on same IP.
 * Admin role is exempt.
 * Returns error message in Swahili if blocked.
 */
export async function assertIpAllowed(
  userId: string,
  role: string,
  ip: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureIpColumns();
  if (!ip || ip === "unknown") return { ok: true };
  if (role === "admin") {
    await recordIp(userId, ip);
    return { ok: true };
  }

  try {
    // Another non-admin user already holds this IP (active in last 48h)
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, email, role, last_login_at FROM "User"
       WHERE last_ip = $1 AND id <> $2
         AND (role IS NULL OR role <> 'admin')
         AND (
           last_login_at IS NULL
           OR last_login_at > NOW() - INTERVAL '48 hours'
         )
       LIMIT 1`,
      ip,
      userId
    )) as { id: string; email: string }[];

    if (rows[0]) {
      return {
        ok: false,
        error:
          "IP hii tayari inatumia account nyingine. Huwezi fungua account mbili kwa mtandao/IP moja. Zima VPN au tumia mtandao mwingine, au toka kwenye account ya kwanza.",
      };
    }
  } catch (e) {
    console.error("assertIpAllowed", e);
  }

  await recordIp(userId, ip);
  return { ok: true };
}

export async function recordIp(userId: string, ip: string) {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET last_ip = $1, last_login_at = NOW() WHERE id = $2`,
      ip,
      userId
    );
  } catch (e) {
    console.error("recordIp", e);
  }
}
