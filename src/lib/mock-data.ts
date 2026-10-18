import type { Content } from "@/types/database";

/** Mock data removed — catalog comes from public APIs only */
export const mockContent: Content[] = [];

export function getPublished(_type?: string) {
  return [] as Content[];
}

export function getAllContent() {
  return [] as Content[];
}
