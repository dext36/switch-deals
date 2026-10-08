import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createPgStore } from '../src/pgStore.js';

const url = process.env.TEST_DATABASE_URL;

test('Postgres store round-trips data', { skip: !url && 'TEST_DATABASE_URL not set' }, async () => {
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query('DROP TABLE IF EXISTS game_list, game_videos');
  await admin.end();

  const store = createPgStore(url);
  after(() => store.close());

  assert.deepEqual(await store.load(), { checkedAt: null, updatedAt: null, games: [], videos: {} });

  const first = {
    checkedAt: '2026-10-08T10:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
    games: [{ slug: 'a', title: 'A' }, { slug: 'b', title: 'B' }],
    videos: { a: { id: 'vid-a' }, b: null },
  };
  await store.save(first);
  assert.deepEqual(await store.load(), first);

  // Kolejny zapis podmienia listę, a filmy zostają (także dla gier, których już nie ma na liście).
  const second = { ...first, checkedAt: '2026-10-08T11:00:00.000Z', games: [{ slug: 'c', title: 'C' }],
    videos: { ...first.videos, c: { id: 'vid-c' } } };
  await store.save(second);
  assert.deepEqual(await store.load(), second);
});
