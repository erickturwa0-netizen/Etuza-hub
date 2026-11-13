import { prisma } from "@/lib/prisma";

/** Fallback store when User.points column is missing or not writable */
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
    await prisma.$executeRaw`
      INSERT INTO "ApiSource" (id, category, name, url, enabled, notes)
      VALUES (
        ${POINTS_SOURCE_ID},
        ${"other"},
        ${"User Points Store"},
        ${""},
        ${true},
        ${json}
      )
      ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes
    `;
    return;
  } catch (e) {
    console.error("writePointsMap tagged", e);
  }
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
}

/** Try DB column first; fall back to ApiSource JSON map */
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
    /* column missing */
  }
  const map = await readMap();
  return Number(map[userId] ?? 0) || 0;
}

export async function setUserPoints(
  userId: string,
  points: number
): Promise<number> {
  const value = Math.max(0, Math.floor(points));

  // 1) Prefer real column
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

  // 2) ApiSource JSON map
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

/** Merge points into user list rows */
export async function attachPointsToUsers<
  T extends { id: string; points?: number }
>(users: T[]): Promise<(T & { points: number })[]> {
  let map: PointsMap = {};
  try {
    map = await readMap();
  } catch {
    /* ignore */
  }

  return users.map((u) => {
    const fromCol = Number(u.points);
    const fromMap = Number(map[u.id]);
    // Prefer higher of the two if both exist (admin may have set either)
    let points = 0;
    if (Number.isFinite(fromCol) && fromCol > 0) points = fromCol;
    if (Number.isFinite(fromMap) && fromMap > points) points = fromMap;
    if (!points && Number.isFinite(fromCol)) points = fromCol || 0;
    if (!points && Number.isFinite(fromMap)) points = fromMap || 0;
    return { ...u, points };
  });
}
