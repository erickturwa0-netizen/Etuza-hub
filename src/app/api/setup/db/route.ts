import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * One-shot schema fix for production when prisma db push did not run.
 * GET /api/setup/db
 */
export async function GET() {
  const steps: string[] = [];
  try {
    // User.points
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 10`
      );
      steps.push("points: ok");
    } catch (e) {
      steps.push(`points: ${e instanceof Error ? e.message : "fail"}`);
    }

    // User.invite_code
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS invite_code TEXT`
      );
      steps.push("invite_code: ok");
    } catch (e) {
      steps.push(`invite_code: ${e instanceof Error ? e.message : "fail"}`);
    }

    // Unique index on invite_code (ignore if exists)
    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "User_invite_code_key" ON "User"(invite_code)`
      );
      steps.push("invite_code unique: ok");
    } catch (e) {
      steps.push(`invite_code unique: ${e instanceof Error ? e.message : "fail"}`);
    }

    // User.referred_by_id
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS referred_by_id TEXT`
      );
      steps.push("referred_by_id: ok");
    } catch (e) {
      steps.push(`referred_by_id: ${e instanceof Error ? e.message : "fail"}`);
    }

    // PointLog table
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
      steps.push("PointLog: ok");
    } catch (e) {
      steps.push(`PointLog: ${e instanceof Error ? e.message : "fail"}`);
    }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "PointLog_user_id_idx" ON "PointLog"(user_id)`
      );
      steps.push("PointLog index: ok");
    } catch (e) {
      steps.push(`PointLog index: ${e instanceof Error ? e.message : "fail"}`);
    }

    // ViewSession table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ViewSession" (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          section TEXT NOT NULL,
          title TEXT,
          path TEXT,
          last_seen TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      steps.push("ViewSession: ok");
    } catch (e) {
      steps.push(`ViewSession: ${e instanceof Error ? e.message : "fail"}`);
    }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "ViewSession_session_id_section_key" ON "ViewSession"(session_id, section)`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ViewSession_section_idx" ON "ViewSession"(section)`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ViewSession_last_seen_idx" ON "ViewSession"(last_seen)`
      );
      steps.push("ViewSession indexes: ok");
    } catch (e) {
      steps.push(`ViewSession indexes: ${e instanceof Error ? e.message : "fail"}`);
    }

    // Probe User read
    let userProbe = "fail";
    try {
      const n = await prisma.user.count();
      userProbe = `count=${n}`;
    } catch (e) {
      userProbe = e instanceof Error ? e.message : "fail";
    }

    return NextResponse.json({
      ok: true,
      steps,
      userProbe,
      hint: "Sasa jaribu signup tena",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
        steps,
      },
      { status: 500 }
    );
  }
}
