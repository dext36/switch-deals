import { useEffect, useMemo, useState } from 'react';
import GameCard from './GameCard.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Średnia ważona liczbą ocen (jak w rankingu IMDb): gra z kilkoma ocenami jest ciągnięta do typowej oceny w IGDB,
// więc wysoko są gry dobrze oceniane przez wielu graczy. Siła ciągnięcia to mediana liczby ocen na liście.
// Nie używamy średniej z listy – są na niej same gry 83+, więc gra z kilkoma ocenami wciąż byłaby wysoko.
const TYPICAL_COMMUNITY_SCORE = 70;

function weightedCommunityScores(games) {
  const rated = games.filter((g) => g.communityScore != null && g.communityRatings > 0);
  const scores = new Map();
  if (rated.length === 0) return scores;
  const counts = rated.map((g) => g.communityRatings).sort((a, b) => a - b);
  const prior = counts[Math.floor(counts.length / 2)];
  for (const g of rated) {
    scores.set(g.slug, (g.communityScore * g.communityRatings + TYPICAL_COMMUNITY_SCORE * prior) / (g.communityRatings + prior));
  }
  return scores;
}

const SORTS = {
  score: { label: 'Ocena krytyków', compare: (a, b) => b.criticScore - a.criticScore },
  community: {
    label: 'Ocena graczy',
    // Gry bez ocen graczy trafiają na koniec.
    compare: (a, b, weighted) => (weighted.get(b.slug) ?? -Infinity) - (weighted.get(a.slug) ?? -Infinity),
  },
  // Gry zapisane przed dodaniem rankingu nie mają popularityRank – trafiają na koniec.
  popularity: { label: 'Popularność', compare: (a, b) => (a.popularityRank ?? Infinity) - (b.popularityRank ?? Infinity) },
};

// Motyw startowy ustawia skrypt w index.html; przełącznik zapamiętuje wybór w localStorage.
function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // np. tryb prywatny – motyw działa, tylko nie zostanie zapamiętany
    }
  };
  return [theme, toggle];
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('score');
  const [theme, toggleTheme] = useTheme();
  const weighted = useMemo(() => weightedCommunityScores(data?.games ?? []), [data]);

  useEffect(() => {
    fetch(`${API_URL}/api/games`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        return body;
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <header>
        <div className="header-row">
          <h1>Switch Deals</h1>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Przełącz motyw">
            {theme === 'dark' ? '☀️ Jasny' : '🌙 Ciemny'}
          </button>
        </div>
        <p className="subtitle">
          Gry na Switcha w promocji w polskim eShopie z oceną krytyków 83+ (według{' '}
          <a href="https://www.igdb.com" target="_blank" rel="noreferrer">
            IGDB
          </a>
          ), z gameplayem z YouTube.
        </p>
        {data && (
          <p className="meta">
            Sprawdzono: {formatDate(data.checkedAt)} · Lista zmieniła się: {formatDate(data.updatedAt)}
          </p>
        )}
      </header>

      {loading && <p>Ładowanie… (pierwsze pobranie listy może potrwać do minuty)</p>}
      {error && <p className="error">Nie udało się pobrać danych: {error}</p>}
      {data?.error && (
        <p className="warning">Nie udało się odświeżyć listy ({data.error}) – pokazuję ostatnią zapisaną wersję.</p>
      )}

      {data && (
        <div className="sort" role="group" aria-label="Sortowanie">
          Sortuj:
          {Object.entries(SORTS).map(([key, { label }]) => (
            <button key={key} aria-pressed={sort === key} onClick={() => setSort(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {data && (
        <ul className="grid">
          {data.games.toSorted((a, b) => SORTS[sort].compare(a, b, weighted) || a.title.localeCompare(b.title)).map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </ul>
      )}
    </main>
  );
}
