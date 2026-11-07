/**
 * Signed stream tokens — clients never see raw CDN/API media URLs.
 * Uses AES-256-GCM with key derived from AUTH_SECRET / STREAM_SECRET.
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function secretKey(): Buffer {
  const raw =
    process.env.STREAM_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "etuza-stream-dev-secret-change-me";
  return createHash("sha256").update(raw).digest();
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export type StreamPayload = {
  u: string; // url
  e: number; // exp ms
};

/** Encrypt media URL → opaque token (safe for query string) */
export function encryptStreamUrl(url: string, ttlMs = TTL_MS): string {
  const payload: StreamPayload = {
    u: url.slice(0, 4000),
    e: Date.now() + ttlMs,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const pt = Buffer.from(JSON.stringify(payload), "utf8");
  const enc = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return b64url(Buffer.concat([iv, tag, enc]));
}

/** Decrypt token → raw URL or null if invalid/expired */
export function decryptStreamToken(token: string): string | null {
  try {
    const buf = fromB64url(token.trim());
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(data), decipher.final()]);
    const payload = JSON.parse(pt.toString("utf8")) as StreamPayload;
    if (!payload?.u || typeof payload.u !== "string") return null;
    if (!/^https?:\/\//i.test(payload.u)) return null;
    if (typeof payload.e === "number" && Date.now() > payload.e) return null;
    return payload.u;
  } catch {
    return null;
  }
}

/** Public playback path (no raw CDN in network tab path beyond token) */
export function proxiedStreamPath(url: string): string {
  if (!url) return url;
  if (url.startsWith("/api/proxy/stream")) return url;
  // youtube / social embeds stay as-is (iframe hosts)
  if (
    /youtube\.com|youtu\.be|vimeo\.com|facebook\.com|tiktok\.com|instagram\.com/i.test(
      url
    )
  ) {
    return url;
  }
  const t = encryptStreamUrl(url);
  return `/api/proxy/stream?t=${encodeURIComponent(t)}`;
}

/** Sanitize content row for public JSON (hide raw linkUrl) */
export function sanitizeContentForClient<T extends Record<string, unknown>>(
  item: T,
  opts?: { admin?: boolean }
): T {
  if (opts?.admin) return item;
  const linkUrl = typeof item.linkUrl === "string" ? item.linkUrl : "";
  const linkType = String(item.linkType || "stream");
  const out = { ...item } as T & {
    linkUrl?: string;
    fileUrl?: string | null;
    configText?: string | null;
  };

  if (linkUrl && linkType === "stream" && /^https?:\/\//i.test(linkUrl)) {
    out.linkUrl = proxiedStreamPath(linkUrl);
  }
  // Never expose raw file CDN for paid vpn configs to public lists
  if (out.fileUrl && typeof out.fileUrl === "string" && /^https?:\/\//i.test(out.fileUrl)) {
    if (String(item.type) === "vpn") {
      out.fileUrl = null;
    }
  }
  // Strip long config blobs from list payloads
  if (out.configText && String(out.configText).length > 0) {
    out.configText = null;
  }
  return out;
}

export function maskApiUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/***(encrypted)`;
  } catch {
    return "***(encrypted)";
  }
}
