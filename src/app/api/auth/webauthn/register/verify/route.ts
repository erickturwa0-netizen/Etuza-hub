import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  verifyRegistrationResponse,
  getRpConfig,
  readChallenge,
  type RegistrationResponseJSON,
} from "@/lib/webauthn";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Ingia kwanza" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const response = body?.response as RegistrationResponseJSON | undefined;
  const challengeToken = String(body?.challengeToken || "");
  if (!response || !challengeToken) {
    return NextResponse.json({ error: "Data batili" }, { status: 400 });
  }

  const ch = await readChallenge<{ kind: string; userId: string; challenge: string }>(
    challengeToken
  );
  if (!ch || ch.kind !== "reg" || ch.userId !== session.userId) {
    return NextResponse.json({ error: "Challenge imeisha / batili" }, { status: 400 });
  }

  const { rpID, origin } = getRpConfig(req);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (e) {
    console.error("webauthn reg verify", e);
    return NextResponse.json({ error: "Fingerprint haikuthibitishwa" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const credentialId =
    typeof credential.id === "string"
      ? credential.id
      : Buffer.from(credential.id).toString("base64url");

  const publicKey = Buffer.from(credential.publicKey).toString("base64url");

  await prisma.webAuthnCredential.upsert({
    where: { credentialId },
    create: {
      userId: session.userId,
      credentialId,
      publicKey,
      counter: credential.counter ?? 0,
      deviceType: credentialDeviceType || null,
      backedUp: !!credentialBackedUp,
      transports: response.response?.transports?.join(",") || null,
    },
    update: {
      publicKey,
      counter: credential.counter ?? 0,
      deviceType: credentialDeviceType || null,
      backedUp: !!credentialBackedUp,
    },
  });

  return NextResponse.json({ ok: true, message: "Fingerprint imesajiliwa" });
}
