/** Adsterra publisher monetization */

/** Smartlink — open before movie / for points reward */
export const PRE_ROLL_AD_URL =
  process.env.NEXT_PUBLIC_PRE_ROLL_AD_URL ||
  "https://araplhn.org/4/84838656addad18d2d6bde883ce1c02d";

/** Social Bar script (Adsterra) */
export const SOCIAL_BAR_SCRIPT =
  process.env.NEXT_PUBLIC_SOCIAL_BAR_SCRIPT ||
  "https://bauval.org/14/19842bc968ebf6b7ab95e095cc065373";

/** Popunder script (Adsterra) */
export const POPUNDER_SCRIPT =
  process.env.NEXT_PUBLIC_POPUNDER_SCRIPT ||
  "https://abscloud.org/1/40a2e8fb8de8383aecf62857df61188a";

/** Seconds user must wait after opening smartlink */
export const PRE_ROLL_SECONDS = Number(
  process.env.NEXT_PUBLIC_PRE_ROLL_SECONDS || 12
);

export function preRollStorageKey(contentKey: string) {
  return `etuza_preroll_ok_${contentKey}`;
}
