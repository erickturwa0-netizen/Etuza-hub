import { NextResponse } from "next/server";
import { decryptStreamToken } from "@/lib/stream-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy HLS/media.
 * Prefer ?t=SIGNED_TOKEN (encrypted). Plain ?url= still works server-side
 * for internal rewrite of m3u8 segments only (segments use encrypted tokens too).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("t");
    let target = searchParams.get("url");

    if (token) {
      const decoded = decryptStreamToken(token);
      if (!decoded) {
        return NextResponse.json(
          { error: "Token batili au imeisha muda" },
          { status: 403 }
        );
      }
      target = decoded;
    }

    if (!target || !/^https?:\/\//i.test(target)) {
      return NextResponse.json({ error: "url/token required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }

    // Block private hosts
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host)
    ) {
      return NextResponse.json({ error: "blocked host" }, { status: 403 });
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
      const base = target.replace(/[^/]+$/, "");
      const origin = parsed.origin;

      const { encryptStreamUrl } = await import("@/lib/stream-token");

      const toProxy = (abs: string) => {
        const t = encryptStreamUrl(abs);
        return `/api/proxy/stream?t=${encodeURIComponent(t)}`;
      };

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
        return toProxy(abs);
      });

      text = lines
        .join("\n")
        .replace(/URI="([^"]+)"/gi, (_m, uri: string) => {
          let abs = uri;
          if (!/^https?:\/\//i.test(uri)) {
            abs = uri.startsWith("/") ? origin + uri : base + uri;
          }
          return `URI="${toProxy(abs)}"`;
        });

      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("proxy stream", e);
    return NextResponse.json({ error: "proxy failed" }, { status: 500 });
  }
}
