# Switch Deals

Testowy projekt full-stack w JavaScript:

- **server/** – backend w [Express](https://expressjs.com/) (port `3001`)
- **client/** – frontend w [React](https://react.dev/) + [Vite](https://vite.dev/) (port `5173`)

Frontend pobiera listę promocji z endpointu `GET /api/deals` i wyświetla ją w tabeli.

## Wymagania

- Node.js 22+

## Uruchomienie

```bash
npm install
npm run dev
```

Następnie otwórz http://localhost:5173. W trybie dev Vite przekierowuje zapytania `/api/*` do backendu na `localhost:3001`.

## Skrypty

| Komenda         | Opis                                            |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | backend + frontend jednocześnie (hot reload)    |
| `npm test`      | testy API (`node:test`)                         |
| `npm run build` | build produkcyjny frontendu do `client/dist`    |
| `npm start`     | uruchomienie samego backendu                    |

## API

| Endpoint          | Opis                         |
| ----------------- | ---------------------------- |
| `GET /api/health` | status serwera               |
| `GET /api/deals`  | lista promocji (dane testowe)|

## Konfiguracja

- `PORT` – port backendu (domyślnie `3001`)
- `VITE_API_URL` – adres backendu dla frontendu, gdy jest hostowany osobno (domyślnie ten sam origin)
