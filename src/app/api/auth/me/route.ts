import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/points";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        points: true,
        inviteCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Backfill invite code when column exists
    if (!user.inviteCode) {
      try {
        let code = generateInviteCode();
        for (let i = 0; i < 5; i++) {
          const clash = await prisma.user.findFirst({ where: { inviteCode: code } });
          if (!clash) break;
          code = generateInviteCode();
        }
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { inviteCode: code },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            points: true,
            inviteCode: true,
          },
        });
        return NextResponse.json({ user: updated });
      } catch {
        /* column may not exist */
      }
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("me", e);
    // Session still valid even if points columns missing
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
        points: 10,
        inviteCode: null,
      },
    });
  }
}
