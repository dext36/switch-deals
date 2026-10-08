import { youtubeSearchUrl } from './sources/youtube.js';

// Porównanie niezależne od kolejności pól – Postgres (jsonb) nie zachowuje kolejności kluczy.
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
      : value;
const sameList = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

const igdbVideo = (id, title) => ({
  id,
  title,
  channel: null,
  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
});

// Kolejność: gameplay z IGDB → film znaleziony w YouTube → zwiastun z IGDB.
function videoFor(game, videos) {
  if (game.igdbGameplayVideoId) return igdbVideo(game.igdbGameplayVideoId, `${game.title} – gameplay`);
  if (videos[game.slug]) return videos[game.slug];
  if (game.igdbTrailerVideoId) return igdbVideo(game.igdbTrailerVideoId, `${game.title} – zwiastun`);
  return null;
}

export function createGameService({ store, fetchDeals, findVideo, checkIntervalMs, now = () => Date.now() }) {
  let refreshing = null;

  async function refresh(data) {
    const games = await fetchDeals();
    if (games.length === 0) throw new Error('Nie znaleziono żadnych gier spełniających kryteria');

    const checkedAt = new Date(now()).toISOString();
    const changed = !sameList(games, data.games);
    const next = {
      ...data,
      checkedAt,
      updatedAt: changed ? checkedAt : data.updatedAt,
      games,
      videos: { ...data.videos },
    };

    if (findVideo) {
      for (const game of games) {
        if (game.igdbGameplayVideoId || game.slug in next.videos) continue;
        try {
          next.videos[game.slug] = await findVideo(game.title);
        } catch (err) {
          console.error(`YouTube: ${game.title}: ${err.message}`);
          break; // najczęściej wyczerpany limit – spróbujemy przy kolejnym sprawdzeniu
        }
      }
    }

    await store.save(next);
    return next;
  }

  return {
    // Przy każdym zapytaniu sprawdza, czy zapisana lista jest aktualna;
    // źródła odpytuje najwyżej raz na checkIntervalMs.
    async getGames() {
      let data = await store.load();
      let error = null;
      const age = data.checkedAt ? now() - Date.parse(data.checkedAt) : Infinity;

      if (age >= checkIntervalMs) {
        refreshing ??= refresh(data).finally(() => {
          refreshing = null;
        });
        try {
          data = await refreshing;
        } catch (err) {
          console.error(`Odświeżanie listy nie powiodło się: ${err.message}`);
          error = err.message;
        }
      }

      return {
        checkedAt: data.checkedAt,
        updatedAt: data.updatedAt,
        error,
        games: data.games.map(({ igdbGameplayVideoId, igdbTrailerVideoId, ...game }) => ({
          ...game,
          video: videoFor({ ...game, igdbGameplayVideoId, igdbTrailerVideoId }, data.videos),
          youtubeSearchUrl: youtubeSearchUrl(game.title),
        })),
      };
    },
  };
}
