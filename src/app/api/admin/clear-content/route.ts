import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["movie", "tv", "radio", "game", "vpn", "music", "drama"]),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Type si sahihi" }, { status: 400 });
    }

    const result = await prisma.content.deleteMany({
      where: { type: parsed.data.type },
    });

    // Clear API URL for that category
    await prisma.apiSource.updateMany({
      where: { category: parsed.data.type },
      data: { url: "", notes: `Cleared ${new Date().toISOString()}` },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      type: parsed.data.type,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
