import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { SignJWT, jwtVerify } from "jose";

function secret() {
  const s =
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "etuza-webauthn-dev-secret";
  return new TextEncoder().encode(s.slice(0, 64));
}

export function getRpConfig(req: Request) {
  const url = new URL(req.url);
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    url.host
  )
    .split(",")[0]
    .trim();
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  // RP ID = hostname without port
  const rpID = host.split(":")[0];
  return {
    rpName: "ETUZA HUB",
    rpID,
    origin: origin.replace(/\/$/, ""),
  };
}

export async function signChallenge(
  data: Record<string, unknown>,
  ttlSec = 300
) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret());
}

export async function readChallenge<T extends Record<string, unknown>>(
  token: string
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
};
export type { RegistrationResponseJSON, AuthenticationResponseJSON };
