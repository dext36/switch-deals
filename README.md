# Switch Deals

Testowy projekt full-stack w JavaScript:

- **server/** – backend w [Express](https://expressjs.com/) (port `3001`)
- **client/** – frontend w [React](https://react.dev/) + [Vite](https://vite.dev/) (port `5173`)

Backend crawluje listę [najgorętszych gier na Switcha z oceną krytyków 83+ z Deku Deals](https://www.dekudeals.com/hottest?filter%5Bcritic_score%5D=83&filter%5Bplatform%5D=switch), zapisuje ją i do każdej gry wyszukuje gameplay na YouTube. Frontend pokazuje listę gier z filmami.

### Jak działa odświeżanie

- Przy każdym zapytaniu o listę backend sprawdza, czy zapisana wersja jest aktualna. Deku Deals odpytuje najwyżej raz na `CHECK_INTERVAL_MINUTES` (domyślnie 10 min), żeby nie obciążać ich strony.
- Jeśli lista się zmieniła, zapisuje nową wersję (`updatedAt`); w każdym przypadku aktualizuje czas sprawdzenia (`checkedAt`).
- Film z YouTube jest wyszukiwany tylko raz dla każdej gry i zapisywany – wyszukiwanie kosztuje 100 z 10 000 dziennych jednostek YouTube Data API.
- Gdy Deku Deals jest niedostępne, API zwraca ostatnią zapisaną listę z polem `error`.
- Dane trzymane są w Postgresie, gdy ustawione jest `DATABASE_URL` (produkcyjnie [Neon](https://neon.tech)); w przeciwnym razie w pliku `DATA_DIR/games.json` (domyślnie `data/`), co wystarcza lokalnie.

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
| `npm test`      | testy backendu (`node:test`); test bazy uruchamia się z `TEST_DATABASE_URL` |
| `npm run build` | build produkcyjny frontendu do `client/dist`    |
| `npm start`     | uruchomienie samego backendu                    |

## API

| Endpoint          | Opis                         |
| ----------------- | ---------------------------- |
| `GET /api/health` | status serwera               |
| `GET /api/games`  | lista gier z filmami         |

## Konfiguracja

- `PORT` – port backendu (domyślnie `3001`)
- `CORS_ORIGIN` – origin frontendu, który może wołać API (domyślnie dowolny)
- `YOUTUBE_API_KEY` – klucz [YouTube Data API v3](https://developers.google.com/youtube/v3/getting-started); bez niego zamiast filmów są linki do wyszukiwarki YouTube
- `CHECK_INTERVAL_MINUTES` – minimalny odstęp między sprawdzeniami Deku Deals (domyślnie `10`)
- `DATABASE_URL` – adres bazy Postgres; tabele tworzą się same przy starcie
- `DATA_DIR` – katalog na zapisane dane, gdy nie ma `DATABASE_URL` (domyślnie `data`)
- `SOURCE_URL` – adres listy do crawlowania (domyślnie lista Deku Deals powyżej)
- `VITE_API_URL` – adres backendu dla frontendu, gdy jest hostowany osobno (domyślnie ten sam origin)

## Deploy na GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` buduje frontend i publikuje go na GitHub Pages przy każdym pushu do `main` (można go też uruchomić ręcznie).

Jednorazowa konfiguracja w repozytorium:

1. **Settings → Pages → Build and deployment → Source:** wybierz **GitHub Actions**.
2. GitHub Pages hostuje tylko pliki statyczne, więc backend trzeba wdrożyć osobno (np. Render, Railway, Fly.io). Jego adres ustaw w **Settings → Secrets and variables → Actions → Variables** jako `VITE_API_URL` (np. `https://switch-deals-api.onrender.com`), a potem uruchom deploy ponownie.

Bez `VITE_API_URL` strona się wyświetli, ale pokaże błąd pobierania danych.

## Deploy backendu na Render

Plik `render.yaml` to [Render Blueprint](https://render.com/docs/blueprint-spec) opisujący backend jako Web Service (plan free, region Frankfurt, auto-deploy z `main`).

1. Zaloguj się na https://render.com i połącz konto GitHub.
2. **New → Blueprint**, wybierz repozytorium `switch-deals` i zatwierdź.
3. Render zapyta o `CORS_ORIGIN` – wpisz `https://dext36.github.io` (albo zostaw puste, żeby nie ograniczać).
4. Po wdrożeniu skopiuj adres serwisu (np. `https://switch-deals-api.onrender.com`) i sprawdź `…/api/health`.
5. Ustaw ten adres jako zmienną `VITE_API_URL` w GitHubie (patrz wyżej) i uruchom ponownie deploy frontendu.

Uwaga: na darmowym planie serwis usypia po ~15 min bezczynności, więc pierwsze zapytanie po przerwie może trwać kilkadziesiąt sekund. Dysk na darmowym planie nie jest trwały, dlatego dane trzymamy w zewnętrznej bazie.

### Baza danych (Neon)

1. Załóż darmowe konto na https://neon.tech i utwórz projekt (region najlepiej **AWS Europe Central (Frankfurt)**, blisko serwisu na Render).
2. Skopiuj **connection string** (zaczyna się od `postgresql://…` i kończy `?sslmode=require`).
3. W Render → serwis → **Environment** dodaj zmienną `DATABASE_URL` z tym adresem. Tabele utworzą się przy pierwszym starcie.
