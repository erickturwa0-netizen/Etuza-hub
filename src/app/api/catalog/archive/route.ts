import { NextResponse } from "next/server";

/** Internet Archive catalog removed — admin supplies movie API */
export async function GET() {
  return NextResponse.json(
    {
      items: [],
      error: "Internet Archive imondolewa. Weka Movie API kwenye Admin → Settings.",
      source: null,
    },
    { status: 410 }
  );
}
