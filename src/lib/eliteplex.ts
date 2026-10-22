import { prisma } from "@/lib/prisma";

const BASE = "https://eliteplex-api.vercel.app";
/** Classics + API titles year <= 2024 (skip unplayable 2025/2026) */
const MOVIE_TAG = "eliteplex-github-v11-playable-many";
const DRAMA_TAG = "eliteplex-drama-v11-playable";
const MAX_YEAR = 2024;

type EliteItem = {
  id?: string;
  tmdb_id?: string;
  name?: string;
  title?: string;
  poster?: string;
  overview?: string;
  year?: string;
};

/** Popular titles that usually work on VidSrc / 2Embed */
const CLASSIC_SEEDS: { id: string; title: string; year: string; poster?: string }[] = [
  { id: "27205", title: "Inception", year: "2010", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { id: "157336", title: "Interstellar", year: "2014", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: "155", title: "The Dark Knight", year: "2008", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { id: "299536", title: "Avengers: Infinity War", year: "2018", poster: "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hIcaUR.jpg" },
  { id: "299534", title: "Avengers: Endgame", year: "2019", poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
  { id: "24428", title: "The Avengers", year: "2012", poster: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24TyDX7oO8SIyI.jpg" },
  { id: "414906", title: "The Batman", year: "2022", poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fbrcxm3BL9c8Bkj2.jpg" },
  { id: "680", title: "Pulp Fiction", year: "1994", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPAsjYu.jpg" },
  { id: "597", title: "Titanic", year: "1997", poster: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" },
  { id: "278", title: "The Shawshank Redemption", year: "1994", poster: "https://image.tmdb.org/t/p/w500/9cqNxrMVnUwAFEUnhR2nA3zNKm.jpg" },
  { id: "238", title: "The Godfather", year: "1972", poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg" },
  { id: "550", title: "Fight Club", year: "1999", poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { id: "13", title: "Forrest Gump", year: "1994", poster: "https://image.tmdb.org/t/p/w500/arw2kNYZ6hA1nX8iNlYg2TdQS8.jpg" },
  { id: "603", title: "The Matrix", year: "1999", poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { id: "120", title: "The Lord of the Rings: The Fellowship of the Ring", year: "2001", poster: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  { id: "122", title: "The Lord of the Rings: The Return of the King", year: "2003", poster: "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg" },
  { id: "121", title: "The Lord of the Rings: The Two Towers", year: "2002", poster: "https://image.tmdb.org/t/p/w500/5VTN0pR8gcqV3EPUHHfMGnJyyJv.jpg" },
  { id: "475557", title: "Joker", year: "2019", poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
  { id: "438631", title: "Dune", year: "2021", poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94SCyV0TdR.jpg" },
  { id: "693134", title: "Dune: Part Two", year: "2024", poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: "872585", title: "Oppenheimer", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykE0UmQ5Q3vTD.jpg" },
  { id: "346698", title: "Barbie", year: "2023", poster: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg" },
  { id: "76600", title: "Avatar: The Way of Water", year: "2022", poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  { id: "19995", title: "Avatar", year: "2009", poster: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg" },
  { id: "1022789", title: "Inside Out 2", year: "2024", poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg" },
  { id: "569094", title: "Spider-Man: Across the Spider-Verse", year: "2023", poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  { id: "324857", title: "Spider-Man: Into the Spider-Verse", year: "2018", poster: "https://image.tmdb.org/t/p/w500/iiZZtoqCyX7hA6Ftg37o56mZvfk.jpg" },
  { id: "11", title: "Star Wars", year: "1977", poster: "https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XMvVgm8HDqZQDpYN.jpg" },
  { id: "1891", title: "The Empire Strikes Back", year: "1980", poster: "https://image.tmdb.org/t/p/w500/nNAeTmF4ntnwRyxu6XYd2XNzrtF.jpg" },
  { id: "424", title: "Schindler's List", year: "1993", poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { id: "129", title: "Spirited Away", year: "2001", poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" },
  { id: "497", title: "The Green Mile", year: "1999", poster: "https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg" },
  { id: "496243", title: "Parasite", year: "2019", poster: "https://image.tmdb.org/t/p/w500/7IiTQwIVwNncxM1xVaRPV62QyeB.jpg" },
  { id: "49026", title: "The Dark Knight Rises", year: "2012", poster: "https://image.tmdb.org/t/p/w500/hr0L2aueqlP2BYUblTTjrlY0tAs.jpg" },
  { id: "76341", title: "Mad Max: Fury Road", year: "2015", poster: "https://image.tmdb.org/t/p/w500/hA2epsMjHDpTxALjupBziOUdxqg.jpg" },
  { id: "671", title: "Harry Potter and the Philosopher's Stone", year: "2001", poster: "https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg" },
  { id: "672", title: "Harry Potter and the Chamber of Secrets", year: "2002", poster: "https://image.tmdb.org/t/p/w500/sdEOH0992YZ0QMEXeGqGklQR7Ig.jpg" },
  { id: "12445", title: "Harry Potter and the Deathly Hallows: Part 2", year: "2011", poster: "https://image.tmdb.org/t/p/w500/c54HpQmuwXjHq2C9wmoACjxoom3.jpg" },
  { id: "118340", title: "Guardians of the Galaxy", year: "2014", poster: "https://image.tmdb.org/t/p/w500/r7vmZjiyZw9xS6QNgjH6x3RHD0n.jpg" },
  { id: "1726", title: "Iron Man", year: "2008", poster: "https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COTS8cMVORJ.jpg" },
  { id: "10138", title: "Iron Man 2", year: "2010", poster: "https://image.tmdb.org/t/p/w500/6WBekiy6j5X3PVrmCyi3FJwG9UE.jpg" },
  { id: "68721", title: "Iron Man 3", year: "2013", poster: "https://image.tmdb.org/t/p/w500/qhPtAc1TKbMPqNvcdXZOnChbnES.jpg" },
  { id: "284054", title: "Black Panther", year: "2018", poster: "https://image.tmdb.org/t/p/w500/uxzzTkhVMX6BEzlA7hKNbfYx5sU.jpg" },
  { id: "299537", title: "Captain Marvel", year: "2019", poster: "https://image.tmdb.org/t/p/w500/AtsgWhDnVTflPn5A3vCQ3cZZaot.jpg" },
  { id: "634649", title: "Spider-Man: No Way Home", year: "2021", poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { id: "315635", title: "Spider-Man: Homecoming", year: "2017", poster: "https://image.tmdb.org/t/p/w500/c24sv2weTHPsmDa7jEMN0mDcP94.jpg" },
  { id: "361743", title: "Top Gun: Maverick", year: "2022", poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg" },
  { id: "505642", title: "Black Panther: Wakanda Forever", year: "2022", poster: "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg" },
  { id: "271110", title: "Captain America: Civil War", year: "2016", poster: "https://image.tmdb.org/t/p/w500/rAGiXaUkW7y0E7TOGd0sU5KZ0tD.jpg" },
  { id: "99861", title: "Avengers: Age of Ultron", year: "2015", poster: "https://image.tmdb.org/t/p/w500/4ssDuvEDkSArWEdyBl2X5EHvY8n.jpg" },
  { id: "284053", title: "Thor: Ragnarok", year: "2017", poster: "https://image.tmdb.org/t/p/w500/rzRwTcFvttcNQVYOvGJjvnT6SR8.jpg" },
  { id: "10195", title: "Thor", year: "2011", poster: "https://image.tmdb.org/t/p/w500/prSfAi1xGrEknJxmUkPANbMsf53.jpg" },
  { id: "1771", title: "Captain America: The First Avenger", year: "2011", poster: "https://image.tmdb.org/t/p/w500/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg" },
  { id: "100402", title: "Captain America: The Winter Soldier", year: "2014", poster: "https://image.tmdb.org/t/p/w500/tDKT3xUKI5y3M1k2E0W2kXz8G5D.jpg" },
  { id: "293660", title: "Deadpool", year: "2016", poster: "https://image.tmdb.org/t/p/w500/yGSxMiF0cYuAiyuve5CB6EuaAo6.jpg" },
  { id: "383498", title: "Deadpool 2", year: "2018", poster: "https://image.tmdb.org/t/p/w500/to0spRl1CMDhlvmOihYh4gCvMWQ.jpg" },
  { id: "335983", title: "Venom", year: "2018", poster: "https://image.tmdb.org/t/p/w500/2uNW4WbgBXL25BAbXGLnL4hQSPM.jpg" },
  { id: "580489", title: "Venom: Let There Be Carnage", year: "2021", poster: "https://image.tmdb.org/t/p/w500/rjkmN1dniUHVYAtwuV3Tji7qCEH.jpg" },
  { id: "299536", title: "Avengers: Infinity War", year: "2018" },
  { id: "140607", title: "Star Wars: The Force Awakens", year: "2015", poster: "https://image.tmdb.org/t/p/w500/wqnLdwVXoBjKibFRR5U3y0aDUhs.jpg" },
  { id: "181808", title: "Star Wars: The Last Jedi", year: "2017", poster: "https://image.tmdb.org/t/p/w500/kOVEVeg59E0wsnXmF9nrh6Ayth.jpg" },
  { id: "181812", title: "Star Wars: The Rise of Skywalker", year: "2019", poster: "https://image.tmdb.org/t/p/w500/db32LaOibwEliAmSL2jjDF6oDdj.jpg" },
  { id: "330457", title: "Frozen II", year: "2019", poster: "https://image.tmdb.org/t/p/w500/mINJaa34MtknCYl5AjtNJzWj8cH.jpg" },
  { id: "109445", title: "Frozen", year: "2013", poster: "https://image.tmdb.org/t/p/w500/kgwjIb2JDHRhNk6lm7ahpOVoD0X.jpg" },
  { id: "354912", title: "Coco", year: "2017", poster: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZcK9S5ohJ.jpg" },
  { id: "508442", title: "Soul", year: "2020", poster: "https://image.tmdb.org/t/p/w500/hm58Jw4Lw8OIeECIq5qyPYhAxSc.jpg" },
  { id: "508943", title: "Luca", year: "2021", poster: "https://image.tmdb.org/t/p/w500/jTswp6KyDYKtvC52GbHagrZbGPW.jpg" },
  { id: "508947", title: "Turning Red", year: "2022", poster: "https://image.tmdb.org/t/p/w500/qsdjkfjsd.jpg" },
  { id: "862", title: "Toy Story", year: "1995", poster: "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg" },
  { id: "301528", title: "Toy Story 4", year: "2019", poster: "https://image.tmdb.org/t/p/w500/w9kR8qbmQ01HwnANqxyfR6H4Z8.jpg" },
  { id: "12", title: "Finding Nemo", year: "2003", poster: "https://image.tmdb.org/t/p/w500/eHuGQ10FUzK8KwPtL9aKXej4G1A.jpg" },
  { id: "150540", title: "Inside Out", year: "2015", poster: "https://image.tmdb.org/t/p/w500/2H1TmgdfNtsKlU9jKdeNyYL5y3T.jpg" },
  { id: "98", title: "Gladiator", year: "2000", poster: "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg" },
  { id: "37799", title: "The Social Network", year: "2010", poster: "https://image.tmdb.org/t/p/w500/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg" },
  { id: "68718", title: "Django Unchained", year: "2012", poster: "https://image.tmdb.org/t/p/w500/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg" },
  { id: "16869", title: "Inglourious Basterds", year: "2009", poster: "https://image.tmdb.org/t/p/w500/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg" },
  { id: "807", title: "Se7en", year: "1995", poster: "https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg" },
  { id: "274", title: "The Silence of the Lambs", year: "1991", poster: "https://image.tmdb.org/t/p/w500/uS9m8OBk1AduinpfCVB9wWqi8EL.jpg" },
  { id: "62", title: "2001: A Space Odyssey", year: "1968", poster: "https://image.tmdb.org/t/p/w500/ve72VxNqjLLUhZQUAcEyRpBCvl0.jpg" },
  { id: "105", title: "Back to the Future", year: "1985", poster: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7wxTTvQJtHlmQyRbDr.jpg" },
  { id: "78", title: "Blade Runner", year: "1982", poster: "https://image.tmdb.org/t/p/w500/63N9uyqqo3FR4w9Q1K9Y9kX0n0.jpg" },
  { id: "335984", title: "Blade Runner 2049", year: "2017", poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg" },
  { id: "106646", title: "The Wolf of Wall Street", year: "2013", poster: "https://image.tmdb.org/t/p/w500/34m2tygAYBGqA0MQSrDBCAkGTg1.jpg" },
  { id: "27205", title: "Inception", year: "2010" },
  { id: "37165", title: "The Truman Show", year: "1998", poster: "https://image.tmdb.org/t/p/w500/vuza0WqY839y3yR6c2e2lQ3mE1.jpg" },
  { id: "389", title: "12 Angry Men", year: "1957", poster: "https://image.tmdb.org/t/p/w500/ow3wq89wM8qd5X7hWKxiRfsDbYP.jpg" },
  { id: "429", title: "The Good, the Bad and the Ugly", year: "1966", poster: "https://image.tmdb.org/t/p/w500/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg" },
  { id: "8587", title: "The Lion King", year: "1994", poster: "https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg" },
  { id: "420818", title: "The Lion King", year: "2019", poster: "https://image.tmdb.org/t/p/w500/2bXbqYdUdNVa8mcSm0p6zR0K0k.jpg" },
  { id: "337401", title: "Mulan", year: "2020", poster: "https://image.tmdb.org/t/p/w500/aKx1ARwG55zZ0GpRvU2WrQ39gFO.jpg" },
  { id: "337404", title: "Cruella", year: "2021", poster: "https://image.tmdb.org/t/p/w500/wToO8opxkGwKgSfJ1JK8tGvkG6U.jpg" },
  { id: "508439", title: "Sonic the Hedgehog", year: "2020", poster: "https://image.tmdb.org/t/p/w500/aQvJ5WPzZgYVDrxLX4R6cLJCEaQ.jpg" },
  { id: "675353", title: "Sonic the Hedgehog 2", year: "2022", poster: "https://image.tmdb.org/t/p/w500/6DrHO1qD2h7gQ8k6n6.jpg" },
  { id: "616037", title: "Thor: Love and Thunder", year: "2022", poster: "https://image.tmdb.org/t/p/w500/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg" },
  { id: "447277", title: "The Little Mermaid", year: "2023", poster: "https://image.tmdb.org/t/p/w500/ym1dxyOk4jFcSl4Q2zmRrA5BEEN.jpg" },
  { id: "502356", title: "The Super Mario Bros. Movie", year: "2023", poster: "https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg" },
  { id: "385687", title: "Fast X", year: "2023", poster: "https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclGl9.jpg" },
  { id: "575264", title: "Mission: Impossible – Dead Reckoning Part One", year: "2023", poster: "https://image.tmdb.org/t/p/w500/NNxYkU70WbThKmApBfDAeOq5o.jpg" },
  { id: "667538", title: "Transformers: Rise of the Beasts", year: "2023", poster: "https://image.tmdb.org/t/p/w500/gPbM0MK8CP8A174ghSzYSyepJqH.jpg" },
  { id: "447273", title: "The Marvels", year: "2023", poster: "https://image.tmdb.org/t/p/w500/9GBhzXMFjgcZ3FdRMej8tHPoybW.jpg" },
  { id: "609681", title: "The Marvels", year: "2023" },
  { id: "507089", title: "Five Nights at Freddy's", year: "2023", poster: "https://image.tmdb.org/t/p/w500/A4j8S6moYwLwr0fX0jL1r8YwV.jpg" },
  { id: "1072790", title: "Anyone But You", year: "2023", poster: "https://image.tmdb.org/t/p/w500/5T1jA3vN2iY0l3q8.jpg" },
  { id: "466420", title: "Killers of the Flower Moon", year: "2023", poster: "https://image.tmdb.org/t/p/w500/dB6Krk806ceh8m0E7J9R0j6G0E.jpg" },
  { id: "1011985", title: "Kung Fu Panda 4", year: "2024", poster: "https://image.tmdb.org/t/p/w500/kDp1vUBnM6trq6U2xKj8.jpg" },
  { id: "823464", title: "Godzilla x Kong: The New Empire", year: "2024", poster: "https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg" },
  { id: "786892", title: "Furiosa: A Mad Max Saga", year: "2024", poster: "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg" },
  { id: "929590", title: "Civil War", year: "2024", poster: "https://image.tmdb.org/t/p/w500/sh7Rg8Iv1u8OAVJAocvpWA1H5Cs.jpg" },
  { id: "748783", title: "The Garfield Movie", year: "2024", poster: "https://image.tmdb.org/t/p/w500/p6Ab8mvEFjdqOYlclS7j9iY5F8.jpg" },
  { id: "519182", title: "Despicable Me 4", year: "2024", poster: "https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQdsG0BIi.jpg" },
  { id: "573435", title: "Bad Boys: Ride or Die", year: "2024", poster: "https://image.tmdb.org/t/p/w500/nP6SsQ1.jpg" },
  { id: "533535", title: "Deadpool & Wolverine", year: "2024", poster: "https://image.tmdb.org/t/p/w500/8cdWJv2MPST4V0H4.jpg" },
];

async function fetchPages(path: string, pages: number[]): Promise<EliteItem[]> {
  const out: EliteItem[] = [];
  for (const page of pages) {
    try {
      const res = await fetch(`${BASE}${path}?page=${page}`, {
        headers: { Accept: "application/json", "User-Agent": "ETUZA-HUB/1.0" },
        next: { revalidate: 0 },
      });
      if (!res.ok) break;
      const data = await res.json();
      const items = (data?.items || []) as EliteItem[];
      if (!items.length) break;
      out.push(...items);
    } catch {
      break;
    }
  }
  return out;
}

function yearNum(y?: string) {
  const n = parseInt(String(y || "").slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function importElitePlexMovies(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({ where: { category: "movie" } });
  if (!force && existing?.notes === MOVIE_TAG) {
    return prisma.content.count({ where: { type: "movie", status: "published" } });
  }

  const byId = new Map<string, EliteItem>();

  for (const c of CLASSIC_SEEDS) {
    byId.set(c.id, {
      tmdb_id: c.id,
      id: c.id,
      name: c.title,
      year: c.year,
      poster: c.poster,
    });
  }

  // Pull many pages from API — only year <= MAX_YEAR
  const remote = await fetchPages("/api/movies", [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  ]);
  for (const row of remote) {
    const id = String(row.tmdb_id || row.id || "");
    if (!/^\d{2,7}$/.test(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_YEAR) continue;
    if (!byId.has(id)) byId.set(id, row);
  }

  await prisma.content.deleteMany({ where: { type: "movie" } });

  const ordered = [...byId.values()].sort(
    (a, b) => yearNum(b.year) - yearNum(a.year)
  );

  // Batch create for speed
  const chunk = 40;
  let total = 0;
  for (let i = 0; i < ordered.length; i += chunk) {
    const slice = ordered.slice(i, i + chunk);
    const data = slice
      .map((row) => {
        const id = String(row.tmdb_id || row.id || "");
        const title = String(row.name || row.title || "").trim();
        if (!id || !title) return null;
        const y = yearNum(row.year);
        return {
          type: "movie" as const,
          title: title.slice(0, 200),
          description: row.overview
            ? String(row.overview).slice(0, 500)
            : y
              ? `Year ${y}`
              : null,
          linkUrl: `https://vidsrc.to/embed/movie/${id}`,
          coverUrl: row.poster || null,
          linkType: "stream" as const,
          category: y ? `Movie · ${y}` : "Movie",
          status: "published" as const,
        };
      })
      .filter(Boolean) as {
      type: "movie";
      title: string;
      description: string | null;
      linkUrl: string;
      coverUrl: string | null;
      linkType: "stream";
      category: string;
      status: "published";
    }[];

    if (data.length) {
      await prisma.content.createMany({ data });
      total += data.length;
    }
  }

  await prisma.apiSource.upsert({
    where: { category: "movie" },
    create: {
      category: "movie",
      name: "Playable movies (<=2024)",
      url: `${BASE}/api/movies`,
      notes: MOVIE_TAG,
      enabled: true,
    },
    update: {
      name: "Playable movies (<=2024)",
      notes: MOVIE_TAG,
      enabled: true,
    },
  });

  return total;
}

export async function importElitePlexDrama(force = false): Promise<number> {
  const existing = await prisma.apiSource.findUnique({ where: { category: "drama" } });
  if (!force && existing?.notes === DRAMA_TAG) {
    return prisma.content.count({ where: { type: "drama", status: "published" } });
  }

  const series = await fetchPages("/api/series", [1, 2, 3, 4, 5, 6, 8, 10]);
  await prisma.content.deleteMany({ where: { type: "drama" } });

  const seen = new Set<string>();
  const rows: {
    type: "drama";
    title: string;
    description: string | null;
    linkUrl: string;
    coverUrl: string | null;
    linkType: "stream";
    category: string;
    status: "published";
  }[] = [];

  for (const row of series) {
    const id = String(row.tmdb_id || row.id || "");
    const title = String(row.name || row.title || "").trim();
    if (!id || !title || seen.has(id)) continue;
    if (!/^\d{2,7}$/.test(id)) continue;
    const y = yearNum(row.year);
    if (y && y > MAX_YEAR) continue;
    seen.add(id);
    rows.push({
      type: "drama",
      title: title.slice(0, 200),
      description: row.overview ? String(row.overview).slice(0, 500) : null,
      linkUrl: `https://vidsrc.to/embed/tv/${id}`,
      coverUrl: row.poster || null,
      linkType: "stream",
      category: y ? `Series · ${y}` : "Series",
      status: "published",
    });
  }

  if (rows.length) await prisma.content.createMany({ data: rows });

  await prisma.apiSource.upsert({
    where: { category: "drama" },
    create: {
      category: "drama",
      name: "ElitePlex Series",
      url: `${BASE}/api/series`,
      notes: DRAMA_TAG,
      enabled: true,
    },
    update: { notes: DRAMA_TAG, enabled: true },
  });

  return rows.length;
}

export async function ensureElitePlexContent(
  type: "movie" | "drama"
): Promise<number> {
  if (type === "movie") {
    const src = await prisma.apiSource.findUnique({ where: { category: "movie" } });
    if (!src || src.notes !== MOVIE_TAG) {
      return importElitePlexMovies(true);
    }
    const count = await prisma.content.count({
      where: { type: "movie", status: "published" },
    });
    if (count === 0) return importElitePlexMovies(true);
    return count;
  }

  const src = await prisma.apiSource.findUnique({ where: { category: "drama" } });
  if (!src || src.notes !== DRAMA_TAG) {
    return importElitePlexDrama(true);
  }
  const count = await prisma.content.count({
    where: { type: "drama", status: "published" },
  });
  if (count === 0) return importElitePlexDrama(true);
  return count;
}
