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
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS device_id TEXT`
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
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "User_device_id_idx" ON "User"(device_id)`
    );
  } catch {
    /* ignore */
  }
}

export async function recordDeviceAndIp(
  userId: string,
  ip: string,
  deviceId?: string | null
) {
  try {
    if (deviceId && deviceId.length >= 16) {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET last_ip = $1, last_login_at = NOW(), device_id = $2 WHERE id = $3`,
        ip || null,
        deviceId.slice(0, 64),
        userId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET last_ip = $1, last_login_at = NOW() WHERE id = $2`,
        ip || null,
        userId
      );
    }
  } catch (e) {
    console.error("recordDeviceAndIp", e);
  }
}

/**
 * One device OR one IP → one account (admin exempt).
 * Blocks second Gmail / second signup on same phone/browser.
 */
export async function assertDeviceAndIpAllowed(
  userId: string,
  role: string,
  ip: string,
  deviceId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureIpColumns();
  if (role === "admin") {
    await recordDeviceAndIp(userId, ip, deviceId);
    return { ok: true };
  }

  const did = (deviceId || "").trim().slice(0, 64);

  try {
    // 1) Same device already bound to another account
    if (did.length >= 16) {
      const byDevice = (await prisma.$queryRawUnsafe(
        `SELECT id, email FROM "User"
         WHERE device_id = $1 AND id <> $2
           AND (role IS NULL OR role <> 'admin')
         LIMIT 1`,
        did,
        userId
      )) as { id: string; email: string }[];

      if (byDevice[0]) {
        return {
          ok: false,
          error:
            "Kifaa hiki (simu/browser) tayari kimesajiliwa na account nyingine. Huwezi fungua Gmail au account mbili kwenye kifaa kimoja. Tumia account ya kwanza au kifaa kingine.",
        };
      }
    }

    // 2) Same IP active on another account (48h) — secondary net
    if (ip && ip !== "unknown") {
      const byIp = (await prisma.$queryRawUnsafe(
        `SELECT id, email FROM "User"
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

      if (byIp[0]) {
        return {
          ok: false,
          error:
            "Mtandao/IP hii tayari inatumia account nyingine. Huwezi fungua account mbili kwa IP moja. Zima VPN au tumia account ya kwanza.",
        };
      }
    }
  } catch (e) {
    console.error("assertDeviceAndIpAllowed", e);
  }

  await recordDeviceAndIp(userId, ip, did || null);
  return { ok: true };
}

/** @deprecated use assertDeviceAndIpAllowed */
export async function assertIpAllowed(
  userId: string,
  role: string,
  ip: string
) {
  return assertDeviceAndIpAllowed(userId, role, ip, null);
}

export async function recordIp(userId: string, ip: string) {
  await recordDeviceAndIp(userId, ip, null);
}
