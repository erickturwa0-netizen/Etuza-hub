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
    let user = await prisma.user.findUnique({
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

    // Backfill invite code for old accounts
    if (!user.inviteCode) {
      let code = generateInviteCode();
      for (let i = 0; i < 5; i++) {
        const clash = await prisma.user.findFirst({ where: { inviteCode: code } });
        if (!clash) break;
        code = generateInviteCode();
      }
      user = await prisma.user.update({
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
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("me", e);
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
        points: 0,
        inviteCode: null,
      },
    });
  }
}
