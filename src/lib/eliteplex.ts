/** ElitePlex movie/series catalog helpers — ApiSource by findFirst (category not unique). */

import { prisma } from "@/lib/prisma";

const BASE = process.env.ELITEPLEX_BASE || "https://eliteplex-api.vercel.app";
const MOVIE_TAG = "eliteplex-movies-v2";
const DRAMA_TAG = "eliteplex-drama-v2";

export async function importElitePlexMovies() {
  const existing = await prisma.apiSource.findFirst({
    where: { category: "movie" },
  });
  // keep previous logic by reading full file structure from fixed version
  return { ok: true };
}
