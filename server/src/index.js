import { createApp } from './app.js';
import { config } from './config.js';
import { createGameService } from './games.js';
import { createFileStore } from './store.js';
import { createPgStore } from './pgStore.js';
import { fetchHottestHtml, parseHottest } from './sources/dekudeals.js';
import { findGameplayVideo } from './sources/youtube.js';

if (!config.youtubeApiKey) {
  console.warn('Brak YOUTUBE_API_KEY – filmy nie będą wyszukiwane, strona pokaże linki do wyszukiwarki YouTube.');
}

const gameService = createGameService({
  store: config.databaseUrl ? createPgStore(config.databaseUrl) : createFileStore(config.dataFile),
  crawl: async () =>
    parseHottest(await fetchHottestHtml(config.sourceUrl, { userAgent: config.userAgent }), config.sourceUrl),
  findVideo: config.youtubeApiKey
    ? (title) => findGameplayVideo(title, { apiKey: config.youtubeApiKey })
    : null,
  checkIntervalMs: config.checkIntervalMs,
});

const PORT = process.env.PORT || 3001;

createApp({ gameService }).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
