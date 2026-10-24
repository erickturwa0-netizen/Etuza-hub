/** Custom section icons (user-provided) */

export const CATEGORY_ICONS = {
  movie: "https://files.catbox.moe/5mlzyq.png",
  tv: "https://files.catbox.moe/8uc25q.png",
  drama: "https://files.catbox.moe/epp0oc.png",
  music: "https://files.catbox.moe/gmndvd.png",
  radio: "https://files.catbox.moe/hiwv5k.png",
} as const;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;
