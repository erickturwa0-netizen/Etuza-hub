import { prisma } from "@/lib/prisma";

let migrated = false;

export async function ensureUserSchema() {
  if (migrated) return;
  try {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ApiSource" DROP CONSTRAINT IF EXISTS "ApiSource_category_key"`
      );
    } catch {
      /* ignore */
    }
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ApiSource_category_idx" ON "ApiSource"("category")`
      );
    } catch {
      /* ignore */
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PointLog" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "reason" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AiUsage" (
        "id" TEXT PRIMARY KEY,
        "session_id" TEXT NOT NULL,
        "user_id" TEXT,
        "kind" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WebAuthnCredential" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "credential_id" TEXT NOT NULL UNIQUE,
        "public_key" TEXT NOT NULL,
        "counter" BIGINT NOT NULL DEFAULT 0,
        "transports" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    migrated = true;
  } catch (e) {
    console.error("ensureUserSchema", e);
  }
}
