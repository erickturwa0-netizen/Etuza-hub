/** Client-only persistent device id (localStorage + cookie). */

const KEY = "etuza_device_id";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  ).slice(0, 32);
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(KEY) || "";
    if (!id || id.length < 16) {
      // migrate from cookie if present
      const m = document.cookie.match(/(?:^|;\s*)etuza_device_id=([^;]+)/);
      id = m?.[1] ? decodeURIComponent(m[1]) : "";
    }
    if (!id || id.length < 16) id = randomId();
    localStorage.setItem(KEY, id);
    document.cookie = `etuza_device_id=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax`;
    return id;
  } catch {
    return randomId();
  }
}
