import { NextResponse } from "next/server";
import { getPaymentSettings } from "@/lib/payments";

/** Public: whether payments are on + pay number (for dialog). */
export async function GET() {
  try {
    const s = await getPaymentSettings();
    return NextResponse.json({
      enabled: s.enabled,
      payPhone: s.enabled ? s.payPhone : "",
      payNetwork: s.enabled ? s.payNetwork : "",
      priceWeek: s.priceWeek,
      priceMonth: s.priceMonth,
      priceYear: s.priceYear,
      priceOnce: s.priceOnce,
      instructions: s.instructions,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ enabled: false });
  }
}
