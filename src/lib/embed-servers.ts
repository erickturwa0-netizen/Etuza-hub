/** 100+ embed providers — best-working hosts first (movie + series/tamthilia) */

export type EmbedKind = "movie" | "tv";

export type ParsedEmbed = {
  id: string;
  kind: EmbedKind;
  imdb?: string;
  season?: number;
  episode?: number;
};

export function parseEmbed(url: string): ParsedEmbed | null {
  try {
    const u = url.trim();
    if (!u) return null;

    const pathTvSe = u.match(
      /\/(?:embed\/)?(?:v2\/)?(?:tv|series)\/(\d{2,})(?:\/(\d{1,2})(?:\/(\d{1,3}))?)?/i
    );
    if (pathTvSe) {
      return {
        id: pathTvSe[1],
        kind: "tv",
        season: pathTvSe[2] ? parseInt(pathTvSe[2], 10) : undefined,
        episode: pathTvSe[3] ? parseInt(pathTvSe[3], 10) : undefined,
      };
    }

    const pathMovie = u.match(
      /\/(?:embed\/)?(?:v2\/)?(?:movie|film)\/(\d{2,})/i
    );
    if (pathMovie) return { id: pathMovie[1], kind: "movie" };

    const qId = u.match(/[?&](?:tmdb|tmdb_id|id)=(\d{2,})/i);
    if (qId) {
      const kind = /(?:[?&]type=tv|\/tv\b|series)/i.test(u) ? "tv" : "movie";
      const s = u.match(/[?&](?:s|season)=(\d+)/i);
      const e = u.match(/[?&](?:e|episode)=(\d+)/i);
      return {
        id: qId[1],
        kind,
        season: s ? parseInt(s[1], 10) : undefined,
        episode: e ? parseInt(e[1], 10) : undefined,
      };
    }

    const imdb = u.match(/\b(tt\d{7,8})\b/i);
    if (imdb) return { id: imdb[1], kind: "movie", imdb: imdb[1] };
  } catch {
    /* ignore */
  }
  return null;
}

export function buildProviders(
  id: string,
  kind: EmbedKind,
  imdb?: string,
  season = 1,
  episode = 1
): string[] {
  const list: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    list.push(url);
  };

  const s = Math.max(1, season || 1);
  const e = Math.max(1, episode || 1);

  if (kind === "movie") {
    add(`https://vidsrc.cc/v2/embed/movie/${id}`);
    add(`https://vidsrc.xyz/embed/movie/${id}`);
    add(`https://vidsrc.to/embed/movie/${id}`);
    add(`https://vidsrc.me/embed/movie/${id}`);
    add(`https://vidsrc.pm/embed/movie/${id}`);
    add(`https://player.videasy.to/movie/${id}`);
    add(`https://player.videasy.net/movie/${id}`);
    add(`https://embed.su/embed/movie/${id}`);
    add(`https://multiembed.mov/?video_id=${id}&tmdb=1`);
    add(`https://www.2embed.cc/embed/${id}`);
    add(`https://2embed.cc/embed/${id}`);
    add(`https://autoembed.cc/embed/movie/${id}`);
    add(`https://player.autoembed.cc/embed/movie/${id}`);
    add(`https://vidlink.pro/movie/${id}`);
    add(`https://moviesapi.club/movie/${id}`);

    add(`https://vidsrc.icu/embed/movie/${id}`);
    add(`https://vidsrc.nl/embed/movie/${id}`);
    add(`https://vidsrc.pro/embed/movie/${id}`);
    add(`https://vidsrc.cc/embed/movie/${id}`);
    add(`https://vidsrc.rip/embed/movie/${id}`);
    add(`https://vidsrc.net/embed/movie/${id}`);
    add(`https://www.vidsrc.to/embed/movie/${id}`);
    add(`https://www.vidsrc.xyz/embed/movie/${id}`);
    add(`https://www.vidsrc.me/embed/movie/${id}`);
    add(`https://vidsrc-embed.ru/embed/movie/${id}`);
    add(`https://vsembed.ru/embed/movie/${id}`);
    add(`https://vidsrc.in/embed/movie/${id}`);

    add(`https://2embed.org/embed/${id}`);
    add(`https://2embed.skin/embed/${id}`);
    add(`https://www.2embed.skin/embed/${id}`);
    add(`https://www.2embed.to/embed/tmdb/movie?id=${id}`);
    add(`https://2embed.to/embed/tmdb/movie?id=${id}`);
    add(`https://www.2embed.cc/embedtmdb.php?id=${id}`);
    add(`https://www.2embed.skin/embedtmdb.php?id=${id}`);

    add(`https://embed.smashystream.com/playere.php?tmdb=${id}`);
    add(`https://player.smashy.stream/movie/${id}`);
    add(`https://smashy.stream/movie/${id}`);
    add(`https://superembed.stream/embed.php?id=${id}&tmdb=1`);
    add(`https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`);
    add(`https://embedsito.com/embed/movie?tmdb=${id}`);
    add(`https://www.embedsito.com/embed/movie?tmdb=${id}`);
    add(`https://blackvid.one/embed/movie/${id}`);
    add(`https://nontongo.win/embed/movie/${id}`);
    add(`https://vidplay.online/embed/movie/${id}`);
    add(`https://vidplay.site/embed/movie/${id}`);
    add(`https://vidbinge.dev/embed/movie/${id}`);

    for (let i = 1; i <= 12; i++) add(`https://vidsrc.to/embed/movie/${id}?server=${i}`);
    for (let i = 1; i <= 10; i++) add(`https://vidsrc.xyz/embed/movie/${id}?server=${i}`);
    for (let i = 1; i <= 8; i++) add(`https://vidsrc.cc/v2/embed/movie/${id}?server=${i}`);
    for (let i = 1; i <= 8; i++) add(`https://player.videasy.to/movie/${id}?server=${i}`);
    for (let i = 1; i <= 6; i++) add(`https://player.videasy.net/movie/${id}?server=${i}`);
    for (let i = 1; i <= 6; i++) add(`https://vidlink.pro/movie/${id}?server=${i}`);
    for (let i = 1; i <= 6; i++) add(`https://embed.su/embed/movie/${id}?server=${i}`);
    for (let i = 1; i <= 5; i++) add(`https://autoembed.cc/embed/movie/${id}?server=${i}`);

    if (imdb) {
      add(`https://vidsrc.cc/v2/embed/movie/${imdb}`);
      add(`https://vidsrc.to/embed/movie/${imdb}`);
      add(`https://vidsrc.xyz/embed/movie/${imdb}`);
      add(`https://www.2embed.cc/embed/${imdb}`);
      add(`https://multiembed.mov/?video_id=${imdb}`);
      add(`https://embed.su/embed/movie/${imdb}`);
      add(`https://player.videasy.to/movie/${imdb}`);
    }
  } else {
    // SERIES / TAMTHILIA — best first + S/E
    add(`https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`);
    add(`https://vidsrc.xyz/embed/tv/${id}/${s}-${e}`);
    add(`https://vidsrc.to/embed/tv/${id}/${s}/${e}`);
    add(`https://vidsrc.me/embed/tv/${id}/${s}-${e}`);
    add(`https://vidsrc.pm/embed/tv/${id}/${s}-${e}`);
    add(`https://player.videasy.to/tv/${id}/${s}/${e}`);
    add(`https://player.videasy.net/tv/${id}/${s}/${e}`);
    add(`https://embed.su/embed/tv/${id}/${s}/${e}`);
    add(`https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`);
    add(`https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`);
    add(`https://autoembed.cc/embed/tv/${id}/${s}/${e}`);
    add(`https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`);
    add(`https://vidlink.pro/tv/${id}/${s}/${e}`);
    add(`https://moviesapi.club/tv/${id}-${s}-${e}`);

    add(`https://vidsrc.cc/v2/embed/tv/${id}`);
    add(`https://vidsrc.xyz/embed/tv/${id}`);
    add(`https://vidsrc.to/embed/tv/${id}`);
    add(`https://vidsrc.me/embed/tv/${id}`);
    add(`https://player.videasy.to/tv/${id}`);
    add(`https://player.videasy.net/tv/${id}`);
    add(`https://embed.su/embed/tv/${id}`);
    add(`https://multiembed.mov/?video_id=${id}&tmdb=1&s=1&e=1`);
    add(`https://moviesapi.club/tv/${id}`);
    add(`https://autoembed.cc/embed/tv/${id}`);
    add(`https://vidlink.pro/tv/${id}`);

    add(`https://vidsrc.icu/embed/tv/${id}/${s}/${e}`);
    add(`https://vidsrc.nl/embed/tv/${id}/${s}/${e}`);
    add(`https://vidsrc.pro/embed/tv/${id}/${s}/${e}`);
    add(`https://vidsrc.cc/embed/tv/${id}/${s}/${e}`);
    add(`https://vidsrc.rip/embed/tv/${id}`);
    add(`https://vsembed.ru/embed/tv/${id}`);
    add(`https://2embed.org/embedtv/${id}`);
    add(`https://2embed.skin/embedtv/${id}`);
    add(`https://www.2embed.to/embed/tmdb/tv?id=${id}`);
    add(`https://embed.smashystream.com/playere.php?tmdb=${id}&type=tv`);
    add(`https://player.smashy.stream/tv/${id}`);
    add(`https://embedsito.com/embed/series?tmdb=${id}&sea=${s}&epi=${e}`);
    add(`https://blackvid.one/embed/tv/${id}/${s}/${e}`);
    add(`https://vidplay.online/embed/tv/${id}/${s}/${e}`);
    add(`https://vidbinge.dev/embed/tv/${id}/${s}/${e}`);

    for (let i = 1; i <= 12; i++) add(`https://vidsrc.to/embed/tv/${id}/${s}/${e}?server=${i}`);
    for (let i = 1; i <= 10; i++) add(`https://vidsrc.xyz/embed/tv/${id}/${s}-${e}?server=${i}`);
    for (let i = 1; i <= 8; i++) add(`https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?server=${i}`);
    for (let i = 1; i <= 8; i++) add(`https://player.videasy.to/tv/${id}/${s}/${e}?server=${i}`);
    for (let i = 1; i <= 6; i++) add(`https://player.videasy.net/tv/${id}?server=${i}`);
    for (let i = 1; i <= 6; i++) add(`https://vidlink.pro/tv/${id}/${s}/${e}?server=${i}`);
    for (let i = 1; i <= 6; i++) add(`https://embed.su/embed/tv/${id}/${s}/${e}?server=${i}`);

    if (e === 1) {
      for (let ep = 2; ep <= 5; ep++) {
        add(`https://vidsrc.cc/v2/embed/tv/${id}/1/${ep}`);
        add(`https://player.videasy.to/tv/${id}/1/${ep}`);
      }
    }
  }

  return list;
}

export function providerLabel(url: string, index: number): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const short = host
      .replace(/\.com$|\.to$|\.cc$|\.xyz$|\.me$|\.pro$|\.net$|\.org$|\.app$/g, "")
      .slice(0, 14);
    return `${index + 1}. ${short}`;
  } catch {
    return `Server ${index + 1}`;
  }
}
