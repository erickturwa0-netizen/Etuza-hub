/** 100+ embed providers for movie/TV by TMDB id (and IMDB where supported) */

export type EmbedKind = "movie" | "tv";

export type ParsedEmbed = {
  id: string;
  kind: EmbedKind;
  imdb?: string;
};

const HOST_RE =
  /(?:vidsrc\.[\w.]+|vsembed\.ru|2embed\.[\w.]+|embed\.su|multiembed\.mov|moviesapi\.club|vidlink\.pro|autoembed\.[\w.]+|player\.videasy\.net|embedsito\.[\w.]+|vidsrc\.icu|vidsrc\.nl|vidsrc\.pro|vidsrc\.cc|smashy\.stream|superembed\.[\w.]+|blackvid\.[\w.]+|filmxy\.[\w.]+|drip\.[\w.]+|embed\.smashystream\.[\w.]+|player\.autoembed\.[\w.]+|nontongo\.[\w.]+|vidsrc\.rip|vidsrc\.net|vidplay\.[\w.]+|vidmoly\.[\w.]+)/i;

export function parseEmbed(url: string): ParsedEmbed | null {
  try {
    const u = url.trim();
    if (!u) return null;

    // TMDB movie
    const mMovie = u.match(
      new RegExp(
        HOST_RE.source +
          "[\\/\\?](?:embed\\/?)?(?:movie|film)\\/?(\\d+)",
        "i"
      )
    );
    if (mMovie) return { id: mMovie[1], kind: "movie" };

    // TMDB tv
    const mTv = u.match(
      new RegExp(
        HOST_RE.source +
          "[\\/\\?](?:embed\\/?)?(?:tv|series)\\/?(\\d+)",
        "i"
      )
    );
    if (mTv) return { id: mTv[1], kind: "tv" };

    // /movie/123 or /tv/123 generic
    const gMovie = u.match(/\/(?:embed\/)?(?:movie|film)\/(\d{3,})/i);
    if (gMovie) return { id: gMovie[1], kind: "movie" };
    const gTv = u.match(/\/(?:embed\/)?(?:tv|series)\/(\d{3,})/i);
    if (gTv) return { id: gTv[1], kind: "tv" };

    // IMDB tt1234567
    const imdb = u.match(/\b(tt\d{7,8})\b/i);
    if (imdb) return { id: imdb[1], kind: "movie", imdb: imdb[1] };

    // bare tmdb id in query
    const q = u.match(/[?&](?:tmdb|id)=(\d{3,})/i);
    if (q) {
      const kind = /tv|series/i.test(u) ? "tv" : "movie";
      return { id: q[1], kind };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Build 100+ embed URLs for a TMDB (or IMDB) id */
export function buildProviders(
  id: string,
  kind: EmbedKind,
  imdb?: string
): string[] {
  const list: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    list.push(url);
  };

  if (kind === "movie") {
    // --- vidsrc family ---
    add(`https://vidsrc.to/embed/movie/${id}`);
    add(`https://vidsrc.xyz/embed/movie/${id}`);
    add(`https://vidsrc.me/embed/movie/${id}`);
    add(`https://vidsrc.pm/embed/movie/${id}`);
    add(`https://vidsrc.icu/embed/movie/${id}`);
    add(`https://vidsrc.nl/embed/movie/${id}`);
    add(`https://vidsrc.pro/embed/movie/${id}`);
    add(`https://vidsrc.cc/v2/embed/movie/${id}`);
    add(`https://vidsrc.cc/embed/movie/${id}`);
    add(`https://vidsrc.rip/embed/movie/${id}`);
    add(`https://vidsrc.net/embed/movie/${id}`);

    // --- 2embed ---
    add(`https://www.2embed.cc/embed/${id}`);
    add(`https://2embed.org/embed/${id}`);
    add(`https://2embed.skin/embed/${id}`);
    add(`https://www.2embed.skin/embed/${id}`);
    add(`https://2embed.cc/embed/${id}`);
    add(`https://www.2embed.to/embed/tmdb/movie?id=${id}`);
    add(`https://2embed.to/embed/tmdb/movie?id=${id}`);

    // --- multi / auto / link ---
    add(`https://multiembed.mov/?video_id=${id}&tmdb=1`);
    add(`https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`);
    add(`https://embed.su/embed/movie/${id}`);
    add(`https://vidlink.pro/movie/${id}`);
    add(`https://player.videasy.net/movie/${id}`);
    add(`https://moviesapi.club/movie/${id}`);
    add(`https://autoembed.cc/embed/movie/${id}`);
    add(`https://player.autoembed.cc/embed/movie/${id}`);
    add(`https://www.autoembed.cc/embed/movie/${id}`);

    // --- smashy / super ---
    add(`https://embed.smashystream.com/playere.php?tmdb=${id}`);
    add(`https://player.smashy.stream/movie/${id}`);
    add(`https://smashy.stream/movie/${id}`);
    add(`https://superembed.stream/embed.php?id=${id}&tmdb=1`);

    // --- misc popular embeds ---
    add(`https://embedsito.com/embed/movie?tmdb=${id}`);
    add(`https://www.embedsito.com/embed/movie?tmdb=${id}`);
    add(`https://vidsrc.embed.su/embed/movie/${id}`);
    add(`https://blackvid.one/embed/movie/${id}`);
    add(`https://filmxy.vip/embed/movie/${id}`);
    add(`https://nontongo.win/embed/movie/${id}`);
    add(`https://vidplay.online/embed/movie/${id}`);
    add(`https://vidmoly.to/embed/${id}`);

    // --- more mirrors ---
    add(`https://www.vidsrc.me/embed/movie/${id}`);
    add(`https://www.vidsrc.to/embed/movie/${id}`);
    add(`https://www.vidsrc.xyz/embed/movie/${id}`);
    add(`https://vidsrc-embed.ru/embed/movie/${id}`);
    add(`https://vsembed.ru/embed/movie/${id}`);
    add(`https://vidsrc.in/embed/movie/${id}`);
    add(`https://vidsrc.wtf/embed/movie/${id}`);

    // --- player.videasy variants ---
    add(`https://player.videasy.net/movie/${id}?color=8b5cf6`);
    add(`https://vidlink.pro/movie/${id}?primaryColor=8b5cf6`);

    // --- embed.su / flix ---
    add(`https://embed.su/embed/movie/${id}?server=1`);
    add(`https://embed.su/embed/movie/${id}?server=2`);
    add(`https://embed.su/embed/movie/${id}?server=3`);

    // --- moviesapi variants ---
    add(`https://moviesapi.club/movie/${id}/`);
    add(`https://www.moviesapi.club/movie/${id}`);

    // --- 2embed id style ---
    add(`https://www.2embed.cc/embedtmdb.php?id=${id}`);
    add(`https://www.2embed.skin/embedtmdb.php?id=${id}`);

    // --- additional community mirrors ---
    for (let s = 1; s <= 12; s++) {
      add(`https://vidsrc.to/embed/movie/${id}?ds_lang=en&server=${s}`);
    }
    for (let s = 1; s <= 8; s++) {
      add(`https://vidsrc.xyz/embed/movie/${id}?server=${s}`);
    }
    for (let s = 1; s <= 6; s++) {
      add(`https://vidlink.pro/movie/${id}?server=${s}`);
    }
    for (let s = 1; s <= 5; s++) {
      add(`https://player.videasy.net/movie/${id}?server=${s}`);
    }

    // IMDB variants
    if (imdb) {
      add(`https://vidsrc.to/embed/movie/${imdb}`);
      add(`https://vidsrc.xyz/embed/movie/${imdb}`);
      add(`https://vidsrc.me/embed/movie/${imdb}`);
      add(`https://www.2embed.cc/embed/${imdb}`);
      add(`https://multiembed.mov/?video_id=${imdb}`);
      add(`https://embed.su/embed/movie/${imdb}`);
      add(`https://vidlink.pro/movie/${imdb}`);
      add(`https://autoembed.cc/embed/movie/${imdb}`);
    }
  } else {
    // TV series
    add(`https://vidsrc.to/embed/tv/${id}`);
    add(`https://vidsrc.xyz/embed/tv/${id}`);
    add(`https://vidsrc.me/embed/tv/${id}`);
    add(`https://vidsrc.pm/embed/tv/${id}`);
    add(`https://vidsrc.icu/embed/tv/${id}`);
    add(`https://vidsrc.nl/embed/tv/${id}`);
    add(`https://vidsrc.pro/embed/tv/${id}`);
    add(`https://vidsrc.cc/v2/embed/tv/${id}`);
    add(`https://vidsrc.cc/embed/tv/${id}`);
    add(`https://vidsrc.rip/embed/tv/${id}`);
    add(`https://vidsrc.net/embed/tv/${id}`);

    add(`https://www.2embed.cc/embedtv/${id}`);
    add(`https://2embed.org/embedtv/${id}`);
    add(`https://2embed.skin/embedtv/${id}`);
    add(`https://www.2embed.to/embed/tmdb/tv?id=${id}`);

    add(`https://multiembed.mov/?video_id=${id}&tmdb=1&s=1&e=1`);
    add(`https://embed.su/embed/tv/${id}`);
    add(`https://vidlink.pro/tv/${id}`);
    add(`https://player.videasy.net/tv/${id}`);
    add(`https://moviesapi.club/tv/${id}`);
    add(`https://autoembed.cc/embed/tv/${id}`);
    add(`https://player.autoembed.cc/embed/tv/${id}`);
    add(`https://embed.smashystream.com/playere.php?tmdb=${id}&type=tv`);
    add(`https://player.smashy.stream/tv/${id}`);
    add(`https://vsembed.ru/embed/tv/${id}`);
    add(`https://vidsrc-embed.ru/embed/tv/${id}`);

    for (let s = 1; s <= 10; s++) {
      add(`https://vidsrc.to/embed/tv/${id}?server=${s}`);
    }
    for (let s = 1; s <= 6; s++) {
      add(`https://vidsrc.xyz/embed/tv/${id}?server=${s}`);
    }
    for (let s = 1; s <= 5; s++) {
      add(`https://vidlink.pro/tv/${id}?server=${s}`);
    }
  }

  return list;
}

export function providerLabel(url: string, index: number): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const short = host.split(".")[0];
    return `S${index + 1} · ${short}`;
  } catch {
    return `Server ${index + 1}`;
  }
}
