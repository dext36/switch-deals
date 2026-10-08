// Tymczasowy skrypt diagnostyczny: pobiera listę z Deku Deals, wypisuje fragment HTML i wynik parsera.
import * as cheerio from 'cheerio';
import { config } from '../server/src/config.js';
import { parseHottest } from '../server/src/sources/dekudeals.js';

const res = await fetch(config.sourceUrl, { headers: { 'User-Agent': config.userAgent, Accept: 'text/html' } });
const html = await res.text();
console.log('STATUS', res.status, 'LENGTH', html.length, 'TYPE', res.headers.get('content-type'));

const $ = cheerio.load(html);
const links = $('a[href*="/items/"]');
console.log('ITEM LINKS', links.length);
console.log('PAGINATION', $('a[href*="page="]').map((_, a) => $(a).attr('href')).get().slice(0, 10));

let card = links.first();
for (let i = 0; i < 4 && card.parent().length; i++) card = card.parent();
console.log('---- FIRST CARD HTML ----');
console.log($.html(card).replace(/\n\s*\n/g, '\n').slice(0, 6000));
console.log('---- PARSED ----');
const games = parseHottest(html, config.sourceUrl);
console.log('COUNT', games.length);
console.log(JSON.stringify(games.slice(0, 5), null, 2));
if (games.length === 0) console.log(html.slice(0, 3000));
