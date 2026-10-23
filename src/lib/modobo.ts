/**
 * Modobo TV API (sniffed from Modobo_TV_Latest APK)
 * BASE: https://cdn.apisfast.top/api/
 * Note: stream URLs require encrypted requests (app crypto handshake).
 * We use the public channel list for catalog; playable free streams stay on pinned m3u8.
 */

export const MODOBO_BASE = "https://cdn.apisfast.top/api";
export const MODOBO_CHANNELS_URL = `${MODOBO_BASE}/v1/channels`;
export const MODOBO_CATEGORIES_URL = `${MODOBO_BASE}/v1/categories`;

export type ModoboChannel = {
  id: number;
  title: string;
  logo: string | null;
  category_id: number | null;
  category_name: string | null;
  category_ids: number[];
  category_names: string[];
  free: number;
  has_source: boolean;
  linda_bando?: boolean;
  has_epg?: boolean;
  event_id?: number | null;
};

export type ModoboCategory = {
  id: number;
  name: string;
  image?: string;
  status?: number;
  channels_count?: number;
};

export async function fetchModoboChannels(): Promise<ModoboChannel[]> {
  try {
    const res = await fetch(MODOBO_CHANNELS_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0 (Modobo)",
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data)) return [];
    return data.data as ModoboChannel[];
  } catch (e) {
    console.error("fetchModoboChannels", e);
    return [];
  }
}

export async function fetchModoboCategories(): Promise<ModoboCategory[]> {
  try {
    const res = await fetch(MODOBO_CATEGORIES_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ETUZA-HUB/1.0 (Modobo)",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data)) return [];
    return data.data as ModoboCategory[];
  } catch {
    return [];
  }
}

/** Free channels that have a source (still need app encryption for actual m3u8) */
export async function fetchModoboFreeChannels(): Promise<ModoboChannel[]> {
  const all = await fetchModoboChannels();
  return all.filter((c) => c.free === 1 && c.has_source && c.title);
}
