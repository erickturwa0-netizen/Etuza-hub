import { prisma } from "@/lib/prisma";
import { ensureIpColumns } from "@/lib/ip-guard";

let migrated = false;

/** Ensure User points columns + PointLog + AiUsage + WebAuthn exist (idempotent). */
export async function ensureUserSchema() {
  if (migrated) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 10`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS invite_code TEXT`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS referred_by_id TEXT`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_invite_code_key" ON "User"(invite_code)`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PointLog" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        meta TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "PointLog_user_id_idx" ON "PointLog"(user_id)`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AiUsage" (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT,
        kind TEXT NOT NULL DEFAULT 'chat',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AiUsage_session_id_idx" ON "AiUsage"(session_id)`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AiUsage_user_id_idx" ON "AiUsage"(user_id)`
    );
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AiUsage_created_at_idx" ON "AiUsage"(created_at)`
    );
  } catch {
    /* ignore */
  }
  try {
    await ensureIpColumns();
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WebAuthnCredential" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        device_type TEXT,
        backed_up BOOLEAN NOT NULL DEFAULT false,
        transports TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "WebAuthnCredential_user_id_idx" ON "WebAuthnCredential"(user_id)`
    );
  } catch {
    /* ignore */
  }
  migrated = true;
}
