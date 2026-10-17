import { NextResponse } from "next/server";

/** Pick best playable video file from Archive.org metadata */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id")?.trim() || "";

    // Allow full details URL
    const m = id.match(/archive\.org\/details\/([^/?#]+)/i);
    if (m) id = m[1];
    const m2 = id.match(/archive\.org\/embed\/([^/?#]+)/i);
    if (m2) id = m2[1];

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, {
      headers: { "User-Agent": "ETUZA-HUB/1.0" },
      next: { revalidate: 86400 },
    });

    if (!metaRes.ok) {
      return NextResponse.json({ error: "Metadata not found", id }, { status: 404 });
    }

    const meta = await metaRes.json();
    const files: {
      name: string;
      format?: string;
      source?: string;
      size?: string;
      height?: string;
    }[] = meta.files || [];

    const videoExt = /\.(mp4|webm|ogv|mkv|avi|mov)$/i;
    const candidates = files.filter((f) => videoExt.test(f.name));

    // Prefer smaller derivative h.264 / 512Kb, then ia.mp4, then original mp4
    const score = (f: (typeof candidates)[0]) => {
      const name = f.name.toLowerCase();
      const fmt = (f.format || "").toLowerCase();
      let s = 0;
      if (fmt.includes("512kb") || name.includes("512kb")) s += 100;
      if (fmt.includes("h.264") || fmt.includes("h264")) s += 50;
      if (name.includes(".ia.mp4")) s += 40;
      if (fmt.includes("mpeg4") || name.endsWith(".mp4")) s += 20;
      if (f.source === "derivative") s += 10;
      // prefer not huge originals when derivative exists
      const size = Number(f.size || 0);
      if (size > 0 && size < 500_000_000) s += 15;
      return s;
    };

    candidates.sort((a, b) => score(b) - score(a));
    const best = candidates[0];

    if (!best) {
      return NextResponse.json({
        id,
        playUrl: null,
        embedUrl: `https://archive.org/embed/${id}`,
        detailsUrl: `https://archive.org/details/${id}`,
        error: "Hakuna faili ya video kwenye item hii",
      });
    }

    const playUrl = `https://archive.org/download/${id}/${encodeURIComponent(best.name)}`;

    return NextResponse.json({
      id,
      fileName: best.name,
      format: best.format || null,
      playUrl,
      embedUrl: `https://archive.org/embed/${id}`,
      detailsUrl: `https://archive.org/details/${id}`,
      title: meta.metadata?.title || id,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Resolve failed" }, { status: 500 });
  }
}
