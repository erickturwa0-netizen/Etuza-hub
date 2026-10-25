import { NextResponse } from "next/server";

/**
 * Returns Google OAuth Web Client ID for GIS button.
 * Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel env.
 * Find it: Firebase Console → Authentication → Sign-in method → Google
 *   → Web SDK configuration → Web client ID
 */
export async function GET() {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "";

  return NextResponse.json({
    clientId: clientId || null,
    hint: clientId
      ? null
      : "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID = Web client ID from Firebase Google provider",
  });
}
