import pg from 'pg';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS game_list (
    id integer PRIMARY KEY CHECK (id = 1),
    checked_at timestamptz,
    updated_at timestamptz,
    games jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS game_videos (
    slug text PRIMARY KEY,
    video jsonb,
    found_at timestamptz NOT NULL DEFAULT now()
  );
`;

const iso = (date) => (date ? date.toISOString() : null);

// Ten sam interfejs co createFileStore: load() / save(data).
// Lista gier to jeden wiersz, filmy są osobno, żeby przetrwały zniknięcie gry z listy.
export function createPgStore(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 3 });
  const ready = pool.query(SCHEMA);

  return {
    async load() {
      await ready;
      const [list, videos] = await Promise.all([
        pool.query('SELECT checked_at, updated_at, games FROM game_list WHERE id = 1'),
        pool.query('SELECT slug, video FROM game_videos'),
      ]);
      const row = list.rows[0];
      return {
        checkedAt: iso(row?.checked_at),
        updatedAt: iso(row?.updated_at),
        games: row?.games ?? [],
        videos: Object.fromEntries(videos.rows.map((v) => [v.slug, v.video])),
      };
    },

    async save(data) {
      await ready;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO game_list (id, checked_at, updated_at, games) VALUES (1, $1, $2, $3)
           ON CONFLICT (id) DO UPDATE
           SET checked_at = EXCLUDED.checked_at, updated_at = EXCLUDED.updated_at, games = EXCLUDED.games`,
          [data.checkedAt, data.updatedAt, JSON.stringify(data.games)],
        );
        for (const [slug, video] of Object.entries(data.videos)) {
          await client.query(
            'INSERT INTO game_videos (slug, video) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
            [slug, JSON.stringify(video)],
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    close: () => pool.end(),
  };
}
