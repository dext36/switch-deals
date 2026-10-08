import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseHottest } from '../src/sources/dekudeals.js';

const html = fs.readFileSync(new URL('./fixtures/hottest.html', import.meta.url), 'utf8');
const games = parseHottest(html, 'https://www.dekudeals.com/hottest');
const bySlug = Object.fromEntries(games.map((g) => [g.slug, g]));

test('parses each game card once and skips links without a cover', () => {
  assert.deepEqual(Object.keys(bySlug).sort(), ['celeste', 'hollow-knight']);
});

test('extracts title, link, image and prices', () => {
  assert.deepEqual(bySlug['hollow-knight'], {
    slug: 'hollow-knight',
    title: 'Hollow Knight',
    url: 'https://www.dekudeals.com/items/hollow-knight',
    image: 'https://cdn.example/hk.jpg',
    price: '$7.49',
    originalPrice: '$14.99',
    discount: 50,
  });
});

test('handles a game without discount and lazy-loaded image', () => {
  const celeste = bySlug.celeste;
  assert.equal(celeste.url, 'https://www.dekudeals.com/items/celeste');
  assert.equal(celeste.image, 'https://cdn.example/celeste.jpg');
  assert.equal(celeste.price, '$19.99');
  assert.equal(celeste.originalPrice, null);
  assert.equal(celeste.discount, null);
});
