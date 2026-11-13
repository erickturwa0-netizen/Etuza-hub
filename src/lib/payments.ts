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

export function parsePaidCategories(raw?: string | null): string[] {
  if (!raw) return [...CONTENT_TYPES];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseVpnPackages(raw?: string | null): VpnPackage[] {
  const base = DEFAULT_VPN_PACKAGES.map((p) => ({ ...p }));
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as VpnPackage[];
    if (!Array.isArray(parsed)) return base;
    return base.map((def) => {
      const found = parsed.find((x) => x.plan === def.plan);
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

export type PaymentSettingsRow = {
  id: string;
  enabled: boolean;
  payPhone: string;
  payNetwork: string;
  priceWeek: number;
  priceMonth: number;
  priceYear: number;
  priceOnce: number;
  instructions: string | null;
  paidCategories: string;
  showPackages: boolean;
  pointsAdsEnabled: boolean;
  vpnPackages: string | null;
};

const DEFAULT_ROW: PaymentSettingsRow = {
  id: "default",
  enabled: false,
  payPhone: "",
  payNetwork: "vodacom",
  priceWeek: 2000,
  priceMonth: 5000,
  priceYear: 40000,
  priceOnce: 1000,
  instructions: null,
  paidCategories: CONTENT_TYPES.join(","),
  showPackages: false,
  pointsAdsEnabled: true,
  vpnPackages: null,
};

/** Create PaymentSettings table + columns (works without Prisma model) */
export async function ensurePaymentColumns() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentSettings" (
        "id" TEXT PRIMARY KEY,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "pay_phone" TEXT NOT NULL DEFAULT '',
        "pay_network" TEXT NOT NULL DEFAULT 'vodacom',
        "price_week" INTEGER NOT NULL DEFAULT 2000,
        "price_month" INTEGER NOT NULL DEFAULT 5000,
        "price_year" INTEGER NOT NULL DEFAULT 40000,
        "price_once" INTEGER NOT NULL DEFAULT 1000,
        "instructions" TEXT,
        "paid_categories" TEXT NOT NULL DEFAULT 'movie,drama,tv,music,radio,game',
        "show_packages" BOOLEAN NOT NULL DEFAULT false,
        "points_ads_enabled" BOOLEAN NOT NULL DEFAULT true,
        "vpn_packages" TEXT
      )
    `);
  } catch (e) {
    console.error("create PaymentSettings", e);
  }

  for (const sql of [
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT false`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "pay_phone" TEXT DEFAULT ''`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "pay_network" TEXT DEFAULT 'vodacom'`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "price_week" INTEGER DEFAULT 2000`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "price_month" INTEGER DEFAULT 5000`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "price_year" INTEGER DEFAULT 40000`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "price_once" INTEGER DEFAULT 1000`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "instructions" TEXT`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "paid_categories" TEXT DEFAULT 'movie,drama,tv,music,radio,game'`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "show_packages" BOOLEAN DEFAULT false`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "points_ads_enabled" BOOLEAN DEFAULT true`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "vpn_packages" TEXT`,
    // legacy camelCase columns some deploys may have used
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "payPhone" TEXT`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "payNetwork" TEXT`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "priceWeek" INTEGER`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "priceMonth" INTEGER`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "priceYear" INTEGER`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "priceOnce" INTEGER`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "paidCategories" TEXT`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "showPackages" BOOLEAN`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "pointsAdsEnabled" BOOLEAN`,
    `ALTER TABLE "PaymentSettings" ADD COLUMN IF NOT EXISTS "vpnPackages" TEXT`,
  ]) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      /* ignore */
    }
  }
}

function mapRow(r: Record<string, unknown>): PaymentSettingsRow {
  return {
    id: String(r.id || "default"),
    enabled: Boolean(r.enabled),
    payPhone: String(r.pay_phone ?? r.payPhone ?? ""),
    payNetwork: String(r.pay_network ?? r.payNetwork ?? "vodacom"),
    priceWeek: Number(r.price_week ?? r.priceWeek ?? 2000),
    priceMonth: Number(r.price_month ?? r.priceMonth ?? 5000),
    priceYear: Number(r.price_year ?? r.priceYear ?? 40000),
    priceOnce: Number(r.price_once ?? r.priceOnce ?? 1000),
    instructions: (r.instructions as string) ?? null,
    paidCategories: String(
      r.paid_categories ?? r.paidCategories ?? CONTENT_TYPES.join(",")
    ),
    showPackages: Boolean(r.show_packages ?? r.showPackages ?? false),
    pointsAdsEnabled: Boolean(
      r.points_ads_enabled ?? r.pointsAdsEnabled ?? true
    ),
    vpnPackages: (r.vpn_packages as string) ?? (r.vpnPackages as string) ?? null,
  };
}

export async function getPaymentSettings(): Promise<PaymentSettingsRow> {
  await ensurePaymentColumns();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "PaymentSettings" WHERE id = 'default' LIMIT 1`
    )) as Record<string, unknown>[];
    if (rows[0]) return mapRow(rows[0]);
  } catch (e) {
    console.error("getPaymentSettings select", e);
  }

  // insert default
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PaymentSettings" (id, enabled, pay_phone, pay_network, price_week, price_month, price_year, price_once, paid_categories, show_packages, points_ads_enabled)
       VALUES ('default', false, '', 'vodacom', 2000, 5000, 40000, 1000, $1, false, true)
       ON CONFLICT (id) DO NOTHING`,
      CONTENT_TYPES.join(",")
    );
  } catch (e) {
    console.error("getPaymentSettings insert", e);
  }

  return { ...DEFAULT_ROW };
}

export async function savePaymentSettings(
  patch: Partial<PaymentSettingsRow>
): Promise<PaymentSettingsRow> {
  await ensurePaymentColumns();
  const cur = await getPaymentSettings();
  const next: PaymentSettingsRow = {
    ...cur,
    ...patch,
    id: "default",
  };

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PaymentSettings" (
         id, enabled, pay_phone, pay_network,
         price_week, price_month, price_year, price_once,
         instructions, paid_categories, show_packages, points_ads_enabled, vpn_packages
       ) VALUES (
         'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
       )
       ON CONFLICT (id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         pay_phone = EXCLUDED.pay_phone,
         pay_network = EXCLUDED.pay_network,
         price_week = EXCLUDED.price_week,
         price_month = EXCLUDED.price_month,
         price_year = EXCLUDED.price_year,
         price_once = EXCLUDED.price_once,
         instructions = EXCLUDED.instructions,
         paid_categories = EXCLUDED.paid_categories,
         show_packages = EXCLUDED.show_packages,
         points_ads_enabled = EXCLUDED.points_ads_enabled,
         vpn_packages = EXCLUDED.vpn_packages`,
      next.enabled,
      next.payPhone || "",
      next.payNetwork || "vodacom",
      next.priceWeek,
      next.priceMonth,
      next.priceYear,
      next.priceOnce,
      next.instructions,
      next.paidCategories || CONTENT_TYPES.join(","),
      next.showPackages,
      next.pointsAdsEnabled,
      next.vpnPackages
    );
  } catch (e) {
    console.error("savePaymentSettings", e);
    throw e;
  }

  return next;
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
  switch (plan) {
    case "week":
      d.setDate(d.getDate() + 7);
      return d;
    case "month":
      d.setDate(d.getDate() + 30);
      return d;
    case "year":
      d.setFullYear(d.getFullYear() + 1);
      return d;
    case "timed":
      d.setDate(d.getDate() + (accessDays && accessDays > 0 ? accessDays : 7));
      return d;
    case "once":
      return null;
    default:
      return null;
  }
}
