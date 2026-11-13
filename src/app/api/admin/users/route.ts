import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { ensureUserSchema } from "@/lib/db-migrate";

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
  // Prefer COALESCE so either name or full_name works
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
    `SELECT id, email FROM "User" LIMIT 500`,
  ];

  for (const sql of attempts) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql)) as Record<
        string,
        unknown
      >[];
      return {
        users: rows.map((u) => ({
          id: String(u.id),
          email: String(u.email || ""),
          fullName: (u.name as string) || null,
          name: (u.name as string) || null,
          role: String(u.role || "user"),
          points: Number(u.points || 0),
          createdAt: (u.created_at as Date) || new Date(),
        })),
      };
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
    };
  } catch (e) {
    return {
      users: [],
      hint: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET() {
  try {
    await ensureUserSchema();

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
    await ensureUserSchema();
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
    } catch (e) {
      console.error("users PATCH", e);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    const { users } = await listUsers();
    return NextResponse.json({
      user: users.find((u) => u.id === userId) || null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
