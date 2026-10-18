import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { resolvePageDownloads } from "@/lib/resolve-downloads";

const schema = z.object({
  url: z.string().url(),
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
      return NextResponse.json({ error: "URL si sahihi" }, { status: 400 });
    }

    const result = await resolvePageDownloads(parsed.data.url);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Resolve failed", links: [] }, { status: 500 });
  }
}
