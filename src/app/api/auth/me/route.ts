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
        packagePoints: true,
        packagePointsExpiresAt: true,
        inviteCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Clear expired package points
    if (
      user.packagePoints > 0 &&
      user.packagePointsExpiresAt &&
      user.packagePointsExpiresAt <= new Date()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { packagePoints: 0, packagePointsExpiresAt: null },
      });
      user.packagePoints = 0;
      user.packagePointsExpiresAt = null;
    }

    if (!user.inviteCode) {
      try {
        let code = generateInviteCode();
        for (let i = 0; i < 5; i++) {
          const clash = await prisma.user.findFirst({
            where: { inviteCode: code },
          });
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
            packagePoints: true,
            packagePointsExpiresAt: true,
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
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        points: 0,
      },
    });
  }
}
