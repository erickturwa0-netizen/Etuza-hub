/** Publisher monetization — pre-roll before movie/series */

export const PRE_ROLL_AD_URL =
  process.env.NEXT_PUBLIC_PRE_ROLL_AD_URL ||
  "https://araplhn.org/4/84838656addad18d2d6bde883ce1c02d";

/** Seconds user must wait after opening the ad */
export const PRE_ROLL_SECONDS = Number(
  process.env.NEXT_PUBLIC_PRE_ROLL_SECONDS || 15
);

export function preRollStorageKey(contentKey: string) {
  return `etuza_preroll_ok_${contentKey}`;
}
