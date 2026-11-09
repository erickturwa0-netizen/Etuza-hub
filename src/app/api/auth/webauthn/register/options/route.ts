import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  generateRegistrationOptions,
  getRpConfig,
  signChallenge,
} from "@/lib/webauthn";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Ingia kwanza (Google/email)" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User haipo" }, { status: 404 });
  }

  const existing = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
  });

  const { rpName, rpID } = getRpConfig(req);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.fullName || user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform", // fingerprint / Face ID on device
    },
  });

  const challengeToken = await signChallenge({
    kind: "reg",
    userId: user.id,
    challenge: options.challenge,
  });

  return NextResponse.json({ options, challengeToken });
}
