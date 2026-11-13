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

/** Fixed id in existing ApiSource table — no CREATE TABLE needed */
const PAY_SOURCE_ID = "sys_payment_settings";

function normalize(
  raw: Partial<PaymentSettingsRow> | null | undefined
): PaymentSettingsRow {
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

export async function ensurePaymentColumns() {
  // intentionally empty — DB user cannot CREATE TABLE (permission denied for schema public)
}

export async function getPaymentSettings(): Promise<PaymentSettingsRow> {
  // 1) ApiSource row (works with existing INSERT/UPDATE permissions)
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT notes FROM "ApiSource" WHERE id = $1 LIMIT 1`,
      PAY_SOURCE_ID
    )) as { notes: string | null }[];
    if (rows[0]?.notes) {
      const parsed = JSON.parse(rows[0].notes) as Partial<PaymentSettingsRow>;
      return normalize(parsed);
    }
  } catch (e) {
    console.error("getPayment ApiSource", e);
  }

  // 2) Legacy PaymentSettings if table already exists (read-only attempt)
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "PaymentSettings" WHERE id = 'default' LIMIT 1`
    )) as Record<string, unknown>[];
    if (rows[0]) {
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
    }
  } catch {
    /* table may not exist */
  }

  return { ...DEFAULT_ROW };
}

export async function savePaymentSettings(
  patch: Partial<PaymentSettingsRow>
): Promise<PaymentSettingsRow> {
  const cur = await getPaymentSettings();
  const next = normalize({ ...cur, ...patch });
  const json = JSON.stringify(next);

  // Write into existing ApiSource table only (no DDL)
  try {
    await prisma.$executeRaw`
      INSERT INTO "ApiSource" (id, category, name, url, enabled, notes)
      VALUES (
        ${PAY_SOURCE_ID},
        ${"other"},
        ${"Payment Settings"},
        ${""},
        ${true},
        ${json}
      )
      ON CONFLICT (id) DO UPDATE SET
        notes = EXCLUDED.notes,
        name = EXCLUDED.name,
        enabled = true
    `;
    return next;
  } catch (e1) {
    console.error("save payment ApiSource tagged", e1);
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ApiSource" (id, category, name, url, enabled, notes)
       VALUES ($1, 'other', 'Payment Settings', '', true, $2)
       ON CONFLICT (id) DO UPDATE SET notes = $2, enabled = true`,
      PAY_SOURCE_ID,
      json
    );
    return next;
  } catch (e2) {
    console.error("save payment ApiSource unsafe", e2);
  }

  // Prisma client fallback
  try {
    await prisma.apiSource.upsert({
      where: { id: PAY_SOURCE_ID },
      create: {
        id: PAY_SOURCE_ID,
        category: "other",
        name: "Payment Settings",
        url: "",
        enabled: true,
        notes: json,
      },
      update: {
        notes: json,
        enabled: true,
      },
    });
    return next;
  } catch (e3) {
    console.error("save payment prisma upsert", e3);
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
