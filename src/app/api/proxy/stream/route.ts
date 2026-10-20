import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Proxy HLS/m3u8 (and segments) to avoid browser CORS blocks */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target)) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }

    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        Referer: parsed.origin + "/",
        Origin: parsed.origin,
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream ${res.status}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const isPlaylist =
      contentType.includes("mpegurl") ||
      contentType.includes("m3u8") ||
      target.includes(".m3u8") ||
      contentType.includes("text/plain");

    if (isPlaylist) {
      let text = await res.text();
      // Rewrite relative + absolute segment URIs through proxy
      const base = target.replace(/[^/]+$/, "");
      const origin = parsed.origin;
      const lines = text.split(/\r?\n/).map((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return line;
        let abs = t;
        if (t.startsWith("http://") || t.startsWith("https://")) {
          abs = t;
        } else if (t.startsWith("/")) {
          abs = origin + t;
        } else {
          abs = base + t;
        }
        // Also rewrite URI="..." inside tags
        return `/api/proxy/stream?url=${encodeURIComponent(abs)}`;
      });

      // Rewrite URI="..." in EXT tags
      text = lines
        .join("\n")
        .replace(/URI="([^"]+)"/gi, (_m, uri: string) => {
          let abs = uri;
          if (!/^https?:\/\//i.test(uri)) {
            abs = uri.startsWith("/") ? origin + uri : base + uri;
          }
          return `URI="/api/proxy/stream?url=${encodeURIComponent(abs)}"`;
        });

      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Binary segment
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=10",
      },
    });
  } catch (e) {
    console.error("proxy/stream", e);
    return NextResponse.json({ error: "proxy failed" }, { status: 500 });
  }
}
