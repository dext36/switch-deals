import * as cheerio from 'cheerio';

const ITEM_PATH = /^\/items\/([^/?#]+)/;
const PRICE = /(?:[$€£]|zł|PLN|USD|EUR|GBP)\s*\d[\d.,]*|\d[\d.,]*\s*(?:zł|PLN|€|USD|EUR|GBP)/g;

export async function fetchHottestHtml(url, { userAgent, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': userAgent, Accept: 'text/html' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Deku Deals odpowiedziało HTTP ${res.status}`);
  return res.text();
}

const clean = (text) => text.replace(/\s+/g, ' ').trim();

// Parser celowo nie polega na konkretnych klasach CSS: szuka linków do /items/<slug>
// i dla każdego bierze najmniejszy kontener, który zawiera tylko tę jedną grę.
export function parseHottest(html, baseUrl) {
  const $ = cheerio.load(html);
  const games = new Map();

  $('a[href]').each((_, link) => {
    const href = $(link).attr('href');
    const url = new URL(href, baseUrl);
    const match = url.pathname.match(ITEM_PATH);
    if (!match) return;
    const slug = match[1];
    if (games.has(slug)) return;

    let card = $(link);
    for (let parent = card.parent(); parent.length; parent = parent.parent()) {
      const slugs = new Set(
        parent
          .find('a[href]')
          .map((_, a) => $(a).attr('href').match(/\/items\/([^/?#]+)/)?.[1])
          .get()
          .filter(Boolean),
      );
      if (slugs.size > 1) break;
      card = parent;
    }

    const img = card.find('img').first();
    if (!img.length) return; // linki bez okładki (nawigacja, stopka) to nie karty gier
    const title = clean(
      card.find('.name').first().text() || img.attr('alt') || $(link).attr('title') || $(link).text(),
    );
    if (!title) return;

    const text = clean(card.text());
    const prices = text.match(PRICE) ?? [];
    const discount = text.match(/-\s?(\d{1,3})\s?%/);

    games.set(slug, {
      slug,
      title,
      url: `${url.origin}${url.pathname}`,
      image: img.attr('data-src') || img.attr('src') || null,
      price: prices[0] ?? null,
      originalPrice: prices.length > 1 ? prices[1] : null,
      discount: discount ? Number(discount[1]) : null,
    });
  });

  return [...games.values()];
}
