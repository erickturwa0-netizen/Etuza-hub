import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserSchema } from "@/lib/db-migrate";
import {
  generateAuthenticationOptions,
  getRpConfig,
  signChallenge,
} from "@/lib/webauthn";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await ensureUserSchema();
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Andika email yako kwanza ili tutafute fingerprint yako" },
      { status: 400 }
    );
  }

  const { rpID } = getRpConfig(req);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Hakuna account kwa email hii. Jisajili kwanza." },
      { status: 404 }
    );
  }

  const creds = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
  });
  if (!creds.length) {
    return NextResponse.json(
      {
        error:
          "Bado hujasajili fingerprint. Ingia kwa email/password → Account → Sajili Fingerprint.",
      },
      { status: 400 }
    );
  }

  const allowCredentials = creds.map((c) => ({
    id: c.credentialId,
    transports: c.transports
      ? (c.transports.split(",") as AuthenticatorTransport[])
      : undefined,
  }));

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials,
  });

  const challengeToken = await signChallenge({
    kind: "auth",
    userId: user.id,
    challenge: options.challenge,
  });

  return NextResponse.json({ options, challengeToken });
}
