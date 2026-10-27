import { prisma } from "@/lib/prisma";

export const NETWORKS = ["vodacom", "airtel", "halotel", "mix"] as const;
export type PayNetwork = (typeof NETWORKS)[number];

export const PLANS = ["once", "week", "month", "year", "timed"] as const;
export type PayPlan = (typeof PLANS)[number];

/** Category ticks (bulk paywall) — VPN excluded; VPN uses its own packages */
export const CONTENT_TYPES = [
  "movie",
  "drama",
  "tv",
  "music",
  "radio",
  "game",
] as const;

export const TYPE_LABELS: Record<string, string> = {
  movie: "Movies",
  drama: "Tamthilia",
  tv: "TV",
  music: "Miziki",
  radio: "Radio",
  game: "Games",
  vpn: "VPN",
};

export type VpnPackage = {
  plan: "once" | "week" | "month" | "year";
  enabled: boolean;
  priceTzs: number;
  title: string;
  protocol: string;
  configText: string;
  fileUrl: string;
};

export const DEFAULT_VPN_PACKAGES: VpnPackage[] = [
  {
    plan: "once",
    enabled: true,
    priceTzs: 1000,
    title: "Moja kwa moja",
    protocol: "",
    configText: "",
    fileUrl: "",
  },
  {
    plan: "week",
    enabled: true,
    priceTzs: 2000,
    title: "Wiki 1",
    protocol: "",
    configText: "",
    fileUrl: "",
  },
  {
    plan: "month",
    enabled: true,
    priceTzs: 5000,
    title: "Mwezi 1",
    protocol: "",
    configText: "",
    fileUrl: "",
  },
  {
    plan: "year",
    enabled: true,
    priceTzs: 40000,
    title: "Mwaka 1",
    protocol: "",
    configText: "",
    fileUrl: "",
  },
];

export function planLabel(plan: string) {
  switch (plan) {
    case "week":
      return "Wiki 1";
    case "month":
      return "Mwezi 1";
    case "year":
      return "Mwaka 1";
    case "once":
      return "Moja kwa moja (daima)";
    case "timed":
      return "Muda maalum";
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

export function parsePaidCategories(raw: string | null | undefined): string[] {
  if (!raw) return [...CONTENT_TYPES];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((c) => c && c !== "vpn");
}

export function parseVpnPackages(raw: string | null | undefined): VpnPackage[] {
  if (!raw) return DEFAULT_VPN_PACKAGES.map((p) => ({ ...p }));
  try {
    const arr = JSON.parse(raw) as VpnPackage[];
    if (!Array.isArray(arr) || !arr.length) {
      return DEFAULT_VPN_PACKAGES.map((p) => ({ ...p }));
    }
    return DEFAULT_VPN_PACKAGES.map((def) => {
      const found = arr.find((a) => a.plan === def.plan);
      return found ? { ...def, ...found, plan: def.plan } : { ...def };
    });
  } catch {
    return DEFAULT_VPN_PACKAGES.map((p) => ({ ...p }));
  }
}

export async function getPaymentSettings() {
  let s = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
  if (!s) {
    s = await prisma.paymentSettings.create({
      data: {
        id: "default",
        paidCategories: CONTENT_TYPES.join(","),
        showPackages: false,
      },
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
  contentPrice?: number | null,
  vpnPkg?: VpnPackage | null
) {
  if (vpnPkg && vpnPkg.priceTzs > 0) return vpnPkg.priceTzs;
  if (contentPrice && contentPrice > 0) return contentPrice;
  switch (plan) {
    case "week":
      return settings.priceWeek;
    case "month":
      return settings.priceMonth;
    case "year":
      return settings.priceYear;
    case "timed":
      return contentPrice && contentPrice > 0 ? contentPrice : settings.priceOnce;
    default:
      return settings.priceOnce;
  }
}

export function expiresForPlan(
  plan: string,
  from = new Date(),
  accessDays?: number | null
): Date | null {
  const d = new Date(from);
  if (plan === "timed" && accessDays && accessDays > 0) {
    d.setDate(d.getDate() + accessDays);
    return d;
  }
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
  return null;
}

export async function userHasAccess(userId: string, contentId: string) {
  const now = new Date();
  const rows = await prisma.userAccess.findMany({
    where: {
      userId,
      OR: contentId
        ? [{ contentId }, { contentId: null }]
        : [{ contentId: null }],
    },
  });
  for (const a of rows) {
    if (!a.expiresAt || a.expiresAt > now) return true;
  }
  return false;
}

/** Active access row for content (to resolve VPN package config) */
export async function getUserAccessRow(userId: string, contentId: string) {
  const now = new Date();
  const rows = await prisma.userAccess.findMany({
    where: {
      userId,
      OR: [{ contentId }, { contentId: null }],
    },
    orderBy: { createdAt: "desc" },
  });
  for (const a of rows) {
    if (!a.expiresAt || a.expiresAt > now) return a;
  }
  return null;
}
