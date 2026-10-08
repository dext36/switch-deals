import { createApp } from './app.js';
import { config } from './config.js';
import { findRatedDeals } from './deals.js';
import { createGameService } from './games.js';
import { createFileStore } from './store.js';
import { createPgStore } from './pgStore.js';
import { fetchDiscountedGames, fetchSalePrices } from './sources/eshop.js';
import { createIgdbClient } from './sources/igdb.js';
import { findGameplayVideo } from './sources/youtube.js';

if (!config.twitchClientId || !config.twitchClientSecret) {
  console.error('Brak TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET – bez nich nie da się pobrać ocen z IGDB.');
}
if (!config.youtubeApiKey) {
  console.warn('Brak YOUTUBE_API_KEY – filmy będą tylko z IGDB, resztę zastąpią linki do wyszukiwarki YouTube.');
}

const { userAgent, eshopCountry: country } = config;
const igdb = createIgdbClient({ clientId: config.twitchClientId, clientSecret: config.twitchClientSecret });

const gameService = createGameService({
  store: config.databaseUrl ? createPgStore(config.databaseUrl) : createFileStore(config.dataFile),
  fetchDeals: () =>
    findRatedDeals({
      fetchDiscountedGames: () => fetchDiscountedGames({ userAgent }),
      fetchTopRated: () =>
        igdb.fetchTopRatedSwitchGames({ minScore: config.minCriticScore, minReviews: config.minCriticReviews }),
      fetchSalePrices: (nsuids) => fetchSalePrices(nsuids, { country, userAgent }),
    }),
  findVideo: config.youtubeApiKey
    ? (title) => findGameplayVideo(title, { apiKey: config.youtubeApiKey })
    : null,
  checkIntervalMs: config.checkIntervalMs,
});

const PORT = process.env.PORT || 3001;

createApp({ gameService }).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
