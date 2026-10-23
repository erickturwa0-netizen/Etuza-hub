/** Auto-generated free Modobo channels (static fallback when API blocked) */
export type StaticModoboChannel = {
  id: number;
  title: string;
  logo: string | null;
  category_id: number | null;
  category_name: string;
  free: number;
  has_source: boolean;
};

import data from "./modobo-free-channels.json";

export const STATIC_MODOBO_FREE: StaticModoboChannel[] =
  (data as { channels: StaticModoboChannel[] }).channels;
export const STATIC_MODOBO_COUNT = (data as { count: number }).count;
