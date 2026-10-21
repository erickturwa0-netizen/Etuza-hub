/** Placeholder covers when a channel/station has no logo */

export function avatarCover(
  name: string,
  opts?: { bg?: string; color?: string; size?: number }
): string {
  const n = encodeURIComponent((name || "TV").slice(0, 28).trim() || "TV");
  const bg = opts?.bg || "1e293b";
  const color = opts?.color || "38bdf8";
  const size = opts?.size || 256;
  return `https://ui-avatars.com/api/?name=${n}&background=${bg}&color=${color}&size=${size}&bold=true&format=png`;
}

export function tvCover(title: string, existing?: string | null): string {
  if (existing && /^https?:\/\//i.test(existing)) return existing;
  // Group-ish colors by keyword
  const t = (title || "").toLowerCase();
  let bg = "1e293b";
  let color = "f87171"; // red-ish for TV
  if (t.includes("sport") || t.includes("fifa") || t.includes("bein") || t.includes("stadium"))
    color = "4ade80";
  if (t.includes("news") || t.includes("france") || t.includes("bbc") || t.includes("sabc"))
    color = "60a5fa";
  if (t.includes("nasa") || t.includes("wild"))
    color = "a78bfa";
  return avatarCover(title, { bg, color, size: 256 });
}

export function radioCover(name: string, existing?: string | null): string {
  if (existing && /^https?:\/\//i.test(existing) && !existing.includes("undefined"))
    return existing;
  return avatarCover(name, { bg: "831843", color: "ffffff", size: 128 });
}
