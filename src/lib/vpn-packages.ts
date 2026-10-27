/** VPN packages attached to a single Content row (not global Malipo). */

export type ContentVpnPackage = {
  plan: "once" | "week" | "month" | "timed";
  enabled: boolean;
  title: string;
  priceTzs: number;
  /** 0 = daima (once). week=7, month=30, timed=custom */
  accessDays: number;
  protocol: string;
  configText: string;
  fileUrl: string;
  imageUrl: string;
};

export const EMPTY_VPN_PACKAGES: ContentVpnPackage[] = [
  {
    plan: "once",
    enabled: false,
    title: "Moja kwa moja",
    priceTzs: 1000,
    accessDays: 0,
    protocol: "",
    configText: "",
    fileUrl: "",
    imageUrl: "",
  },
  {
    plan: "week",
    enabled: false,
    title: "Wiki 1",
    priceTzs: 2000,
    accessDays: 7,
    protocol: "",
    configText: "",
    fileUrl: "",
    imageUrl: "",
  },
  {
    plan: "month",
    enabled: false,
    title: "Mwezi 1",
    priceTzs: 5000,
    accessDays: 30,
    protocol: "",
    configText: "",
    fileUrl: "",
    imageUrl: "",
  },
  {
    plan: "timed",
    enabled: false,
    title: "Siku za kuchagua",
    priceTzs: 1500,
    accessDays: 3,
    protocol: "",
    configText: "",
    fileUrl: "",
    imageUrl: "",
  },
];

export function parseContentVpnPackages(
  raw: string | null | undefined
): ContentVpnPackage[] {
  const base = EMPTY_VPN_PACKAGES.map((p) => ({ ...p }));
  if (!raw) return base;
  try {
    const arr = JSON.parse(raw) as ContentVpnPackage[];
    if (!Array.isArray(arr)) return base;
    return base.map((def) => {
      const found = arr.find((a) => a.plan === def.plan);
      if (!found) return { ...def };
      return {
        ...def,
        ...found,
        plan: def.plan,
        enabled: !!found.enabled,
        priceTzs: Number(found.priceTzs) || 0,
        accessDays:
          found.plan === "week"
            ? 7
            : found.plan === "month"
              ? 30
              : Number(found.accessDays) || def.accessDays,
      };
    });
  } catch {
    return base;
  }
}

export function enabledVpnPackages(
  raw: string | null | undefined
): ContentVpnPackage[] {
  return parseContentVpnPackages(raw).filter((p) => p.enabled && p.priceTzs >= 0);
}

export function packageLabel(p: ContentVpnPackage) {
  if (p.plan === "timed" && p.accessDays > 0) {
    return p.title || `Siku ${p.accessDays}`;
  }
  return p.title || p.plan;
}
