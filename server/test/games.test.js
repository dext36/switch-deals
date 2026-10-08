import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameService } from '../src/games.js';

const memoryStore = (initial) => {
  let data = initial ?? { checkedAt: null, updatedAt: null, games: [], videos: {} };
  return { load: async () => structuredClone(data), save: async (d) => { data = structuredClone(d); }, get: () => data };
};

const game = (slug) => ({ slug, title: slug.toUpperCase(), url: `https://x/items/${slug}` });

test('crawls on first request and looks up videos once per game', async () => {
  let clock = 0;
  let list = [game('a'), game('b')];
  const searched = [];
  const store = memoryStore();
  const service = createGameService({
    store,
    fetchDeals: async () => list,
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
    fetchDeals: async () => [game('a')],
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
    fetchDeals: async () => { throw new Error('HTTP 503'); },
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
    fetchDeals: async () => [game('a'), game('b')],
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
    games: [{ url: 'https://x/items/a', title: 'A', slug: 'a' }],
    videos: {},
  };
  const service = createGameService({
    store: memoryStore(stored),
    fetchDeals: async () => [game('a')],
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
    fetchDeals: async () => [
      { ...game('a'), igdbGameplayVideoId: 'gp-a', igdbTrailerVideoId: 'tr-a' },
      { ...game('b'), igdbGameplayVideoId: null, igdbTrailerVideoId: 'tr-b' },
      { ...game('c'), igdbGameplayVideoId: null, igdbTrailerVideoId: 'tr-c' },
    ],
    findVideo: async (title) => (searched.push(title), title === 'B' ? { id: 'yt-b' } : null),
    checkIntervalMs: 1000,
  });
  const { games } = await service.getGames();
  assert.deepEqual(searched, ['B', 'C']);
  assert.deepEqual(games.map((g) => g.video?.id), ['gp-a', 'yt-b', 'tr-c']);
  assert.equal(games[0].igdbGameplayVideoId, undefined);
});
