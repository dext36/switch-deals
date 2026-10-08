import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const formatPrice = (value) =>
  value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

export default function App() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/deals`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setDeals)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <h1>Switch Deals</h1>
      <p className="subtitle">Promocje pobrane z backendu (Express)</p>

      {loading && <p>Ładowanie…</p>}
      {error && <p className="error">Nie udało się pobrać danych: {error}</p>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Gra</th>
              <th>Cena</th>
              <th>Promocja</th>
              <th>Zniżka</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td>{deal.title}</td>
                <td className="old">{formatPrice(deal.price)}</td>
                <td>{formatPrice(deal.salePrice)}</td>
                <td className="discount">-{deal.discount}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
