/** Points economy for ETUZA HUB */

export const POINTS = {
  SIGNUP: 10,
  INVITE_REWARD: 5,
  AD_REWARD: 3,
  WATCH_COST: 1,
} as const;

export function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ET";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
