import { prisma } from "@/lib/prisma";

/** Bongo catalog disabled — remove residual rows only */
export async function ensureBongoMovies(): Promise<number> {
  try {
    await prisma.$executeRaw`
      DELETE FROM "Content"
      WHERE type = 'movie'
        AND (id LIKE 'bongo_%' OR category LIKE 'Bongo%')
    `;
  } catch {
    /* ignore */
  }
  return 0;
}

export async function importBongoMovies(_force = false): Promise<number> {
  return ensureBongoMovies();
}
