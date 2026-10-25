import { NextResponse } from "next/server";

/** Google OAuth Web Client ID (Firebase Google provider). */
const DEFAULT_CLIENT_ID =
  "611497432345-vddmu6fqjup24qa8retjp4gkv4kv7e4i.apps.googleusercontent.com";

export async function GET() {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    DEFAULT_CLIENT_ID;

  return NextResponse.json({ clientId });
}
