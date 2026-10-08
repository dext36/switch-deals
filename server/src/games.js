import { youtubeSearchUrl } from './sources/youtube.js';

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createGameService({ store, crawl, findVideo, checkIntervalMs, now = () => Date.now() }) {
  let refreshing = null;

  async function refresh(data) {
    const games = await crawl();
    if (games.length === 0) throw new Error('Nie znaleziono żadnych gier na stronie źródłowej');

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
        if (game.slug in next.videos) continue;
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
    // stronę źródłową odpytuje najwyżej raz na checkIntervalMs.
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
        games: data.games.map((game) => ({
          ...game,
          video: data.videos[game.slug] ?? null,
          youtubeSearchUrl: youtubeSearchUrl(game.title),
        })),
      };
    },
  };
}
