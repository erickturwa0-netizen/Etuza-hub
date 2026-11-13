import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Probe an API URL — returns status + body so admin sees live vs dead */
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

    const started = Date.now();
    try {
      const res = await fetch(target, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "ETUZA-HUB-Probe/1.0",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      const ms = Date.now() - started;
      const alive = res.ok;

      let pretty = text.slice(0, 8000);
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2).slice(0, 8000);
      } catch {
        /* keep raw */
      }

      return NextResponse.json({
        alive,
        status: res.status,
        statusText: res.statusText,
        contentType: ct,
        ms,
        body: pretty,
        sample: `Status: ${res.status}\n${pretty}`,
        message: alive
          ? `API hai ✓ (${res.status}, ${ms}ms)`
          : `API dead / error (${res.status}, ${ms}ms)`,
      });
    } catch (e) {
      const ms = Date.now() - started;
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({
        alive: false,
        status: 0,
        statusText: "FETCH_FAILED",
        contentType: "",
        ms,
        body: msg,
        sample: `Status: 0\n${msg}`,
        message: `API dead — ${msg}`,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
