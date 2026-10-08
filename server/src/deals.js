// Normalizacja tytułów do porównania eShop ↔ IGDB: bez znaków ™®©, interpunkcji, wielkości liter
// i dopisków typowych dla wersji na Switcha.
export function normalizeTitle(title) {
  return title
    .replace(/[\u2122\u00ae\u00a9]/g, '') // ™®© – przed NFKD, który zamienia ™ na „TM”
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(nintendo switch( 2)? edition|for nintendo switch( 2)?)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// „Ni no Kuni II: Revenant Kingdom - The Prince's Edition” → „Ni no Kuni II: Revenant Kingdom”.
const withoutEdition = (title) => title.replace(/\s+[-–—:]\s+[^-–—:]*\bedition\s*$/i, '');

function indexByTitle(igdbGames) {
  const index = new Map();
  for (const game of igdbGames) {
    const names = [game.name, ...(game.alternative_names ?? []).map((a) => a.name)];
    for (const name of names) {
      const key = normalizeTitle(name ?? '');
      const current = index.get(key);
      // Przy dwóch grach o tej samej nazwie wybieramy tę z większą liczbą recenzji.
      if (key && (!current || (game.aggregated_rating_count ?? 0) > (current.aggregated_rating_count ?? 0))) {
        index.set(key, game);
      }
    }
  }
  return index;
}

const MAX_SCREENSHOTS = 8;

const pickGameplay = (videos = []) => videos.find((v) => /gameplay/i.test(v.name ?? '')) ?? null;

// Łączy: gry w promocji (eShop EU, już pobrane) × ocena krytyków (IGDB) × aktualne ceny w danym kraju.
export async function findRatedDeals({ onSale, fetchTopRated, fetchSalePrices }) {
  const index = indexByTitle(await fetchTopRated());

  const matched = new Map();
  for (const game of onSale) {
    const igdb = index.get(normalizeTitle(game.title)) ?? index.get(normalizeTitle(withoutEdition(game.title)));
    if (igdb && !matched.has(game.nsuid)) matched.set(game.nsuid, { game, igdb });
  }

  const prices = await fetchSalePrices([...matched.keys()]);
  const deals = [];
  for (const [nsuid, { game, igdb }] of matched) {
    const price = prices.get(nsuid);
    if (!price) continue; // w wybranym kraju ta gra nie jest przeceniona
    const gameplay = pickGameplay(igdb.videos);
    deals.push({
      slug: nsuid,
      title: game.title,
      url: game.url,
      image: game.image,
      ...price,
      criticScore: Math.round(igdb.aggregated_rating),
      criticReviews: igdb.aggregated_rating_count ?? null,
      // Ocena społeczności – średnia z ocen użytkowników IGDB.
      communityScore: igdb.rating != null ? Math.round(igdb.rating) : null,
      communityRatings: igdb.rating_count ?? null,
      popularityRank: game.popularityRank ?? null,
      igdbUrl: igdb.url ?? null,
      igdbGameplayVideoId: gameplay?.video_id ?? null,
      igdbTrailerVideoId: igdb.videos?.[0]?.video_id ?? null,
      screenshotIds: (igdb.screenshots ?? []).map((s) => s.image_id).filter(Boolean).slice(0, MAX_SCREENSHOTS),
    });
  }

  return deals.sort((a, b) => b.criticScore - a.criticScore || a.title.localeCompare(b.title));
}
