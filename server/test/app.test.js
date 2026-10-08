import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let result = { checkedAt: null, updatedAt: null, error: null, games: [{ slug: 'a' }] };
const server = createApp({ gameService: { getGames: async () => result } }).listen(0);
const base = `http://localhost:${server.address().port}`;
after(() => server.close());

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('GET /api/games returns the game list', async () => {
  const res = await fetch(`${base}/api/games`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).games[0].slug, 'a');
});

test('GET /api/games returns 502 when nothing is stored and crawling failed', async () => {
  result = { checkedAt: null, updatedAt: null, error: 'HTTP 403', games: [] };
  const res = await fetch(`${base}/api/games`);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'HTTP 403');
});
