import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameService } from '../src/games.js';

const memoryStore = (initial) => {
  let data = initial ?? { checkedAt: null, updatedAt: null, games: [], videos: {} };
  return { load: async () => structuredClone(data), save: async (d) => { data = structuredClone(d); }, get: () => data };
};

const game = (slug) => ({ slug, title: slug.toUpperCase(), url: `https://x/items/${slug}`, saleStartsAt: null });

// Lista z eShopu to same nsuid gier z listy; buildDeals zwraca gotową listę.
const sources = (getList) => ({
  fetchOnSale: async () => getList().map((g) => ({ nsuid: g.slug })),
  buildDeals: async () => getList(),
  fullRefreshMs: 1e9,
});

test('crawls on first request and looks up videos once per game', async () => {
  let clock = 0;
  let list = [game('a'), game('b')];
  const searched = [];
  const store = memoryStore();
  const service = createGameService({
    store,
    ...sources(() => list),
    findVideo: async (title) => (searched.push(title), { id: `vid-${title}` }),
    checkIntervalMs: 1000,
    now: () => clock,
  });

  const first = await service.getGames();
  assert.equal(first.games.length, 2);
  assert.equal(first.games[0].video.id, 'vid-A');
  assert.match(first.games[0].youtubeSearchUrl, /youtube\.com\/results/);
  assert.deepEqual(searched, ['A', 'B']);

  // W oknie checkIntervalMs nie ma ponownego crawlowania.
  list = [game('c')];
  clock = 500;
  assert.equal((await service.getGames()).games.length, 2);

  // Po upływie interwału lista się aktualizuje, a film szukany jest tylko dla nowej gry.
  clock = 1500;
  const updated = await service.getGames();
  assert.deepEqual(updated.games.map((g) => g.slug), ['c']);
  assert.deepEqual(searched, ['A', 'B', 'C']);
  assert.equal(updated.updatedAt, new Date(1500).toISOString());
});

test('keeps updatedAt when the list did not change', async () => {
  let clock = 0;
  const service = createGameService({
    store: memoryStore(),
    ...sources(() => [game('a')]),
    findVideo: null,
    checkIntervalMs: 1000,
    now: () => clock,
  });
  await service.getGames();
  clock = 5000;
  const result = await service.getGames();
  assert.equal(result.updatedAt, new Date(0).toISOString());
  assert.equal(result.checkedAt, new Date(5000).toISOString());
  assert.equal(result.games[0].video, null);
});

test('serves stored data with an error when crawling fails', async () => {
  const stored = { checkedAt: new Date(0).toISOString(), updatedAt: null, games: [game('a')], videos: {} };
  const service = createGameService({
    store: memoryStore(stored),
    fetchOnSale: async () => { throw new Error('HTTP 503'); },
    findVideo: null,
    checkIntervalMs: 1000,
    now: () => 10_000,
  });
  const result = await service.getGames();
  assert.equal(result.games.length, 1);
  assert.equal(result.error, 'HTTP 503');
});

test('stops video lookups after a YouTube error and retries later', async () => {
  let clock = 0;
  let fail = true;
  const store = memoryStore();
  const service = createGameService({
    store,
    ...sources(() => [game('a'), game('b')]),
    findVideo: async (title) => {
      if (fail) throw new Error('quota');
      return { id: title };
    },
    checkIntervalMs: 1000,
    now: () => clock,
  });
  await service.getGames();
  assert.deepEqual(store.get().videos, {});
  fail = false;
  clock = 2000;
  await service.getGames();
  assert.deepEqual(Object.keys(store.get().videos), ['a', 'b']);
});

test('treats a list with reordered object keys as unchanged', async () => {
  const stored = {
    checkedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    games: [{ saleStartsAt: null, url: 'https://x/items/a', title: 'A', slug: 'a' }],
    videos: {},
  };
  const service = createGameService({
    store: memoryStore(stored),
    ...sources(() => [game('a')]),
    findVideo: null,
    checkIntervalMs: 1000,
    now: () => 5000,
  });
  assert.equal((await service.getGames()).updatedAt, new Date(0).toISOString());
});

test('prefers IGDB gameplay, then YouTube search, then IGDB trailer', async () => {
  const searched = [];
  const service = createGameService({
    store: memoryStore(),
    ...sources(() => [
      { ...game('a'), igdbGameplayVideoId: 'gp-a', igdbTrailerVideoId: 'tr-a' },
      { ...game('b'), igdbGameplayVideoId: null, igdbTrailerVideoId: 'tr-b' },
      { ...game('c'), igdbGameplayVideoId: null, igdbTrailerVideoId: 'tr-c' },
    ]),
    findVideo: async (title) => (searched.push(title), title === 'B' ? { id: 'yt-b' } : null),
    checkIntervalMs: 1000,
  });
  const { games } = await service.getGames();
  assert.deepEqual(searched, ['B', 'C']);
  assert.deepEqual(games.map((g) => g.video?.id), ['gp-a', 'yt-b', 'tr-c']);
  assert.equal(games[0].igdbGameplayVideoId, undefined);
});

test('builds IGDB screenshot URLs and hides the stored ids', async () => {
  const service = createGameService({
    store: memoryStore(),
    ...sources(() => [{ ...game('a'), screenshotIds: ['sc1', 'sc2'] }, game('b')]),
    checkIntervalMs: 1000,
  });
  const { games } = await service.getGames();
  assert.deepEqual(games[0].screenshots, [
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc1.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc2.jpg',
  ]);
  assert.equal(games[0].screenshotIds, undefined);
  assert.deepEqual(games[1].screenshots, []);
});

test('skips IGDB and price lookups when eShop has nothing new', async () => {
  let clock = 0;
  let onSale = [{ nsuid: 'a', popularityRank: 1 }, { nsuid: 'b', popularityRank: 2 }, { nsuid: 'x', popularityRank: 3 }];
  let builds = 0;
  const service = createGameService({
    store: memoryStore(),
    fetchOnSale: async () => onSale,
    buildDeals: async (items) => (builds++, items.filter((g) => g.nsuid !== 'x').map((g) => ({ ...game(g.nsuid), popularityRank: g.popularityRank }))),
    checkIntervalMs: 1000,
    fullRefreshMs: 100_000,
    now: () => clock,
  });
  await service.getGames();
  assert.equal(builds, 1);

  // Ta sama lista w innej kolejności – tylko nowy ranking popularności.
  onSale = [{ nsuid: 'b', popularityRank: 1 }, { nsuid: 'x', popularityRank: 2 }, { nsuid: 'a', popularityRank: 3 }];
  clock = 2000;
  let result = await service.getGames();
  assert.equal(builds, 1);
  assert.deepEqual(result.games.map((g) => [g.slug, g.popularityRank]), [['a', 3], ['b', 1]]);

  // Promocja na „a” się skończyła – usuwamy ją bez przeliczania.
  onSale = [{ nsuid: 'b', popularityRank: 1 }, { nsuid: 'x', popularityRank: 2 }];
  clock = 4000;
  result = await service.getGames();
  assert.equal(builds, 1);
  assert.deepEqual(result.games.map((g) => g.slug), ['b']);
  assert.equal(result.updatedAt, new Date(4000).toISOString());

  // Nowa pozycja w eShopie → pełne przeliczenie.
  onSale = [...onSale, { nsuid: 'c', popularityRank: 3 }];
  clock = 6000;
  result = await service.getGames();
  assert.equal(builds, 2);
  assert.deepEqual(result.games.map((g) => g.slug), ['b', 'c']);

  // Bez zmian, ale po fullRefreshMs od ostatniego przeliczenia → pełne przeliczenie.
  clock = 6000 + 100_000;
  await service.getGames();
  assert.equal(builds, 3);
});

test('rebuilds stored data saved before eShop ids were tracked', async () => {
  let builds = 0;
  const stored = { checkedAt: new Date(0).toISOString(), updatedAt: null, games: [game('a')], videos: {} };
  const service = createGameService({
    store: memoryStore(stored),
    fetchOnSale: async () => [{ nsuid: 'a' }],
    buildDeals: async () => (builds++, [game('a')]),
    checkIntervalMs: 1000,
    fullRefreshMs: 1e9,
    now: () => 10_000,
  });
  await service.getGames();
  assert.equal(builds, 1);
});

test('falls back to the first time a game was seen when the sale start is unknown', async () => {
  let clock = 0;
  let list = [game('a'), { ...game('b'), saleStartsAt: '2026-10-01T00:00:00Z' }];
  const service = createGameService({
    store: memoryStore(),
    fetchOnSale: async () => list.map((g) => ({ nsuid: g.slug })),
    buildDeals: async () => list,
    checkIntervalMs: 1000,
    fullRefreshMs: 1e9,
    now: () => clock,
  });
  let result = await service.getGames();
  assert.deepEqual(result.games.map((g) => g.saleStartsAt), [new Date(0).toISOString(), '2026-10-01T00:00:00Z']);
  assert.equal(result.games[0].firstSeenAt, undefined);

  // Pełne przeliczenie z nową grą – „a” zachowuje datę pierwszego zauważenia.
  list = [...list, game('c')];
  clock = 5000;
  result = await service.getGames();
  assert.deepEqual(result.games.map((g) => g.saleStartsAt), [
    new Date(0).toISOString(), '2026-10-01T00:00:00Z', new Date(5000).toISOString(),
  ]);
});

test('rebuilds stored games saved before the sale start date was tracked', async () => {
  let builds = 0;
  const stored = {
    checkedAt: new Date(0).toISOString(),
    builtAt: new Date(0).toISOString(),
    eshopIds: ['a'],
    games: [{ slug: 'a', title: 'A' }],
    videos: {},
  };
  const service = createGameService({
    store: memoryStore(stored),
    fetchOnSale: async () => [{ nsuid: 'a' }],
    buildDeals: async () => (builds++, [{ ...game('a'), saleStartsAt: '2026-10-01T00:00:00Z' }]),
    checkIntervalMs: 1000,
    fullRefreshMs: 1e9,
    now: () => 10_000,
  });
  const result = await service.getGames();
  assert.equal(builds, 1);
  assert.equal(result.games[0].saleStartsAt, '2026-10-01T00:00:00Z');
});
