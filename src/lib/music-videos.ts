import { prisma } from "@/lib/prisma";

const TAG = "music-videos-removed-v2";

/**
 * Remove YouTube music-video rows so UI does not look like YouTube.
 * Keeps regular songs (non-YouTube).
 */
export async function ensureMusicVideos(): Promise<number> {
  const src = await prisma.apiSource.findUnique({
    where: { category: "music-video" },
  });

  // Delete previous YouTube-seeded videos once
  if (src?.notes !== TAG) {
    try {
      await prisma.content.deleteMany({
        where: {
          type: "music",
          OR: [
            { category: { contains: "Video" } },
            { linkUrl: { contains: "youtube.com" } },
            { linkUrl: { contains: "youtu.be" } },
            { linkUrl: { contains: "youtube-nocookie" } },
          ],
        },
      });
    } catch (e) {
      console.error("remove youtube music videos", e);
    }

    await prisma.apiSource.upsert({
      where: { category: "music-video" },
      create: {
        category: "music-video",
        name: "Music Videos (disabled)",
        url: "",
        notes: TAG,
        enabled: false,
      },
      update: { notes: TAG, enabled: false, name: "Music Videos (disabled)" },
    });
  }

  return 0;
}
