import { prisma } from "@/lib/prisma";

let migrated = false;

/** Ensure User + related tables match what app code expects */
export async function ensureUserSchema() {
  if (migrated) return;
  try {
    // Core User table (if somehow missing)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password_hash" TEXT,
        "name" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "points" INTEGER NOT NULL DEFAULT 0,
        "google_id" TEXT UNIQUE,
        "avatar_url" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Align legacy columns ↔ Prisma schema
    for (const sql of [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_hash" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "full_name" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'user'`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "points" INTEGER DEFAULT 0`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "google_id" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invite_code" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referred_by_id" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "device_id" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "package_points" INTEGER DEFAULT 0`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "package_points_expires_at" TIMESTAMP`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
    ]) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        /* no permission / exists */
      }
    }

    // Sync name ↔ full_name so both Prisma and legacy SQL work
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "User"
        SET name = full_name
        WHERE (name IS NULL OR name = '')
          AND full_name IS NOT NULL
          AND full_name <> ''
      `);
    } catch {
      /* ignore */
    }
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "User"
        SET full_name = name
        WHERE (full_name IS NULL OR full_name = '')
          AND name IS NOT NULL
          AND name <> ''
      `);
    } catch {
      /* ignore */
    }

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

    for (const sql of [
      `ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "points_cost" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "api_source" TEXT`,
      `ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "vpn_packages" TEXT`,
      `ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "stream_status" TEXT`,
    ]) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        /* ignore */
      }
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
