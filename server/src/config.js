import path from 'node:path';

const minutes = (value, fallback) => (Number(value) > 0 ? Number(value) : fallback) * 60 * 1000;

export const config = {
  sourceUrl:
    process.env.SOURCE_URL ||
    'https://www.dekudeals.com/hottest?filter%5Bcritic_score%5D=83&filter%5Bplatform%5D=switch',
  // Najczęściej, jak często backend odpytuje Deku Deals – żeby nie crawlować przy każdym wejściu na stronę.
  checkIntervalMs: minutes(process.env.CHECK_INTERVAL_MINUTES, 10),
  // Gdy ustawione (np. Neon), dane trzymane są w Postgresie; inaczej w pliku JSON.
  databaseUrl: process.env.DATABASE_URL || '',
  dataFile: path.resolve(process.env.DATA_DIR || 'data', 'games.json'),
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  userAgent: 'switch-deals/0.1 (+https://github.com/dext36/switch-deals)',
};
