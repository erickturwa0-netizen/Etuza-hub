/** Detect social / video page URLs and map to embeddable iframe src */

export type SocialKind =
  | "youtube"
  | "facebook"
  | "vimeo"
  | "dailymotion"
  | "tiktok"
  | null;

export function detectSocial(url: string): { kind: SocialKind; embedUrl: string | null; id: string | null } {
  const u = url.trim();

  // YouTube
  const yt =
    u.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/i) ||
    u.match(/youtube\.com\/live\/([\w-]{6,})/i);
  if (yt) {
    const id = yt[1];
    // modestbranding + privacy domain – still shows some YT UI (ToS); best we can do legally
    const embedUrl =
      `https://www.youtube-nocookie.com/embed/${id}` +
      `?modestbranding=1&rel=0&playsinline=1&controls=1&fs=1&iv_load_policy=3&disablekb=0`;
    return { kind: "youtube", embedUrl, id };
  }

  // Vimeo
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) {
    return {
      kind: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vm[1]}?title=0&byline=0&portrait=0`,
      id: vm[1],
    };
  }

  // Dailymotion
  const dm = u.match(/dailymotion\.com\/video\/([\w]+)/i);
  if (dm) {
    return {
      kind: "dailymotion",
      embedUrl: `https://www.dailymotion.com/embed/video/${dm[1]}`,
      id: dm[1],
    };
  }

  // Facebook – official video embed
  if (/facebook\.com\/.+\/videos\//i.test(u) || /fb\.watch\//i.test(u) || /facebook\.com\/watch/i.test(u)) {
    const embedUrl =
      "https://www.facebook.com/plugins/video.php?href=" +
      encodeURIComponent(u) +
      "&show_text=false&width=auto";
    return { kind: "facebook", embedUrl, id: null };
  }

  // TikTok
  const tt = u.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
  if (tt) {
    return {
      kind: "tiktok",
      embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      id: tt[1],
    };
  }

  return { kind: null, embedUrl: null, id: null };
}
