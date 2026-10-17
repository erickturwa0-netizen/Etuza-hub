export type ContentType =
  | "movie"
  | "game"
  | "vpn"
  | "tv"
  | "radio"
  | "music"
  | "drama";

export type LinkType = "download" | "stream";
export type ContentStatus = "draft" | "published";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  preferred_language: "sw" | "en";
  created_at: string;
}

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  cover_url: string | null;
  link_url: string;
  link_type: LinkType;
  category: string | null;
  status: ContentStatus;
  protocol: string | null;
  country: string | null;
  network: string | null;
  config_text: string | null;
  file_url: string | null;
  brand_logo_url: string | null;
  tmdb_id: number | null;
  views_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
