import { chunk, fetchJson } from '../http.js';

// Wyszukiwarka Nintendo of Europe (z niej korzysta strona nintendo.com) – lista gier na Switcha w promocji.
// Wyniki są posortowane po popularności w eShopie, więc kolejność na liście to ranking popularności.
// Ceny w niej są brytyjskie, dlatego właściwe ceny i to, czy promocja obowiązuje, sprawdzamy w API cen dla danego kraju.
const SEARCH_URL = 'https://searching.nintendo-europe.com/en/select';
const PRICE_URL = 'https://api.ec.nintendo.com/v1/price';
const PAGE_SIZE = 1000;
const FIELDS = 'title,nsuid_txt,url,image_url_h2x1_s,image_url_sq_s';

export async function fetchDiscountedGames({ fetchImpl, userAgent } = {}) {
  const games = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const params = new URLSearchParams({
      q: '*',
      fq: 'type:GAME AND playable_on_txt:HAC AND price_has_discount_b:true',
      fl: FIELDS,
      rows: String(PAGE_SIZE),
      start: String(start),
      sort: 'popularity asc',
      wt: 'json',
    });
    const { response } = await fetchJson(`${SEARCH_URL}?${params}`, { fetchImpl, headers: { 'User-Agent': userAgent } });
    for (const doc of response.docs) {
      // 7001… to identyfikator samej gry; inne prefiksy to m.in. pakiety i DLC.
      const nsuid = doc.nsuid_txt?.find((id) => id.startsWith('7001'));
      if (!nsuid || !doc.title) continue;
      games.push({
        nsuid,
        title: doc.title,
        url: doc.url ? `https://www.nintendo.com${doc.url}` : null,
        image: doc.image_url_h2x1_s || doc.image_url_sq_s || null,
        popularityRank: games.length + 1,
      });
    }
    if (start + PAGE_SIZE >= response.numFound || response.docs.length === 0) break;
  }
  return games;
}

// Zwraca Map nsuid → cena dla gier, które w danym kraju są faktycznie przecenione.
export async function fetchSalePrices(nsuids, { country, fetchImpl, userAgent } = {}) {
  const prices = new Map();
  for (const ids of chunk(nsuids, 50)) {
    const params = new URLSearchParams({ country, lang: 'en', ids: ids.join(',') });
    const data = await fetchJson(`${PRICE_URL}?${params}`, { fetchImpl, headers: { 'User-Agent': userAgent } });
    for (const p of data.prices ?? []) {
      if (!p.discount_price || !p.regular_price) continue;
      const regular = Number(p.regular_price.raw_value);
      const sale = Number(p.discount_price.raw_value);
      prices.set(String(p.title_id), {
        price: p.discount_price.amount,
        originalPrice: p.regular_price.amount,
        discount: regular > 0 ? Math.round((1 - sale / regular) * 100) : null,
        saleEndsAt: p.discount_price.end_datetime ?? null,
      });
    }
  }
  return prices;
}
