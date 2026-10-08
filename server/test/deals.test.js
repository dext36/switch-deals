import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRatedDeals, normalizeTitle } from '../src/deals.js';

test('normalizeTitle ignores trademarks, punctuation and Switch edition suffixes', () => {
  assert.equal(normalizeTitle('Street Fighter™ 30th Anniversary Collection'), 'street fighter 30th anniversary collection');
  assert.equal(normalizeTitle('Ori and the Will of the Wisps'), normalizeTitle('Ori & the Will of the Wisps'));
  assert.equal(normalizeTitle('DOOM Eternal – Nintendo Switch Edition'), 'doom eternal');
  assert.equal(normalizeTitle('Pokémon Legends: Arceus'), 'pokemon legends arceus');
});

test('keeps only well-rated games that are discounted in the selected country', async () => {
  const onSale = [
    { nsuid: '1', title: 'Hollow Knight', url: 'u1', image: 'i1', popularityRank: 7 },
    { nsuid: '2', title: 'Celeste™', url: 'u2', image: 'i2' },
    { nsuid: '3', title: 'Some Shovelware', url: 'u3', image: 'i3' },
    { nsuid: '4', title: 'Hades', url: 'u4', image: 'i4' },
  ];
  const topRated = [
    { name: 'Hollow Knight', aggregated_rating: 87.4, aggregated_rating_count: 20, rating: 90.6, rating_count: 1200, url: 'igdb/hk',
      videos: [{ name: 'Trailer', video_id: 'tr-hk' }, { name: 'Gameplay Video', video_id: 'gp-hk' }] },
    { name: 'Celeste', aggregated_rating: 91, aggregated_rating_count: 15 },
    { name: 'Hades', aggregated_rating: 93, aggregated_rating_count: 30 },
  ];
  let pricedIds;
  const deals = await findRatedDeals({
    fetchDiscountedGames: async () => onSale,
    fetchTopRated: async () => topRated,
    fetchSalePrices: async (ids) => {
      pricedIds = ids;
      // Hades jest w promocji w UK, ale nie w wybranym kraju.
      return new Map([
        ['1', { price: '30,50 zł', originalPrice: '61,00 zł', discount: 50, saleEndsAt: '2026-10-30T22:59:59Z' }],
        ['2', { price: '19,75 zł', originalPrice: '79,00 zł', discount: 75, saleEndsAt: null }],
      ]);
    },
  });

  assert.deepEqual(pricedIds, ['1', '2', '4']);
  assert.deepEqual(deals.map((d) => [d.title, d.criticScore]), [['Celeste™', 91], ['Hollow Knight', 87]]);
  assert.deepEqual(deals[1], {
    slug: '1', title: 'Hollow Knight', url: 'u1', image: 'i1',
    price: '30,50 zł', originalPrice: '61,00 zł', discount: 50, saleEndsAt: '2026-10-30T22:59:59Z',
    criticScore: 87, criticReviews: 20, communityScore: 91, communityRatings: 1200, popularityRank: 7, igdbUrl: 'igdb/hk',
    igdbGameplayVideoId: 'gp-hk', igdbTrailerVideoId: 'tr-hk',
  });
});

test('matches alternative names from IGDB', async () => {
  const deals = await findRatedDeals({
    fetchDiscountedGames: async () => [{ nsuid: '9', title: 'Pokémon Scarlet' }],
    fetchTopRated: async () => [
      { name: 'Pokémon Scarlet and Violet', alternative_names: [{ name: 'Pokemon Scarlet' }], aggregated_rating: 84 },
    ],
    fetchSalePrices: async () => new Map([['9', { price: '1', originalPrice: '2', discount: 50, saleEndsAt: null }]]),
  });
  assert.equal(deals.length, 1);
});

test('falls back to the title without an edition suffix', async () => {
  const deals = await findRatedDeals({
    fetchDiscountedGames: async () => [
      { nsuid: '1', title: "Ni no Kuni™ II: Revenant Kingdom - The Prince's Edition" },
      { nsuid: '2', title: 'Arise: A Simple Story - Definitive Edition' },
      { nsuid: '3', title: 'Torchlight III' },
    ],
    fetchTopRated: async () => [
      { name: 'Ni no Kuni II: Revenant Kingdom', aggregated_rating: 85 },
      { name: 'Arise: A Simple Story', aggregated_rating: 84 },
      { name: 'Torchlight II', aggregated_rating: 86 },
    ],
    fetchSalePrices: async (ids) => new Map(ids.map((id) => [id, { price: '1', originalPrice: '2', discount: 50, saleEndsAt: null }])),
  });
  assert.deepEqual(deals.map((d) => d.slug).sort(), ['1', '2']);
});
