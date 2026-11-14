import { prisma } from "@/lib/prisma";

const POINTS_SOURCE_ID = "sys_user_points";

type PointsMap = Record<string, number>;

async function readMap(): Promise<PointsMap> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT notes FROM "ApiSource" WHERE id = $1 LIMIT 1`,
      POINTS_SOURCE_ID
    )) as { notes: string | null }[];
    if (rows[0]?.notes) {
      const parsed = JSON.parse(rows[0].notes) as PointsMap;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.error("readPointsMap", e);
  }
  return {};
}

async function writeMap(map: PointsMap): Promise<void> {
  const json = JSON.stringify(map);
  try {
    await prisma.apiSource.upsert({
      where: { id: POINTS_SOURCE_ID },
      create: {
        id: POINTS_SOURCE_ID,
        category: "other",
        name: "User Points Store",
        url: "",
        enabled: true,
        notes: json,
      },
      update: { notes: json },
    });
  } catch (e) {
    console.error("writePointsMap", e);
    throw e;
  }
}

/** DB already has User.points — use it first */
export async function getUserPoints(userId: string): Promise<number> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT points FROM "User" WHERE id = $1 LIMIT 1`,
      userId
    )) as { points: number | null }[];
    if (rows[0] && rows[0].points != null) {
      return Number(rows[0].points) || 0;
    }
  } catch {
    /* ignore */
  }
  const map = await readMap();
  return Number(map[userId] ?? 0) || 0;
}

export async function setUserPoints(
  userId: string,
  points: number
): Promise<number> {
  const value = Math.max(0, Math.floor(points));

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET points = $1 WHERE id = $2`,
      value,
      userId
    );
    return value;
  } catch (e) {
    console.error("setUserPoints column", e);
  }

  const map = await readMap();
  map[userId] = value;
  await writeMap(map);
  return value;
}

export async function addUserPoints(
  userId: string,
  delta: number
): Promise<number> {
  const current = await getUserPoints(userId);
  return setUserPoints(userId, current + delta);
}

export async function attachPointsToUsers<
  T extends { id: string; points?: number }
>(users: T[]): Promise<(T & { points: number })[]> {
  return users.map((u) => ({
    ...u,
    points: Number(u.points ?? 0) || 0,
  }));
}
