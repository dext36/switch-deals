import path from 'node:path';

const number = (value, fallback) => (value !== undefined && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : fallback);

export const config = {
  // Kraj eShopu, z którego brane są ceny i w którym promocja musi obowiązywać.
  eshopCountry: (process.env.ESHOP_COUNTRY || 'PL').toUpperCase(),
  minCriticScore: number(process.env.MIN_CRITIC_SCORE, 83),
  minCriticReviews: number(process.env.MIN_CRITIC_REVIEWS, 3),
  // Najczęściej, jak często backend sprawdza promocje – żeby nie odpytywać API przy każdym wejściu na stronę.
  checkIntervalMs: number(process.env.CHECK_INTERVAL_MINUTES, 30) * 60 * 1000,
  twitchClientId: process.env.TWITCH_CLIENT_ID || '',
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || '',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  // Gdy ustawione (np. Neon), dane trzymane są w Postgresie; inaczej w pliku JSON.
  databaseUrl: process.env.DATABASE_URL || '',
  dataFile: path.resolve(process.env.DATA_DIR || 'data', 'games.json'),
  userAgent: 'switch-deals/0.1 (+https://github.com/dext36/switch-deals)',
};
