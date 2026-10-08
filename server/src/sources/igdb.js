import { fetchJson } from '../http.js';

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const GAMES_URL = 'https://api.igdb.com/v4/games';
// 130 – Nintendo Switch, 508 – Nintendo Switch 2.
const SWITCH_PLATFORMS = '(130,508)';
const PAGE_SIZE = 500;

// IGDB wymaga tokenu aplikacji Twitch (client credentials); token jest ważny ok. 60 dni.
export function createIgdbClient({ clientId, clientSecret, fetchImpl, now = () => Date.now() }) {
  let token = null;

  async function getToken() {
    if (token && token.expiresAt > now() + 60_000) return token.value;
    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' });
    const data = await fetchJson(`${TOKEN_URL}?${params}`, { fetchImpl, method: 'POST' });
    token = { value: data.access_token, expiresAt: now() + data.expires_in * 1000 };
    return token.value;
  }

  async function query(body) {
    return fetchJson(GAMES_URL, {
      fetchImpl,
      method: 'POST',
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'text/plain' },
      body,
    });
  }

  return {
    // Wszystkie gry na Switcha z oceną krytyków (aggregated_rating) co najmniej minScore.
    async fetchTopRatedSwitchGames({ minScore, minReviews }) {
      const games = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await query(
          'fields name, alternative_names.name, aggregated_rating, aggregated_rating_count, rating, rating_count, url, videos.video_id, videos.name;' +
            ` where platforms = ${SWITCH_PLATFORMS} & aggregated_rating >= ${minScore} & aggregated_rating_count >= ${minReviews};` +
            ` sort id asc; limit ${PAGE_SIZE}; offset ${offset};`,
        );
        games.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
      return games;
    },
  };
}
