import { prisma } from "@/lib/prisma";

const TAG = "music-videos-v1";

/** Popular public music video embeds (YouTube) */
const SEEDS = [
  {
    title: "Burna Boy – Last Last",
    youtubeId: "AwQHqWy5Gq4",
  },
  {
    title: "Tems – Free Mind",
    youtubeId: "5EQ0cO-6xY8",
  },
  {
    title: "Diamond Platnumz – Jeje",
    youtubeId: "hL0sEdVJsbc",
  },
  {
    title: "SZA – Kill Bill",
    youtubeId: "MSRcC626prw",
  },
  {
    title: "Rema – Calm Down",
    youtubeId: "gUci-tSYxEM",
  },
  {
    title: "Asake – Lonely At The Top",
    youtubeId: "Z3x_t2bC7oE",
  },
  {
    title: "Harmonize – Show Off",
    youtubeId: "xYl8F9N5y0c",
  },
  {
    title: "Ed Sheeran – Shape of You",
    youtubeId: "JGwWNGJdvx8",
  },
];

export async function ensureMusicVideos(): Promise<number> {
  const src = await prisma.apiSource.findUnique({ where: { category: "music-video" } });
  if (src?.notes === TAG) {
    return prisma.content.count({
      where: { type: "music", category: { contains: "Video" }, status: "published" },
    });
  }

  let n = 0;
  for (const s of SEEDS) {
    const linkUrl = `https://www.youtube.com/embed/${s.youtubeId}`;
    const existing = await prisma.content.findFirst({
      where: { type: "music", linkUrl },
    });
    if (existing) continue;
    await prisma.content.create({
      data: {
        type: "music",
        title: s.title,
        description: "Music video",
        linkUrl,
        coverUrl: `https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`,
        linkType: "stream",
        category: "Music Video",
        status: "published",
      },
    });
    n++;
  }

  await prisma.apiSource.upsert({
    where: { category: "music-video" },
    create: {
      category: "music-video",
      name: "Music Videos",
      url: "youtube",
      notes: TAG,
      enabled: true,
    },
    update: { notes: TAG, enabled: true },
  });

  return n;
}
