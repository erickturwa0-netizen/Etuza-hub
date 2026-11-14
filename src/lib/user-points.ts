import { prisma } from "@/lib/prisma";

/** Always read/write the real User.points column */
export async function getUserPoints(userId: string): Promise<number> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT COALESCE(points, 0) AS points FROM "User" WHERE id = $1 LIMIT 1`,
      userId
    )) as { points: number }[];
    if (rows[0]) return Number(rows[0].points) || 0;
  } catch (e) {
    console.error("getUserPoints", e);
  }
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return u?.points ?? 0;
  } catch {
    return 0;
  }
}

export async function setUserPoints(
  userId: string,
  points: number
): Promise<number> {
  const value = Math.max(0, Math.floor(points));

  // Primary: direct column update
  try {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET points = $1 WHERE id = $2`,
      value,
      userId
    );
    // verify
    const check = await getUserPoints(userId);
    if (check === value || Number(result) >= 0) return check || value;
  } catch (e) {
    console.error("setUserPoints raw", e);
  }

  try {
    const u = await prisma.user.update({
      where: { id: userId },
      data: { points: value },
      select: { points: true },
    });
    return u.points;
  } catch (e) {
    console.error("setUserPoints prisma", e);
    throw e;
  }
}

export async function addUserPoints(
  userId: string,
  delta: number
): Promise<number> {
  const d = Math.floor(delta);
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET points = GREATEST(0, COALESCE(points, 0) + $1) WHERE id = $2`,
      d,
      userId
    );
    return await getUserPoints(userId);
  } catch (e) {
    console.error("addUserPoints raw", e);
  }
  const current = await getUserPoints(userId);
  return setUserPoints(userId, current + d);
}

export async function attachPointsToUsers<
  T extends { id: string; points?: number }
>(users: T[]): Promise<(T & { points: number })[]> {
  return users.map((u) => ({
    ...u,
    points: Number(u.points ?? 0) || 0,
  }));
}
