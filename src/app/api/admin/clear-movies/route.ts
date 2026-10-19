import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Admin: delete ALL movie content + reset movie API URL */
export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await prisma.content.deleteMany({ where: { type: "movie" } });

    await prisma.apiSource.upsert({
      where: { category: "movie" },
      create: {
        category: "movie",
        name: "Movies API",
        url: "",
        notes: "movies-wiped-v2-awaiting-new-api",
        enabled: true,
      },
      update: {
        url: "",
        name: "Movies API",
        notes: "movies-wiped-v2-awaiting-new-api",
        enabled: true,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: deleted.count,
      message: `${deleted.count} movies zimefutwa. Weka API mpya kwenye Settings.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
