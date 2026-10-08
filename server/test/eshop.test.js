import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDiscountedGames, fetchSalePrices } from '../src/sources/eshop.js';

const jsonResponse = (body) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

test('pages through the Nintendo Europe search and keeps game nsuids only', async () => {
  const requests = [];
  const pages = [
    { numFound: 1002, docs: [
      { title: 'Hogwarts Legacy', nsuid_txt: ['70070000019472', '70010000062277'], url: '/en-gb/Games/x.html', image_url_h2x1_s: 'wide.jpg' },
      { title: 'No nsuid' },
    ] },
    { numFound: 1002, docs: [{ title: 'Celeste', nsuid_txt: ['70010000000001'], image_url_sq_s: 'sq.jpg' }] },
  ];
  const games = await fetchDiscountedGames({
    fetchImpl: async (url) => {
      requests.push(new URL(url));
      return jsonResponse({ response: pages[requests.length - 1] });
    },
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[1].searchParams.get('start'), '1000');
  assert.match(requests[0].searchParams.get('fq'), /price_has_discount_b:true/);
  assert.deepEqual(games, [
    { nsuid: '70010000062277', title: 'Hogwarts Legacy', url: 'https://www.nintendo.com/en-gb/Games/x.html', image: 'wide.jpg', popularityRank: 1 },
    { nsuid: '70010000000001', title: 'Celeste', url: null, image: 'sq.jpg', popularityRank: 2 },
  ]);
});

test('fetches prices in batches of 50 and keeps only discounted ones', async () => {
  const batches = [];
  const ids = Array.from({ length: 51 }, (_, i) => String(70010000000000 + i));
  const prices = await fetchSalePrices(ids, {
    country: 'PL',
    fetchImpl: async (url) => {
      const params = new URL(url).searchParams;
      batches.push(params.get('ids').split(',').length);
      assert.equal(params.get('country'), 'PL');
      return jsonResponse({
        prices: params.get('ids').startsWith('70010000000000')
          ? [
              { title_id: 70010000000000, sales_status: 'onsale',
                regular_price: { amount: '124,00 zł', raw_value: '124' },
                discount_price: { amount: '18,60 zł', raw_value: '18.60', end_datetime: '2026-10-30T22:59:59Z' } },
              { title_id: 70010000000001, sales_status: 'onsale', regular_price: { amount: '269,00 zł', raw_value: '269' } },
            ]
          : [],
      });
    },
  });

  assert.deepEqual(batches, [50, 1]);
  assert.deepEqual([...prices.entries()], [
    ['70010000000000', { price: '18,60 zł', originalPrice: '124,00 zł', discount: 85, saleEndsAt: '2026-10-30T22:59:59Z' }],
  ]);
});
