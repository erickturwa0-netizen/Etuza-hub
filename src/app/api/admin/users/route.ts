import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        points: true,
        inviteCode: true,
        referredById: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  points: z.number().int().min(0).max(100000).optional(),
  addPoints: z.number().int().min(-10000).max(10000).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

/** Admin: set / add points or change role */
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
    const data: { points?: number | { increment: number }; role?: string } = {};

    if (typeof points === "number") data.points = points;
    else if (typeof addPoints === "number") data.points = { increment: addPoints };
    if (role) data.role = role;

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "Hakuna mabadiliko" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        points: true,
        role: true,
      },
    });

    if (typeof points === "number" || typeof addPoints === "number") {
      const amount =
        typeof addPoints === "number"
          ? addPoints
          : typeof points === "number"
            ? points
            : 0;
      await prisma.pointLog.create({
        data: {
          userId,
          amount: typeof addPoints === "number" ? addPoints : 0,
          reason: "admin_adjust",
          meta: `Admin ${session.email} · set=${points ?? "—"} add=${addPoints ?? "—"}`,
        },
      }).catch(() => {});
      void amount;
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
