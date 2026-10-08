// Tymczasowa diagnostyka: uruchamia cały proces na prawdziwych danych i wypisuje statystyki.
import { config } from '../server/src/config.js';
import { findRatedDeals, normalizeTitle } from '../server/src/deals.js';
import { fetchDiscountedGames, fetchSalePrices } from '../server/src/sources/eshop.js';
import { createIgdbClient } from '../server/src/sources/igdb.js';

const { userAgent, eshopCountry: country } = config;
const onSale = await fetchDiscountedGames({ userAgent });
console.log('eShop EU on sale:', onSale.length);

if (!config.twitchClientId) {
  const prices = await fetchSalePrices(onSale.slice(0, 200).map((g) => g.nsuid), { country, userAgent });
  console.log(`${country} discounted among first 200:`, prices.size);
  console.log('No TWITCH_CLIENT_ID – skipping IGDB.');
  process.exit(0);
}

const igdb = createIgdbClient({ clientId: config.twitchClientId, clientSecret: config.twitchClientSecret });
const topRated = await igdb.fetchTopRatedSwitchGames({ minScore: config.minCriticScore, minReviews: config.minCriticReviews });
console.log('IGDB top rated Switch games:', topRated.length);
console.log('with gameplay video:', topRated.filter((g) => g.videos?.some((v) => /gameplay/i.test(v.name ?? ''))).length,
  'with any video:', topRated.filter((g) => g.videos?.length).length);

const deals = await findRatedDeals({
  fetchDiscountedGames: async () => onSale,
  fetchTopRated: async () => topRated,
  fetchSalePrices: (ids) => fetchSalePrices(ids, { country, userAgent }),
});
console.log(`Deals (${country}, ${config.minCriticScore}+):`, deals.length);
console.log('with IGDB gameplay:', deals.filter((d) => d.igdbGameplayVideoId).length, 'with IGDB trailer only:', deals.filter((d) => !d.igdbGameplayVideoId && d.igdbTrailerVideoId).length);
for (const d of deals) console.log(`${d.criticScore} (${d.criticReviews}) | ${d.title} | ${d.price} (${d.originalPrice}, -${d.discount}%) | gp:${d.igdbGameplayVideoId ?? '-'} tr:${d.igdbTrailerVideoId ?? '-'}`);

// Gry z IGDB o podobnych tytułach, które nie zostały dopasowane – pomoc przy poprawianiu normalizacji.
const saleKeys = onSale.map((g) => [normalizeTitle(g.title), g.title]);
const matchedTitles = new Set(deals.map((d) => d.title));
let misses = 0;
for (const g of topRated) {
  const key = normalizeTitle(g.name);
  const near = saleKeys.find(([k, t]) => !matchedTitles.has(t) && k !== key && (k.startsWith(key) || key.startsWith(k)) && Math.min(k.length, key.length) > 5);
  if (near && misses++ < 40) console.log('NEAR MISS:', JSON.stringify(g.name), '<->', JSON.stringify(near[1]));
}
