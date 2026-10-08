import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIgdbClient } from '../src/sources/igdb.js';

const jsonResponse = (body) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

test('authenticates once and pages through top rated Switch games', async () => {
  const calls = [];
  const client = createIgdbClient({
    clientId: 'cid',
    clientSecret: 'secret',
    now: () => 0,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.startsWith('https://id.twitch.tv')) return jsonResponse({ access_token: 'tok', expires_in: 5000000 });
      const offset = Number(options.body.match(/offset (\d+)/)[1]);
      return jsonResponse(offset === 0 ? Array.from({ length: 500 }, (_, i) => ({ id: i })) : [{ id: 500 }]);
    },
  });

  const games = await client.fetchTopRatedSwitchGames({ minScore: 83, minReviews: 3 });
  assert.equal(games.length, 501);

  const [tokenCall, ...gameCalls] = calls;
  assert.match(tokenCall.url, /client_id=cid&client_secret=secret&grant_type=client_credentials/);
  assert.equal(gameCalls.length, 2);
  assert.equal(gameCalls[0].options.headers.Authorization, 'Bearer tok');
  assert.equal(gameCalls[0].options.headers['Client-ID'], 'cid');
  assert.match(gameCalls[0].options.body, /platforms = \(130,508\) & aggregated_rating >= 83 & aggregated_rating_count >= 3/);

  await client.fetchTopRatedSwitchGames({ minScore: 83, minReviews: 3 });
  assert.equal(calls.filter((c) => c.url.startsWith('https://id.twitch.tv')).length, 1);
});
