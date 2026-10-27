import { prisma } from "@/lib/prisma";

export const NETWORKS = ["vodacom", "airtel", "halotel", "mix"] as const;
export type PayNetwork = (typeof NETWORKS)[number];

export const PLANS = ["once", "week", "month", "year", "timed"] as const;
export type PayPlan = (typeof PLANS)[number];

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
  /** Cover / preview image (url or data:) */
  imageUrl: string;
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
    imageUrl: "",
  },
  {
    plan: "week",
    enabled: true,
    priceTzs: 2000,
    title: "Wiki 1",
    protocol: "",
    configText: "",
    fileUrl: "",
    imageUrl: "",
  },
  {
    plan: "month",
    enabled: true,
    priceTzs: 5000,
    title: "Mwezi 1",
    protocol: "",
    configText: "",
    fileUrl: "",
    imageUrl: "",
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
  const base = DEFAULT_VPN_PACKAGES.map((p) => ({ ...p }));
  if (!raw) return base;
  try {
    const arr = JSON.parse(raw) as VpnPackage[];
    if (!Array.isArray(arr) || !arr.length) return base;
    return base.map((def) => {
      const found = arr.find((a) => a.plan === def.plan);
      return found
        ? {
            ...def,
            ...found,
            plan: def.plan,
            imageUrl: found.imageUrl || "",
            fileUrl: found.fileUrl || "",
          }
        : { ...def };
    });
  } catch {
    return base;
  }
}

export async function ensurePaymentColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PaymentSettings"
      ADD COLUMN IF NOT EXISTS "show_packages" BOOLEAN NOT NULL DEFAULT false
    `);
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PaymentSettings"
      ADD COLUMN IF NOT EXISTS "vpn_packages" TEXT
    `);
  } catch {
    /* ignore */
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PaymentSettings"
      ADD COLUMN IF NOT EXISTS "paid_categories" TEXT NOT NULL DEFAULT 'movie,drama,tv,music,radio,game'
    `);
  } catch {
    /* ignore */
  }
}

export async function getPaymentSettings() {
  await ensurePaymentColumns();
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
  vpnPkg?: VpnPackage | null,
  preferPackages?: boolean
) {
  if (vpnPkg && vpnPkg.priceTzs > 0) return vpnPkg.priceTzs;
  if (!preferPackages && contentPrice && contentPrice > 0) return contentPrice;
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
