import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ingia kwanza" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const contentKey = String(body?.contentKey || "").slice(0, 120);
    const contentTitle = String(body?.contentTitle || "Content").slice(0, 200);
    const contentType = String(body?.contentType || "movie").slice(0, 40);
    const contentId = body?.contentId ? String(body.contentId).slice(0, 40) : null;
    const note = body?.note ? String(body.note).slice(0, 1000) : null;
    const screenshotUrl = body?.screenshotUrl
      ? String(body.screenshotUrl).slice(0, 2_000_000)
      : null;

    if (!contentKey) {
      return NextResponse.json({ error: "contentKey required" }, { status: 400 });
    }

    const report = await prisma.playbackReport.create({
      data: {
        userId: session.userId,
        contentId,
        contentKey,
        contentTitle,
        contentType,
        note,
        screenshotUrl,
        status: "pending",
        refundPoints: 1,
      },
    });

    return NextResponse.json({ ok: true, id: report.id });
  } catch (e) {
    console.error("playback report", e);
    return NextResponse.json({ error: "Imeshindikana" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.playbackReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, fullName: true, points: true } },
    },
  });

  return NextResponse.json({ reports });
}
