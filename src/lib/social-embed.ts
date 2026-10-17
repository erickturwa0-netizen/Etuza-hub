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
  // bare 11-char id
  if (/^[\w-]{11}$/.test(s)) return s;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/embed\/([\w-]{11})/i,
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
  // query param anywhere
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function detectSocial(url: string): {
  kind: SocialKind;
  embedUrl: string | null;
  id: string | null;
} {
  const u = url.trim();
  if (!u) return { kind: null, embedUrl: null, id: null };

  const id = ytId(u);
  if (id) {
    return {
      kind: "youtube",
      id,
      embedUrl:
        `https://www.youtube-nocookie.com/embed/${id}` +
        `?autoplay=0&modestbranding=1&rel=0&playsinline=1&controls=1&fs=1`,
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
