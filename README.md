# Switch Deals

Testowy projekt full-stack w JavaScript:

- **server/** – backend w [Express](https://expressjs.com/) (port `3001`)
- **client/** – frontend w [React](https://react.dev/) + [Vite](https://vite.dev/) (port `5173`)

Backend zbiera gry na Switcha, które są **aktualnie w promocji w eShopie** i mają **ocenę krytyków co najmniej 83**, i do każdej dobiera gameplay z YouTube. Frontend pokazuje listę gier z karuzelą: film jako pierwszy slajd, dalej screeny z gry.

### Skąd są dane

1. **Lista promocji** – wyszukiwarka Nintendo of Europe (`searching.nintendo-europe.com`, z niej korzysta nintendo.com): wszystkie gry na Switcha z obniżoną ceną.
2. **Oceny krytyków** – [IGDB](https://api-docs.igdb.com/) (`aggregated_rating`, średnia z recenzji krytyków). To nie jest Metacritic – Metacritic nie ma publicznego API – ale ocena jest zbliżona. IGDB ocenia grę na wszystkich platformach razem, a nie osobno wersję na Switcha.
3. **Ceny** – API cen Nintendo (`api.ec.nintendo.com`) dla kraju `ESHOP_COUNTRY` (domyślnie PL). Na liście zostają tylko gry przecenione w tym kraju. Z tego API pochodzą też daty początku i końca promocji. Pasek na karcie pokazuje, ile czasu promocji już minęło, w kolorach od zielonego (świeża) przez żółty i czerwony do brązowego (tuż przed końcem). Gdy API nie poda daty początku, liczy się moment, w którym gra pierwszy raz pojawiła się na liście.
4. **Popularność** – wyszukiwarka eShopu zwraca promocje posortowane po popularności, więc pozycja gry na tej liście to jej miejsce w rankingu (`popularityRank`).
5. **Ocena graczy** – średnia z ocen użytkowników IGDB (`rating`, `rating_count`). Przy sortowaniu po niej liczy się też liczba ocen: ocena gry jest ważona jak w rankingu IMDb (ciągnięta do typowej oceny 70 z siłą równą medianie liczby ocen na liście), więc gra z kilkoma ocenami nie wyprzedzi gry ocenionej podobnie przez setki graczy.
6. **Filmy** – najpierw film „gameplay” z IGDB, potem wyszukiwanie w YouTube Data API, a na końcu zwiastun z IGDB. Gdy nic nie ma, strona pokazuje link do wyszukiwarki YouTube.
7. **Screeny** – do 8 screenów z IGDB (`screenshots`). Zapisywane są tylko ich identyfikatory (razem z listą gier), a obrazki ładują się bezpośrednio z CDN IGDB (`images.igdb.com`, rozmiar `t_screenshot_big`). IGDB nie rozróżnia platform, więc część screenów może pochodzić z innej wersji niż na Switcha.

Na stronie można przełączać sortowanie: ocena krytyków / ocena graczy / popularność.

Tytuły z eShopu i IGDB są dopasowywane po znormalizowanej nazwie (bez ™/®, interpunkcji, dopisków „Nintendo Switch Edition”), również po alternatywnych nazwach z IGDB. Gry o mocno różniących się tytułach mogą zostać pominięte.

### Jak działa odświeżanie

- Przy każdym zapytaniu o listę backend sprawdza, czy zapisana wersja jest aktualna; eShop odpytuje najwyżej raz na `CHECK_INTERVAL_MINUTES` (domyślnie 30 min).
- Zapisywana jest lista identyfikatorów (nsuid) gier w promocji z eShopu. Reszta zapytań (IGDB i ceny w danym kraju) idzie tylko wtedy, gdy w eShopie pojawiła się nowa pozycja albo od ostatniego pełnego przeliczenia minęło `FULL_REFRESH_DAYS` (domyślnie 7 dni).
- Gdy pozycje tylko zniknęły z promocji, gry są usuwane z zapisanej listy bez dodatkowych zapytań; aktualizowany jest też ranking popularności.
- Jeśli lista się zmieniła, zapisuje nową wersję (`updatedAt`); w każdym przypadku aktualizuje czas sprawdzenia (`checkedAt`).
- Film z YouTube jest wyszukiwany tylko raz dla każdej gry i zapisywany – wyszukiwanie kosztuje 100 z 10 000 dziennych jednostek YouTube Data API.
- Gdy źródła są niedostępne, API zwraca ostatnią zapisaną listę z polem `error`.
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
- `YOUTUBE_API_KEY` – klucz [YouTube Data API v3](https://developers.google.com/youtube/v3/getting-started); bez niego filmy są tylko z IGDB
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` – dane aplikacji Twitch, wymagane przez IGDB (zob. niżej)
- `ESHOP_COUNTRY` – kraj eShopu dla cen (domyślnie `PL`)
- `MIN_CRITIC_SCORE` – minimalna ocena krytyków (domyślnie `83`)
- `MIN_CRITIC_REVIEWS` – minimalna liczba recenzji, żeby ocena się liczyła (domyślnie `3`)
- `CHECK_INTERVAL_MINUTES` – minimalny odstęp między sprawdzeniami eShopu (domyślnie `30`)
- `FULL_REFRESH_DAYS` – co ile dni lista jest liczona od nowa (IGDB + ceny), nawet bez nowych promocji (domyślnie `7`)
- `DATABASE_URL` – adres bazy Postgres; tabele tworzą się same przy starcie
- `DATA_DIR` – katalog na zapisane dane, gdy nie ma `DATABASE_URL` (domyślnie `data`)
- `VITE_API_URL` – adres backendu dla frontendu, gdy jest hostowany osobno (domyślnie ten sam origin)

### Klucze IGDB (Twitch)

1. Zaloguj się na https://dev.twitch.tv/console (konto Twitch z włączonym 2FA).
2. **Register Your Application**: dowolna nazwa, OAuth Redirect URL `http://localhost`, kategoria „Application Integration”, typ klienta **Confidential**.
3. Skopiuj **Client ID** i wygeneruj **Client Secret**.
4. Ustaw je jako `TWITCH_CLIENT_ID` i `TWITCH_CLIENT_SECRET` (lokalnie w środowisku, na Render w **Environment**).

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
