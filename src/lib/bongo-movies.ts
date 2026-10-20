import { prisma } from "@/lib/prisma";

const BONGO_TAG = "bongo-yt-v1";

/**
 * Curated full Bongo movies publicly available on YouTube
 * (official Africha / popular channels). Embed via youtube-nocookie.
 */
const BONGO_LIST: {
  title: string;
  youtubeId: string;
  year?: string;
}[] = [
  { title: "Amnazo", youtubeId: "F0q06W6l40c", year: "2025" },
  { title: "Machozi", youtubeId: "O-TxsxUZUZg", year: "2025" },
  { title: "ZAMORA", youtubeId: "1yUPQwgumQw", year: "2025" },
  { title: "TASWIRA", youtubeId: "tquXeCeoeP0", year: "2025" },
  { title: "Msela", youtubeId: "jxLMCRXLTSE", year: "2025" },
  { title: "Kosa Langu Nini", youtubeId: "vfZCQ-W6jac", year: "2025" },
  { title: "Siri Ya Mke Wangu", youtubeId: "75iC1ZZcf5o", year: "2020" },
  { title: "Mwali Wa Kizaramo Part 1", youtubeId: "W0NGLWhHQAY", year: "2020" },
  { title: "Mwali Wa Kizaramo Part 2", youtubeId: "2oO5K0Exh38", year: "2020" },
  { title: "Mgeni wa Kijiji", youtubeId: "JEoP1WWrqt8", year: "2020" },
  { title: "Pikipiki Part 1", youtubeId: "4Gy_np2ZCM4", year: "2020" },
  { title: "Pikipiki Part 2", youtubeId: "gu0J4w22ep4", year: "2020" },
  { title: "Chini Ya Jua", youtubeId: "QRBYtFnauAw", year: "2022" },
  { title: "VANILA", youtubeId: "XlFWmbeVV0w", year: "2024" },
  { title: "MASUMBUKO Part 1", youtubeId: "p7l9O1r9FE0", year: "2024" },
  { title: "MASUMBUKO Part 2", youtubeId: "3bIfbjxP5JA", year: "2024" },
  { title: "MASUMBUKO Part 3", youtubeId: "xnj8PGFOvuA", year: "2024" },
  { title: "Uchawi Wa Kurithi", youtubeId: "1ixLiJtrMEo", year: "2023" },
  { title: "Mtoto Wa Kuokota", youtubeId: "wNLFj99qoPQ", year: "2023" },
  { title: "WATOTO WANGU", youtubeId: "iQCsfw8ULjQ", year: "2024" },
  { title: "MSELA JELA", youtubeId: "TD4TERsxY04", year: "2024" },
  { title: "MWANANGU", youtubeId: "3MQR1OXixmg", year: "2024" },
  { title: "WAGENI", youtubeId: "xWYonQRg9Bk", year: "2024" },
  { title: "MARAFIKI", youtubeId: "_iaiUHj7xzo", year: "2024" },
  { title: "KIDUME", youtubeId: "Q9_Jp2Rd5kM", year: "2024" },
  { title: "KIMOKO", youtubeId: "Q-PFEH7k9H8", year: "2024" },
  { title: "THAMANI YANGU", youtubeId: "xOpNdpzhQqY", year: "2025" },
  { title: "CHOZI LA UPENDO Part 1", youtubeId: "u49oDJaHSGI", year: "2025" },
  { title: "CHOZI LA UPENDO Part 2", youtubeId: "u74fWJX7Zhk", year: "2025" },
  { title: "Nabii Mswahili Part 1", youtubeId: "GsTESiSC-AI", year: "2018" },
  { title: "She Is My Sister Part 1", youtubeId: "oWG1Gt5Xcr0", year: "2017" },
  { title: "The Morning Alarm Part 1", youtubeId: "v82B4-nMk_o", year: "2017" },
  { title: "Utani Part 1", youtubeId: "XfGwjnFBQjk", year: "2025" },
  { title: "Mama Mwali Part 1", youtubeId: "dcdrcExR00M", year: "2020" },
  { title: "Mission Love Part 1", youtubeId: "Iu7nny0JOcQ", year: "2020" },
  { title: "Komando Kipensi Part 1", youtubeId: "jabtmTAhg3g", year: "2020" },
  { title: "Fimbo ya Urithi", youtubeId: "ki7u8BByAl8", year: "2019" },
  { title: "Mchumba Part 1", youtubeId: "L7xGSxThRec", year: "2019" },
  { title: "Same Script", youtubeId: "6UcU1PfIR1Y", year: "2010" },
  { title: "GIZA LA ASUBUHI", youtubeId: "eSWoWzNH-zE", year: "2022" },
];

export async function importBongoMovies(force = false): Promise<number> {
  const src = await prisma.apiSource.findUnique({
    where: { category: "bongo" },
  });
  if (!force && src?.notes === BONGO_TAG) {
    return prisma.content.count({
      where: { type: "movie", category: { startsWith: "Bongo" }, status: "published" },
    });
  }

  // Remove previous bongo-only rows (keep ElitePlex movies)
  await prisma.content.deleteMany({
    where: { type: "movie", category: { startsWith: "Bongo" } },
  });

  let total = 0;
  for (const m of BONGO_LIST) {
    const yt = m.youtubeId;
    await prisma.content.create({
      data: {
        type: "movie",
        title: m.title.slice(0, 200),
        description: "Bongo Movie · Filamu ya Kitanzania (YouTube)",
        linkUrl: `https://www.youtube.com/watch?v=${yt}`,
        coverUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
        linkType: "stream",
        category: m.year ? `Bongo · ${m.year}` : "Bongo Movie",
        status: "published",
      },
    });
    total++;
  }

  await prisma.apiSource.upsert({
    where: { category: "bongo" },
    create: {
      category: "bongo",
      name: "Bongo Movies (YouTube)",
      url: "https://www.youtube.com/playlist?list=PLcMQLM9ywgW9XPPSHMqHCkjqZFNQZOQAk",
      notes: BONGO_TAG,
      enabled: true,
    },
    update: {
      name: "Bongo Movies (YouTube)",
      url: "https://www.youtube.com/playlist?list=PLcMQLM9ywgW9XPPSHMqHCkjqZFNQZOQAk",
      notes: BONGO_TAG,
      enabled: true,
    },
  });

  return total;
}

export async function ensureBongoMovies(): Promise<number> {
  const src = await prisma.apiSource.findUnique({
    where: { category: "bongo" },
  });
  if (!src || src.notes !== BONGO_TAG) {
    return importBongoMovies(true);
  }
  const count = await prisma.content.count({
    where: { type: "movie", category: { startsWith: "Bongo" }, status: "published" },
  });
  if (count === 0) return importBongoMovies(true);
  return count;
}
