import pg from 'pg';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS game_list (
    id integer PRIMARY KEY CHECK (id = 1),
    checked_at timestamptz,
    updated_at timestamptz,
    games jsonb NOT NULL
  );
  ALTER TABLE game_list ADD COLUMN IF NOT EXISTS built_at timestamptz;
  ALTER TABLE game_list ADD COLUMN IF NOT EXISTS eshop_ids jsonb;
  CREATE TABLE IF NOT EXISTS game_videos (
    slug text PRIMARY KEY,
    video jsonb,
    found_at timestamptz NOT NULL DEFAULT now()
  );
`;

const iso = (date) => (date ? date.toISOString() : null);

// Adres bazy do logów – bez użytkownika i hasła.
function describe(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return 'DATABASE_URL';
  }
}

// Ten sam interfejs co createFileStore: load() / save(data).
// Lista gier to jeden wiersz, filmy są osobno, żeby przetrwały zniknięcie gry z listy.
export function createPgStore(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 3 });
  const name = describe(connectionString);
  // Np. Neon zamyka bezczynne połączenia – bez tej obsługi błąd wywróciłby cały proces.
  pool.on('error', (err) => console.error(`Postgres: zerwane połączenie z bazą ${name}: ${err.message}`));

  // Łączy się i tworzy tabele przy starcie; po nieudanej próbie ponawia przy kolejnym użyciu bazy.
  let connecting = null;
  const connect = () =>
    (connecting ??= pool.query(SCHEMA).then(
      () => console.log(`Postgres: połączono z bazą ${name}`),
      (err) => {
        console.error(`Postgres: nie udało się połączyć z bazą ${name}: ${err.message}`);
        connecting = null;
        throw err;
      },
    ));
  connect().catch(() => {});

  return {
    async load() {
      await connect();
      const [list, videos] = await Promise.all([
        pool.query('SELECT checked_at, updated_at, built_at, eshop_ids, games FROM game_list WHERE id = 1'),
        pool.query('SELECT slug, video FROM game_videos'),
      ]);
      const row = list.rows[0];
      return {
        checkedAt: iso(row?.checked_at),
        updatedAt: iso(row?.updated_at),
        builtAt: iso(row?.built_at),
        eshopIds: row?.eshop_ids ?? null,
        games: row?.games ?? [],
        videos: Object.fromEntries(videos.rows.map((v) => [v.slug, v.video])),
      };
    },

    async save(data) {
      await connect();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO game_list (id, checked_at, updated_at, built_at, eshop_ids, games) VALUES (1, $1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
           SET checked_at = EXCLUDED.checked_at, updated_at = EXCLUDED.updated_at, built_at = EXCLUDED.built_at,
               eshop_ids = EXCLUDED.eshop_ids, games = EXCLUDED.games`,
          [data.checkedAt, data.updatedAt, data.builtAt ?? null, JSON.stringify(data.eshopIds ?? null), JSON.stringify(data.games)],
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
