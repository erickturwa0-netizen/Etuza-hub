import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { ensureUserSchema } from "@/lib/db-migrate";
import {
  attachPointsToUsers,
  setUserPoints,
  addUserPoints,
} from "@/lib/user-points";

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

async function listUsers(): Promise<{ users: UserRow[]; hint?: string }> {
  const attempts = [
    `SELECT id, email,
            COALESCE(NULLIF(name,''), NULLIF(full_name,''), email) AS name,
            COALESCE(role, 'user') AS role,
            COALESCE(points, 0) AS points,
            COALESCE(created_at, NOW()) AS created_at
     FROM "User"
     ORDER BY COALESCE(created_at, NOW()) DESC
     LIMIT 500`,
    `SELECT id, email, name, role, points, created_at FROM "User" ORDER BY created_at DESC LIMIT 500`,
    `SELECT id, email, full_name AS name, role, points, created_at FROM "User" ORDER BY created_at DESC LIMIT 500`,
    `SELECT id, email, full_name AS name, role, 0 AS points, NOW() AS created_at FROM "User" LIMIT 500`,
    `SELECT id, email, name, role, 0 AS points, NOW() AS created_at FROM "User" LIMIT 500`,
    `SELECT id, email FROM "User" LIMIT 500`,
  ];

  for (const sql of attempts) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql)) as Record<
        string,
        unknown
      >[];
      let users: UserRow[] = rows.map((u) => ({
        id: String(u.id),
        email: String(u.email || ""),
        fullName: (u.name as string) || null,
        name: (u.name as string) || null,
        role: String(u.role || "user"),
        points: Number(u.points || 0),
        createdAt: (u.created_at as Date) || new Date(),
      }));
      users = await attachPointsToUsers(users);
      return { users };
    } catch (e) {
      console.error("listUsers attempt", e);
    }
  }

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
    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.name,
      name: u.name,
      role: u.role,
      points: u.points,
      createdAt: u.createdAt,
    }));
    return { users: await attachPointsToUsers(mapped) };
  } catch (e) {
    return {
      users: [],
      hint: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET() {
  try {
    try {
      await ensureUserSchema();
    } catch {
      /* may lack DDL perms */
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", users: [] },
        { status: 401 }
      );
    }

    let isAdmin = session.role === "admin" || session.role === "ADMIN";
    if (!isAdmin) {
      try {
        const rows = await prisma.$queryRawUnsafe<{ role: string }[]>(
          `SELECT role FROM "User" WHERE id = $1 LIMIT 1`,
          session.userId
        );
        isAdmin = (rows[0]?.role || "").toLowerCase() === "admin";
      } catch {
        isAdmin = false;
      }
    }
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized", users: [] },
        { status: 401 }
      );
    }

    const { users, hint } = await listUsers();
    return NextResponse.json({
      users,
      count: users.length,
      hint: users.length ? undefined : hint,
    });
  } catch (err) {
    console.error("users GET", err);
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

    let newPoints: number | null = null;
    try {
      if (typeof points === "number") {
        newPoints = await setUserPoints(userId, points);
      } else if (typeof addPoints === "number") {
        newPoints = await addUserPoints(userId, addPoints);
      }
    } catch (e) {
      console.error("points update", e);
      return NextResponse.json(
        {
          error: "Imeshindikana kuongeza points",
          hint: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      );
    }

    if (role) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET role = $1 WHERE id = $2`,
          role,
          userId
        );
      } catch (e) {
        console.error("role update", e);
      }
    }

    const { users } = await listUsers();
    const user = users.find((u) => u.id === userId) || null;
    return NextResponse.json({
      user: user
        ? { ...user, points: newPoints ?? user.points }
        : { id: userId, points: newPoints },
      points: newPoints,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Failed",
        hint: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
