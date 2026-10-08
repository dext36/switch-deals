import express from 'express';
import cors from 'cors';

export function createApp({ gameService }) {
  const app = express();

  // CORS_ORIGIN (np. https://dext36.github.io) ogranicza dostęp do API; bez niego – dowolny origin.
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/games', async (req, res) => {
    const result = await gameService.getGames();
    if (result.games.length === 0 && result.error) {
      return res.status(502).json({ error: result.error });
    }
    res.json(result);
  });

  return app;
}
