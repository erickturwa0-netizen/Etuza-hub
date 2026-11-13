import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Fetch Open Graph / favicon image for a game or page URL */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const target = (searchParams.get("url") || "").trim();
    if (!target || !/^https?:\/\//i.test(target)) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const res = await fetch(target, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; ETUZA-HUB/1.0; +https://etuza-hub-v2.vercel.app)",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });

    const html = await res.text();
    const base = new URL(target);

    function abs(u: string) {
      try {
        return new URL(u, base).href;
      } catch {
        return u;
      }
    }

    function meta(prop: string) {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
        "i"
      );
      const m = html.match(re) || html.match(re2);
      return m?.[1]?.trim() || "";
    }

    const image =
      meta("og:image") ||
      meta("twitter:image") ||
      meta("twitter:image:src") ||
      "";

    let title =
      meta("og:title") ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();

    let favicon = "";
    const icon =
      html.match(
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
      ) ||
      html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i
      );
    if (icon?.[1]) favicon = abs(icon[1]);

    const cover = image ? abs(image) : favicon || null;

    return NextResponse.json({
      image: cover,
      title: title || null,
      favicon: favicon || null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        image: null,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 }
    );
  }
}
