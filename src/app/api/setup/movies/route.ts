import { NextResponse } from "next/server";
import { importElitePlexMovies } from "@/lib/eliteplex";

/** Force reseed playable classics only */
export async function GET() {
  try {
    const total = await importElitePlexMovies(true);
    return NextResponse.json({
      ok: true,
      total,
      message: `${total} classics zimewekwa — movie zisizocheza zimeondolewa`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "fail",
      },
      { status: 500 }
    );
  }
}
