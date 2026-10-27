import { NextResponse } from "next/server";
import { getPaymentSettings } from "@/lib/payments";

/** Public: paywall dialog settings */
export async function GET() {
  try {
    const s = await getPaymentSettings();
    const showPackages =
      (s as { showPackages?: boolean }).showPackages === true;
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
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ enabled: false, showPackages: false });
  }
}
