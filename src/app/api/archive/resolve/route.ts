import { NextResponse } from "next/server";

/** Internet Archive resolve removed */
export async function GET() {
  return NextResponse.json(
    { error: "Internet Archive imondolewa" },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Internet Archive imondolewa" },
    { status: 410 }
  );
}
