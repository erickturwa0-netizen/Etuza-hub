import { NextResponse } from "next/server";
import { domainFromTitle, hunterLogo, tvCover } from "@/lib/covers";

export const dynamic = "force-dynamic";

/** GET /api/covers/logo?title=France%2024 or ?domain=france24.com */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "").trim();
  const domainParam = (searchParams.get("domain") || "").trim();

  const domain = domainParam || (title ? domainFromTitle(title) : null);
  const logo = domain
    ? hunterLogo(domain)
    : title
      ? tvCover(title)
      : null;

  if (!logo) {
    return NextResponse.json({ error: "title or domain required" }, { status: 400 });
  }

  return NextResponse.json({ title: title || null, domain, logo });
}
