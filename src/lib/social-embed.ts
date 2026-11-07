export type SocialKind =
  | "youtube"
  | "facebook"
  | "vimeo"
  | "dailymotion"
  | "tiktok"
  | "instagram"
  | null;

function ytId(u: string): string | null {
  const s = u.trim();
  if (/^[\w-]{11}$/.test(s)) return s;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i,
    /youtube\.com\/live\/([\w-]{11})/i,
    /youtube\.com\/v\/([\w-]{11})/i,
    /m\.youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
    /music\.youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

/** Prefer youtube.com (more reliable in iframes than nocookie in some regions) */
export function youtubeEmbedUrl(
  id: string,
  opts?: { autoplay?: boolean; mirror?: "youtube" | "nocookie" }
): string {
  const host =
    opts?.mirror === "nocookie"
      ? "https://www.youtube-nocookie.com"
      : "https://www.youtube.com";
  const ap = opts?.autoplay ? "1" : "0";
  return (
    `${host}/embed/${id}` +
    `?autoplay=${ap}&modestbranding=1&rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1`
  );
}

export function youtubeEmbedMirrors(id: string): string[] {
  return [
    youtubeEmbedUrl(id, { mirror: "youtube" }),
    youtubeEmbedUrl(id, { mirror: "nocookie" }),
  ];
}

export function detectSocial(url: string): {
  kind: SocialKind;
  embedUrl: string | null;
  id: string | null;
  mirrors?: string[];
} {
  const u = url.trim();
  if (!u) return { kind: null, embedUrl: null, id: null };

  const id = ytId(u);
  if (id) {
    const mirrors = youtubeEmbedMirrors(id);
    return {
      kind: "youtube",
      id,
      embedUrl: mirrors[0],
      mirrors,
    };
  }

  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) {
    return {
      kind: "vimeo",
      id: vm[1],
      embedUrl: `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`,
    };
  }

  const dm = u.match(/dailymotion\.com\/video\/([\w]+)/i);
  if (dm) {
    return {
      kind: "dailymotion",
      id: dm[1],
      embedUrl: `https://www.dailymotion.com/embed/video/${dm[1]}`,
    };
  }

  if (/facebook\.com\//i.test(u) || /fb\.watch\//i.test(u) || /fb\.com\//i.test(u)) {
    return {
      kind: "facebook",
      id: null,
      embedUrl:
        "https://www.facebook.com/plugins/video.php?href=" +
        encodeURIComponent(u) +
        "&show_text=false&width=auto&t=0",
    };
  }

  const tt = u.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
  if (tt) {
    return {
      kind: "tiktok",
      id: tt[1],
      embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`,
    };
  }

  if (/instagram\.com\/(p|reel|tv)\//i.test(u)) {
    return {
      kind: "instagram",
      id: null,
      embedUrl: u.replace(/\/?$/, "/") + "embed",
    };
  }

  return { kind: null, embedUrl: null, id: null };
}

/** Music item should use VIDEO player (YouTube etc.) not audio-only */
export function isVideoMusicLink(
  link: string,
  category?: string | null
): boolean {
  const l = (link || "").toLowerCase();
  const c = (category || "").toLowerCase();
  if (/video/.test(c)) return true;
  if (/youtube|youtu\.be|youtube-nocookie|vimeo|dailymotion|tiktok|facebook\.com|fb\.watch/.test(l))
    return true;
  if (/\/embed\/[\w-]{11}/i.test(link || "")) return true;
  if (ytId(link)) return true;
  return false;
}
