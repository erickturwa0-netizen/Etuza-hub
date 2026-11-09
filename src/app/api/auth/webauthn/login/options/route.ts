import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateAuthenticationOptions,
  getRpConfig,
  signChallenge,
} from "@/lib/webauthn";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();

  const { rpID } = getRpConfig(req);

  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransport[] }[]
    | undefined;

  let userId: string | undefined;

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Hakuna account / fingerprint kwa email hii" },
        { status: 404 }
      );
    }
    userId = user.id;
    const creds = await prisma.webAuthnCredential.findMany({
      where: { userId: user.id },
    });
    if (!creds.length) {
      return NextResponse.json(
        {
          error:
            "Bado hujasajili fingerprint. Ingia kwa Google kisha Account → Sajili Fingerprint",
        },
        { status: 400 }
      );
    }
    allowCredentials = creds.map((c) => ({
      id: c.credentialId,
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials,
  });

  const challengeToken = await signChallenge({
    kind: "auth",
    userId: userId || null,
    challenge: options.challenge,
  });

  return NextResponse.json({ options, challengeToken });
}
