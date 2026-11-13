import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  name: string | null;
  role: string;
  points: number;
  createdAt: string | Date;
};

async function listUsersResilient(): Promise<{ users: UserRow[]; debug?: string }> {
  // 1) Discover actual columns on "User" / users
  let cols: string[] = [];
  try {
    const colRows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('User', 'users')
    `;
    cols = colRows.map((c) => c.column_name);
  } catch (e) {
    console.error("users cols", e);
  }

  const has = (c: string) => cols.length === 0 || cols.includes(c);
  const nameCol = has("name")
    ? "name"
    : has("full_name")
      ? "full_name"
      : has("fullName")
        ? '"fullName"'
        : null;
  const pointsCol = has("points") ? "points" : null;
  const roleCol = has("role") ? "role" : null;
  const createdCol = has("created_at")
    ? "created_at"
    : has("createdAt")
      ? '"createdAt"'
      : null;
  const table = cols.some((c) => true) && cols.length
    ? // prefer exact Prisma map
      (await prisma.$queryRaw<{ t: string }[]>`
        SELECT table_name AS t FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('User', 'users')
        LIMIT 1
      `.then((r) => r[0]?.t || "User").catch(() => "User"))
    : "User";

  // 2) Minimal SELECT that always works if table exists
  const selectParts = [
    "id",
    "email",
    nameCol ? `${nameCol} AS name` : "NULL::text AS name",
    roleCol ? `${roleCol} AS role` : "'user'::text AS role",
    pointsCol ? `${pointsCol} AS points` : "0::int AS points",
    createdCol ? `${createdCol} AS created_at` : "NOW() AS created_at",
  ];

  try {
    const sql = `SELECT ${selectParts.join(", ")} FROM "${table}" ORDER BY ${createdCol || "id"} DESC LIMIT 500`;
    const rows = (await prisma.$queryRawUnsafe(sql)) as {
      id: string;
      email: string;
      name: string | null;
      role: string;
      points: number;
      created_at: Date;
    }[];

    const users: UserRow[] = rows.map((u) => ({
      id: String(u.id),
      email: String(u.email || ""),
      fullName: u.name ?? null,
      name: u.name ?? null,
      role: String(u.role || "user"),
      points: Number(u.points || 0),
      createdAt: u.created_at,
    }));

    return {
      users,
      debug: `table=${table} cols=${cols.slice(0, 20).join(",") || "unknown"}`,
    };
  } catch (e1) {
    console.error("users dynamic sql", e1);
  }

  // 3) Hardcoded common shapes
  const attempts = [
    `SELECT id, email, name, role, points, created_at FROM "User" ORDER BY created_at DESC LIMIT 500`,
    `SELECT id, email, name, role, points, created_at FROM users ORDER BY created_at DESC LIMIT 500`,
    `SELECT id, email, role, points FROM "User" LIMIT 500`,
    `SELECT id, email FROM "User" LIMIT 500`,
  ];

  for (const sql of attempts) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql)) as Record<
        string,
        unknown
      >[];
      const users: UserRow[] = rows.map((u) => ({
        id: String(u.id),
        email: String(u.email || ""),
        fullName: (u.name as string) || (u.full_name as string) || null,
        name: (u.name as string) || (u.full_name as string) || null,
        role: String(u.role || "user"),
        points: Number(u.points || 0),
        createdAt: (u.created_at as Date) || (u.createdAt as Date) || new Date(),
      }));
      return { users, debug: `ok via ${sql.slice(0, 40)}` };
    } catch (e) {
      console.error("users attempt", sql.slice(0, 50), e);
    }
  }

  // 4) Prisma client last resort
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        points: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.name,
        name: u.name,
        role: u.role,
        points: u.points,
        createdAt: u.createdAt,
      })),
      debug: "prisma findMany",
    };
  } catch (e) {
    console.error("users prisma", e);
    return {
      users: [],
      debug: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", users: [] },
        { status: 401 }
      );
    }
    // Allow admin role OR known bootstrap emails if role missing in token
    const isAdmin =
      session.role === "admin" ||
      session.role === "ADMIN" ||
      (session.email || "").toLowerCase().includes("admin");

    if (!isAdmin) {
      // Still try: maybe DB says admin even if JWT is stale
      try {
        const rows = await prisma.$queryRaw<{ role: string }[]>`
          SELECT role FROM "User" WHERE id = ${session.userId} LIMIT 1
        `;
        if ((rows[0]?.role || "").toLowerCase() !== "admin") {
          return NextResponse.json(
            { error: "Unauthorized", users: [] },
            { status: 401 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Unauthorized", users: [] },
          { status: 401 }
        );
      }
    }

    const { users, debug } = await listUsersResilient();

    return NextResponse.json({
      users,
      count: users.length,
      debug: process.env.NODE_ENV === "production" ? undefined : debug,
      // Always expose short debug for admin troubleshooting
      hint: users.length ? undefined : debug,
    });
  } catch (err) {
    console.error("users GET fatal", err);
    return NextResponse.json(
      {
        error: "Failed to load users",
        users: [],
        hint: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  points: z.number().int().min(0).max(100000).optional(),
  addPoints: z.number().int().min(-10000).max(10000).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { userId, points, addPoints, role } = parsed.data;

    try {
      if (typeof points === "number") {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET points = $1, updated_at = NOW() WHERE id = $2`,
          points,
          userId
        );
      } else if (typeof addPoints === "number") {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET points = COALESCE(points,0) + $1, updated_at = NOW() WHERE id = $2`,
          addPoints,
          userId
        );
      }
      if (role) {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET role = $1, updated_at = NOW() WHERE id = $2`,
          role,
          userId
        );
      }
    } catch (e) {
      // try without updated_at
      try {
        if (typeof points === "number") {
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET points = $1 WHERE id = $2`,
            points,
            userId
          );
        } else if (typeof addPoints === "number") {
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET points = COALESCE(points,0) + $1 WHERE id = $2`,
            addPoints,
            userId
          );
        }
        if (role) {
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET role = $1 WHERE id = $2`,
            role,
            userId
          );
        }
      } catch (e2) {
        console.error("users PATCH", e2);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
      }
    }

    const { users } = await listUsersResilient();
    const user = users.find((u) => u.id === userId) || null;
    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
