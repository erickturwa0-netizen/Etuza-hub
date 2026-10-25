import { prisma } from "@/lib/prisma";

export const NETWORKS = ["vodacom", "airtel", "halotel", "mix"] as const;
export type PayNetwork = (typeof NETWORKS)[number];

export const PLANS = ["once", "week", "month", "year"] as const;
export type PayPlan = (typeof PLANS)[number];

export function planLabel(plan: string) {
  switch (plan) {
    case "week":
      return "Wiki 1";
    case "month":
      return "Mwezi 1";
    case "year":
      return "Mwaka 1";
    case "once":
      return "Moja kwa moja";
    default:
      return plan;
  }
}

export function networkLabel(n: string) {
  switch (n) {
    case "vodacom":
      return "Vodacom";
    case "airtel":
      return "Airtel";
    case "halotel":
      return "Halotel";
    case "mix":
      return "Mix by Yas";
    default:
      return n;
  }
}

export async function getPaymentSettings() {
  let s = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
  if (!s) {
    s = await prisma.paymentSettings.create({
      data: { id: "default" },
    });
  }
  return s;
}

export function priceForPlan(
  settings: {
    priceWeek: number;
    priceMonth: number;
    priceYear: number;
    priceOnce: number;
  },
  plan: string,
  contentPrice?: number | null
) {
  if (contentPrice && contentPrice > 0) return contentPrice;
  switch (plan) {
    case "week":
      return settings.priceWeek;
    case "month":
      return settings.priceMonth;
    case "year":
      return settings.priceYear;
    default:
      return settings.priceOnce;
  }
}

export function expiresForPlan(plan: string, from = new Date()): Date | null {
  const d = new Date(from);
  if (plan === "week") {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (plan === "month") {
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (plan === "year") {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  // once = permanent for that content
  return null;
}

/** Does user have access to this content (or site-wide active sub)? */
export async function userHasAccess(userId: string, contentId: string) {
  const now = new Date();
  const rows = await prisma.userAccess.findMany({
    where: {
      userId,
      OR: [{ contentId }, { contentId: null }],
    },
  });
  for (const a of rows) {
    if (!a.expiresAt || a.expiresAt > now) return true;
  }
  return false;
}
