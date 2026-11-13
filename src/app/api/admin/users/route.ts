import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Raw SQL — schema may lack fullName / inviteCode columns that older code expected
    try {
      const rows = await prisma.$queryRaw<
        {
          id: string;
          email: string;
          name: string | null;
          role: string;
          points: number;
          created_at: Date;
        }[]
      >`
        SELECT id, email, name, role, points, created_at
        FROM "User"
        ORDER BY created_at DESC
        LIMIT 500
      `;

      const users = rows.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.name,
        name: u.name,
        role: u.role,
        points: u.points,
        createdAt: u.created_at,
      }));

      return NextResponse.json({ users, count: users.length });
    } catch (rawErr) {
      console.error("users raw", rawErr);
      // Fallback minimal prisma select
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
      return NextResponse.json({
        users: users.map((u) => ({
          ...u,
          fullName: u.name,
        })),
        count: users.length,
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load users", users: [] },
      { status: 500 }
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

    if (typeof points === "number") {
      await prisma.$executeRaw`
        UPDATE "User" SET points = ${points}, updated_at = NOW() WHERE id = ${userId}
      `;
    } else if (typeof addPoints === "number") {
      await prisma.$executeRaw`
        UPDATE "User" SET points = points + ${addPoints}, updated_at = NOW() WHERE id = ${userId}
      `;
    }
    if (role) {
      await prisma.$executeRaw`
        UPDATE "User" SET role = ${role}, updated_at = NOW() WHERE id = ${userId}
      `;
    }

    const rows = await prisma.$queryRaw<
      { id: string; email: string; points: number; role: string }[]
    >`
      SELECT id, email, points, role FROM "User" WHERE id = ${userId} LIMIT 1
    `;

    return NextResponse.json({ user: rows[0] || null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
