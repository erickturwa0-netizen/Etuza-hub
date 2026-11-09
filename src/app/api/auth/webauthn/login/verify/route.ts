import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import {
  verifyAuthenticationResponse,
  getRpConfig,
  readChallenge,
  type AuthenticationResponseJSON,
} from "@/lib/webauthn";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const response = body?.response as AuthenticationResponseJSON | undefined;
  const challengeToken = String(body?.challengeToken || "");
  if (!response || !challengeToken) {
    return NextResponse.json({ error: "Data batili" }, { status: 400 });
  }

  const ch = await readChallenge<{
    kind: string;
    userId?: string | null;
    challenge: string;
  }>(challengeToken);
  if (!ch || ch.kind !== "auth") {
    return NextResponse.json({ error: "Challenge batili" }, { status: 400 });
  }

  const credId =
    typeof response.id === "string"
      ? response.id
      : Buffer.from(response.rawId as ArrayBuffer).toString("base64url");

  const stored = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: credId },
    include: { user: true },
  });
  if (!stored) {
    return NextResponse.json({ error: "Fingerprint haijasajiliwa" }, { status: 404 });
  }

  const { rpID, origin } = getRpConfig(req);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credentialId,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: stored.counter,
        transports: stored.transports
          ? (stored.transports.split(",") as AuthenticatorTransport[])
          : undefined,
      },
    });
  } catch (e) {
    console.error("webauthn auth verify", e);
    return NextResponse.json({ error: "Fingerprint haikukubaliwa" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const newCounter = verification.authenticationInfo.newCounter;
  await prisma.webAuthnCredential.update({
    where: { id: stored.id },
    data: { counter: newCounter },
  });

  const user = stored.user;
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
  });
}
