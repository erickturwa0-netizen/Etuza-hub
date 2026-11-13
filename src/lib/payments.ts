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

const SETTINGS_KEY = "payment_settings";

/** Simple key-value store — avoids PaymentSettings column hell */
async function ensureAppSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSettings" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function normalize(raw: Partial<PaymentSettingsRow> | null | undefined): PaymentSettingsRow {
  const r = raw || {};
  return {
    id: "default",
    enabled: !!r.enabled,
    payPhone: String(r.payPhone ?? ""),
    payNetwork: String(r.payNetwork ?? "vodacom"),
    priceWeek: Number(r.priceWeek ?? 2000) || 2000,
    priceMonth: Number(r.priceMonth ?? 5000) || 5000,
    priceYear: Number(r.priceYear ?? 40000) || 40000,
    priceOnce: Number(r.priceOnce ?? 1000) || 1000,
    instructions: r.instructions ?? null,
    paidCategories: String(r.paidCategories ?? CONTENT_TYPES.join(",")),
    showPackages: !!r.showPackages,
    pointsAdsEnabled: r.pointsAdsEnabled !== false,
    vpnPackages: r.vpnPackages ?? null,
  };
}

/** Legacy PaymentSettings table read (if exists) */
async function readLegacyPaymentSettings(): Promise<PaymentSettingsRow | null> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "PaymentSettings" WHERE id = 'default' LIMIT 1`
    )) as Record<string, unknown>[];
    if (!rows[0]) return null;
    const r = rows[0];
    return normalize({
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
      vpnPackages:
        (r.vpn_packages as string) ?? (r.vpnPackages as string) ?? null,
    });
  } catch {
    return null;
  }
}

export async function ensurePaymentColumns() {
  try {
    await ensureAppSettingsTable();
  } catch (e) {
    console.error("ensureAppSettingsTable", e);
  }
}

export async function getPaymentSettings(): Promise<PaymentSettingsRow> {
  await ensurePaymentColumns();

  // 1) AppSettings JSON
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT value FROM "AppSettings" WHERE key = $1 LIMIT 1`,
      SETTINGS_KEY
    )) as { value: string }[];
    if (rows[0]?.value) {
      const parsed = JSON.parse(rows[0].value) as Partial<PaymentSettingsRow>;
      return normalize(parsed);
    }
  } catch (e) {
    console.error("getPaymentSettings AppSettings", e);
  }

  // 2) Legacy table
  const legacy = await readLegacyPaymentSettings();
  if (legacy) {
    // migrate to AppSettings for next time
    try {
      await savePaymentSettings(legacy);
    } catch {
      /* ignore */
    }
    return legacy;
  }

  return { ...DEFAULT_ROW };
}

export async function savePaymentSettings(
  patch: Partial<PaymentSettingsRow>
): Promise<PaymentSettingsRow> {
  await ensurePaymentColumns();
  const cur = await getPaymentSettings();
  const next = normalize({ ...cur, ...patch });
  const json = JSON.stringify(next);

  // Primary path: AppSettings key-value
  try {
    await prisma.$executeRaw`
      INSERT INTO "AppSettings" (key, value, updated_at)
      VALUES (${SETTINGS_KEY}, ${json}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `;
    return next;
  } catch (e1) {
    console.error("save AppSettings tagged", e1);
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AppSettings" (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      SETTINGS_KEY,
      json
    );
    return next;
  } catch (e2) {
    console.error("save AppSettings unsafe", e2);
  }

  // Fallback: try minimal PaymentSettings write
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentSettings" (
        "id" TEXT PRIMARY KEY,
        "enabled" BOOLEAN DEFAULT false,
        "pay_phone" TEXT DEFAULT '',
        "pay_network" TEXT DEFAULT 'vodacom',
        "price_week" INTEGER DEFAULT 2000,
        "price_month" INTEGER DEFAULT 5000,
        "price_year" INTEGER DEFAULT 40000,
        "price_once" INTEGER DEFAULT 1000,
        "instructions" TEXT,
        "paid_categories" TEXT,
        "show_packages" BOOLEAN DEFAULT false,
        "points_ads_enabled" BOOLEAN DEFAULT true,
        "vpn_packages" TEXT
      )
    `);
    await prisma.$executeRaw`
      INSERT INTO "PaymentSettings" (
        id, enabled, pay_phone, pay_network,
        price_week, price_month, price_year, price_once,
        instructions, paid_categories, show_packages, points_ads_enabled, vpn_packages
      ) VALUES (
        'default',
        ${next.enabled},
        ${next.payPhone},
        ${next.payNetwork},
        ${next.priceWeek},
        ${next.priceMonth},
        ${next.priceYear},
        ${next.priceOnce},
        ${next.instructions},
        ${next.paidCategories},
        ${next.showPackages},
        ${next.pointsAdsEnabled},
        ${next.vpnPackages}
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
        vpn_packages = EXCLUDED.vpn_packages
    `;
    return next;
  } catch (e3) {
    console.error("save PaymentSettings fallback", e3);
    throw e3;
  }
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
  try {
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
      const exp = (a as { expiresAt?: Date | null }).expiresAt;
      if (!exp || exp > now) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
