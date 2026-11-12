import { NextResponse } from "next/server";
import { rebuildCatalog } from "@/lib/seed-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Public one-shot catalog rebuild (Bongo off, movies+radio+games on) */
export async function GET() {
  try {
    const result = await rebuildCatalog();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
