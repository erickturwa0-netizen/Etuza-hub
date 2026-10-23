/**
 * Modobo TV channels
 * Live API: https://cdn.apisfast.top/api/v1/channels
 * Static fallback: bundled free channels (Vercel often blocks apisfast)
 */
import {
  STATIC_MODOBO_FREE,
  type StaticModoboChannel,
} from "@/data/modobo-static";

export const MODOBO_BASE = "https://cdn.apisfast.top/api";
export const MODOBO_CHANNELS_URL = `${MODOBO_BASE}/v1/channels`;
export const MODOBO_CATEGORIES_URL = `${MODOBO_BASE}/v1/categories`;

export type ModoboChannel = {
  id: number;
  title: string;
  logo: string | null;
  category_id: number | null;
  category_name: string | null;
  category_ids?: number[];
  category_names?: string[];
  free: number;
  has_source: boolean;
  linda_bando?: boolean;
  has_epg?: boolean;
  event_id?: number | null;
};

function fromStatic(c: StaticModoboChannel): ModoboChannel {
  return {
    id: c.id,
    title: c.title,
    logo: c.logo,
    category_id: c.category_id,
    category_name: c.category_name,
    free: c.free,
    has_source: c.has_source,
  };
}

export async function fetchModoboChannels(): Promise<ModoboChannel[]> {
  try {
    const res = await fetch(MODOBO_CHANNELS_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0 (Modobo)",
      },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data as ModoboChannel[];
      }
    }
  } catch (e) {
    console.error("fetchModoboChannels live failed, using static", e);
  }
  return STATIC_MODOBO_FREE.map(fromStatic);
}

export async function fetchModoboCategories(): Promise<
  { id: number; name: string; channels_count?: number }[]
> {
  try {
    const res = await fetch(MODOBO_CATEGORIES_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0 (Modobo)",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) return data.data;
    }
  } catch {
    /* fallback below */
  }
  const map = new Map<string, number>();
  for (const c of STATIC_MODOBO_FREE) {
    const n = c.category_name || "Other";
    map.set(n, (map.get(n) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, channels_count], i) => ({
    id: i + 1,
    name,
    channels_count,
  }));
}

/** Free channels — live API or static bundle */
export async function fetchModoboFreeChannels(): Promise<ModoboChannel[]> {
  const all = await fetchModoboChannels();
  const free = all.filter((c) => Number(c.free) === 1 && c.title);
  if (free.length > 0) return free;
  return STATIC_MODOBO_FREE.map(fromStatic);
}
