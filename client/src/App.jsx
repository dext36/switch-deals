import { useEffect, useState } from 'react';
import GameCard from './GameCard.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const SORTS = {
  score: { label: 'Ocena', compare: (a, b) => b.criticScore - a.criticScore },
  // Gry zapisane przed dodaniem rankingu nie mają popularityRank – trafiają na koniec.
  popularity: { label: 'Popularność', compare: (a, b) => (a.popularityRank ?? Infinity) - (b.popularityRank ?? Infinity) },
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('score');

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
        <h1>Switch Deals</h1>
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
          {data.games.toSorted((a, b) => SORTS[sort].compare(a, b) || a.title.localeCompare(b.title)).map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </ul>
      )}
    </main>
  );
}
