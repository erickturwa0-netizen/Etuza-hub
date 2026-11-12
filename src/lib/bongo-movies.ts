import { prisma } from "@/lib/prisma";

const BONGO_TAG = "bongo-yt-v1";

/**
 * Seed / refresh Bongo movie-related sources.
 * ApiSource.category is NOT unique — always findFirst + create/update.
 */
export async function ensureBongoMovies() {
  const src = await prisma.apiSource.findFirst({
    where: { category: "movie" },
  });
  // Prefer eliteplex; bongo is supplemental catalog tag on content rows
  const count = await prisma.content.count({
    where: { type: "movie", status: "published" },
  });
  return { count, hasMovieSource: Boolean(src) };
}

export async function markBongoSource() {
  const src = await prisma.apiSource.findFirst({
    where: { category: "movie", notes: { contains: BONGO_TAG } },
  });
  if (src) {
    await prisma.apiSource.update({
      where: { id: src.id },
      data: { enabled: true, notes: BONGO_TAG },
    });
    return;
  }
  const anyMovie = await prisma.apiSource.findFirst({
    where: { category: "movie" },
  });
  if (anyMovie) {
    await prisma.apiSource.update({
      where: { id: anyMovie.id },
      data: { enabled: true },
    });
  } else {
    await prisma.apiSource.create({
      data: {
        category: "movie",
        name: "Movies",
        url: "",
        enabled: true,
        notes: BONGO_TAG,
      },
    });
  }
}
