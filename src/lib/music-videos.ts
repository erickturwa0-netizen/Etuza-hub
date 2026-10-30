import { prisma } from "@/lib/prisma";

const TAG = "music-videos-enabled-v3";

/**
 * Video Music is enabled (ytm.vrma.dev).
 * Only strip legacy rows that were generic YouTube without Video category.
 * Keeps category containing "Video".
 */
export async function ensureMusicVideos(): Promise<number> {
  const src = await prisma.apiSource.findUnique({
    where: { category: "music-video" },
  });

  if (src?.notes === TAG) return 0;

  // One-time: remove old non-Video youtube junk if any, keep Video · *
  try {
    await prisma.content.deleteMany({
      where: {
        type: "music",
        AND: [
          {
            OR: [
              { linkUrl: { contains: "youtube.com" } },
              { linkUrl: { contains: "youtu.be" } },
              { linkUrl: { contains: "youtube-nocookie" } },
            ],
          },
          {
            NOT: {
              category: { contains: "Video" },
            },
          },
        ],
      },
    });
  } catch (e) {
    console.error("music video cleanup", e);
  }

  await prisma.apiSource.upsert({
    where: { category: "music-video" },
    create: {
      category: "music-video",
      name: "Music Videos (ytm.vrma.dev)",
      url: "https://ytm.vrma.dev/search?q=Diamond+Platnumz&type=videos",
      notes: TAG,
      enabled: true,
    },
    update: {
      notes: TAG,
      enabled: true,
      name: "Music Videos (ytm.vrma.dev)",
      url: "https://ytm.vrma.dev/search?q=Diamond+Platnumz&type=videos",
    },
  });

  return 0;
}
