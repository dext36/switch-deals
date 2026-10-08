import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;
after(() => server.close());

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('GET /api/deals returns deals with discount', async () => {
  const res = await fetch(`${base}/api/deals`);
  const deals = await res.json();
  assert.ok(deals.length > 0);
  assert.equal(typeof deals[0].discount, 'number');
});
