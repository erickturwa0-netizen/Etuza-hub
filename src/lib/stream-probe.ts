import { prisma } from "@/lib/prisma";

async function ensureColumn() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Content"
      ADD COLUMN IF NOT EXISTS "stream_status" TEXT DEFAULT 'unknown'
    `);
  } catch {
    /* ignore */
  }
}

async function probeUrl(url: string): Promise<"ok" | "bad"> {
  if (!url || !/^https?:\/\//i.test(url)) return "bad";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Range: "bytes=0-4096",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    if (res.status >= 200 && res.status < 400) {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const text = await res.text().catch(() => "");
      if (
        text.includes("#EXTM3U") ||
        text.includes("#EXT-X-") ||
        ct.includes("mpegurl") ||
        ct.includes("video") ||
        ct.includes("audio") ||
        ct.includes("octet-stream") ||
        ct.includes("mp4") ||
        ct.includes("matroska")
      ) {
        return "ok";
      }
      if (res.status === 200 || res.status === 206) return "ok";
    }
    return "bad";
  } catch {
    clearTimeout(t);
    return "bad";
  }
}

/** Probe unknown streams in parallel and persist ok/bad. */
export async function probeUnknownStreams(
  type: string,
  limit = 24
): Promise<{ checked: number; ok: number; bad: number }> {
  await ensureColumn();
  let checked = 0;
  let ok = 0;
  let bad = 0;

  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, link_url FROM "Content"
       WHERE type = $1 AND status = 'published'
         AND (stream_status IS NULL OR stream_status = 'unknown' OR stream_status = '')
         AND link_url IS NOT NULL AND link_url <> ''
       ORDER BY created_at DESC
       LIMIT $2`,
      type,
      limit
    )) as { id: string; link_url: string }[];

    if (!rows.length) return { checked: 0, ok: 0, bad: 0 };

    // Parallel batches of 6
    const batchSize = 6;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (row) => {
          const status = await probeUrl(row.link_url);
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE "Content" SET stream_status = $1 WHERE id = $2`,
              status,
              row.id
            );
          } catch {
            /* ignore */
          }
          return status;
        })
      );
      for (const status of results) {
        checked++;
        if (status === "ok") ok++;
        else bad++;
      }
    }
  } catch (e) {
    console.error("probeUnknownStreams", e);
  }

  return { checked, ok, bad };
}
