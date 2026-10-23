/** Free Modobo channels (static bundle — no external API needed) */
export type StaticModoboChannel = {
  id: number;
  title: string;
  logo: string | null;
  category_id: number | null;
  category_name: string;
  free: number;
  has_source: boolean;
};

export const STATIC_MODOBO_FREE: StaticModoboChannel[] = [
  { id: 200, title: "Arise  And Shine", logo: "https://ds.aztv.videoready.tv/util/1754312188774-AriseandShine_posterImagecopy2.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 193, title: "Azam One", logo: "https://i.imgur.com/JfK41hx.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 191, title: "Azam Two", logo: "https://i.imgur.com/gY4t2uT.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 14918, title: "Azm Sports 5", logo: "https://i.imgur.com/VQxkdkx.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 702, title: "Bcn", logo: "https://ds.aztv.videoready.tv/util/1776248211220-BCN-PosterImage2.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 699, title: "Colors Mena", logo: "https://ds.aztv.videoready.tv/util/1746272840373-Colors_posterImage.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 700, title: "Colors Rishtey", logo: "https://ds.aztv.videoready.tv/util/1775809336034-COLORSRISHTEY-PosterImage.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 195, title: "Crown TV", logo: "https://ds.aztv.videoready.tv/util/1745514813150-CrownTVPosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 687, title: "Espn 1", logo: "https://ds.aztv.videoready.tv/util/1771265135226-ESPN-PosterImage.png", category_id: 12, category_name: "Sports  Channel", free: 1, has_source: true },
  { id: 688, title: "Espn 2", logo: "https://ds.aztv.videoready.tv/util/1773401632914-ESPN2-PosterImage.png", category_id: 12, category_name: "Sports  Channel", free: 1, has_source: true },
  { id: 198, title: "Hope TV", logo: "https://ds.aztv.videoready.tv/util/1763969925142-HopeTv_posterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 197, title: "Kix", logo: "https://ds.aztv.videoready.tv/util/1745861711450-KIXMovies_posterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 686, title: "Liverpool TV", logo: "https://ds.aztv.videoready.tv/util/1776272652611-LIVERPOOLTV-PosterImage.png", category_id: 12, category_name: "Sports  Channel", free: 1, has_source: true },
  { id: 203, title: "Mahaasin TV", logo: "https://ds.aztv.videoready.tv/util/1764761598368-MahaasinTV_PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 515, title: "Man U TV", logo: "https://ds.aztv.videoready.tv/util/1773218619758-MUTV-PosterImage.png", category_id: 12, category_name: "Sports  Channel", free: 1, has_source: true },
  { id: 206, title: "Mbc 2", logo: "https://ds.aztv.videoready.tv/util/1775809901128-MBC2-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 694, title: "Mbc 4", logo: "https://ds.aztv.videoready.tv/util/1775810906480-MBC4-PosterImage.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 205, title: "Mbc Action", logo: "https://ds.aztv.videoready.tv/util/1775811221332-MBCACTION-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 690, title: "Mbc Drama", logo: "https://ds.aztv.videoready.tv/util/1775808788921-MBCDRAMA-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 689, title: "Mbc Max", logo: "https://ds.aztv.videoready.tv/util/1775810597658-MBCMAX-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 691, title: "Mbc Plus", logo: "https://ds.aztv.videoready.tv/util/1746271993084-MBCBollywood_posterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 695, title: "Nolly", logo: "https://ds.aztv.videoready.tv/util/1773327684669-NOLLYAFRICA-PosterImage.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 692, title: "Romanza Africa", logo: "https://ds.aztv.videoready.tv/util/1775811458920-ROMANZAAFRICA-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 698, title: "Sony Entertainment", logo: "https://ds.aztv.videoready.tv/util/1746272594063-Sony_posterImage.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 6, title: "Sports 1", logo: "https://bobtv.co.za/logos/54001b6a97ea.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 7, title: "Sports 2", logo: "https://i.imgur.com/XS1xrvQ.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 9, title: "Sports 3", logo: "https://i.imgur.com/EJI4AGC.jpeg", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 1, title: "Sports 4", logo: "https://i.imgur.com/Q3NqXQD.jpeg", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 199, title: "TV Imaan", logo: "https://ds.aztv.videoready.tv/util/1754311969660-TvImaan_posterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 204, title: "TV3", logo: "https://ds.aztv.videoready.tv/util/1776070391082-TV3Sports-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 192, title: "Utv", logo: "https://i.imgur.com/ChwzBIK.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 194, title: "Wasafi TV", logo: "https://ds.aztv.videoready.tv/util/1745862042988-WASAFITV_posterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 201, title: "ZBC 2", logo: "https://ds.aztv.videoready.tv/util/1770914111469-ZBC-PosterImage.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 21451, title: "Zbc", logo: "https://i.imgur.com/wmbrot3.jpeg", category_id: 6, category_name: "Local Channels", free: 1, has_source: false },
  { id: 701, title: "Zoom", logo: "https://ds.aztv.videoready.tv/util/1775809532215-ZOOM-PosterImage.png", category_id: 10, category_name: "Movie Channels", free: 1, has_source: true },
  { id: 8, title: "sinema", logo: "https://i.imgur.com/Z6Y1jSO.png", category_id: 6, category_name: "Local Channels", free: 1, has_source: true },
  { id: 1762, title: "Barcelona TV", logo: "https://i.postimg.cc/85qRYCjB/20250903-033229.jpg", category_id: 12, category_name: "Sports  Channel", free: 1, has_source: false },
  { id: 8642, title: "Cbeebies", logo: "https://i.imgur.com/RXYBUsL.jpeg", category_id: 11, category_name: "Kids Channels", free: 1, has_source: false },
  { id: 8643, title: "Mbc 3", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/MBC_3_Logo.svg/1280px-MBC_3_Logo.svg.png", category_id: 11, category_name: "Kids Channels", free: 1, has_source: false },
  { id: 1166, title: "Manchester City vs Brentford", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 1172, title: "Wolfsburg vs Bayern Munchen", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 1174, title: "Atletico Madrid vs Celta Vigo", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 1198, title: "Lazio vs Inter Milan", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 1144, title: "Sevilla vs Espanyol", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 1180, title: "Galatasaray vs Antalyaspor", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
  { id: 1182, title: "Besiktas vs Trabzonspor", logo: "https://i.imgur.com/aJAStrQ.png", category_id: 4, category_name: "Mechi za Leo", free: 1, has_source: true },
];

export const STATIC_MODOBO_COUNT = STATIC_MODOBO_FREE.length;
