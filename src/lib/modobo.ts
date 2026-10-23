/**
 * Modobo TV channels
 * Static bundle first (reliable on Vercel).
 * Optional live refresh from https://cdn.apisfast.top/api/v1/channels
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

/** Prefer static bundle — never block the page on external API */
export async function fetchModoboChannels(): Promise<ModoboChannel[]> {
  return STATIC_MODOBO_FREE.map(fromStatic);
}

export async function fetchModoboCategories(): Promise<
  { id: number; name: string; channels_count?: number }[]
> {
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

export async function fetchModoboFreeChannels(): Promise<ModoboChannel[]> {
  return STATIC_MODOBO_FREE.filter((c) => Number(c.free) === 1 && c.title).map(
    fromStatic
  );
}
