import { NextResponse } from "next/server";
import {
  getPaymentSettings,
  parseVpnPackages,
} from "@/lib/payments";

export async function GET() {
  try {
    const s = await getPaymentSettings();
    const showPackages =
      (s as { showPackages?: boolean }).showPackages === true;
    const pointsAdsEnabled =
      (s as { pointsAdsEnabled?: boolean }).pointsAdsEnabled !== false;
    const vpnPackages = parseVpnPackages(
      (s as { vpnPackages?: string | null }).vpnPackages
    ).filter((p) => p.enabled);

    return NextResponse.json({
      enabled: s.enabled,
      payPhone: s.enabled ? s.payPhone : "",
      payNetwork: s.enabled ? s.payNetwork : "",
      priceWeek: s.priceWeek,
      priceMonth: s.priceMonth,
      priceYear: s.priceYear,
      priceOnce: s.priceOnce,
      instructions: s.instructions,
      showPackages,
      pointsAdsEnabled,
      vpnPackages,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      enabled: false,
      showPackages: false,
      pointsAdsEnabled: true,
      vpnPackages: [],
    });
  }
}
