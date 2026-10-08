// Tymczasowa diagnostyka źródeł danych – do usunięcia.
const get = async (label, url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'switch-deals/0.1 (+https://github.com/dext36/switch-deals)' } });
  const text = await res.text();
  console.log(`==== ${label} ${res.status} len=${text.length}`);
  return text;
};
console.log((await get('price PL', 'https://api.ec.nintendo.com/v1/price?country=PL&lang=pl&ids=70010000003621,70010000062277,70070000019472')).slice(0, 3000));
const fq = encodeURIComponent('type:GAME AND playable_on_txt:HAC AND price_has_discount_b:true');
const fl = 'title,nsuid_txt,url,image_url_sq_s,image_url_h2x1_s,price_discount_percentage_f,price_regular_f,price_discounted_f,popularity,downloads_rank_i,playable_on_txt';
const t0 = Date.now();
const t = await get('EU search rows=1000', `https://searching.nintendo-europe.com/en/select?q=*&fq=${fq}&fl=${fl}&rows=1000&start=0&wt=json&sort=downloads_rank_i%20asc`);
const j = JSON.parse(t);
console.log('numFound', j.response.numFound, 'docs', j.response.docs.length, 'ms', Date.now() - t0);
console.log(JSON.stringify(j.response.docs.slice(0, 3)));
const ids = j.response.docs.slice(0, 50).flatMap((d) => (d.nsuid_txt ?? []).filter((n) => n.startsWith('7001')).slice(0, 1));
const p = JSON.parse(await get('price PL 50', `https://api.ec.nintendo.com/v1/price?country=PL&lang=pl&ids=${ids.join(',')}`));
const st = {};
for (const x of p.prices) st[x.sales_status + (x.discount_price ? ' discounted' : '')] = (st[x.sales_status + (x.discount_price ? ' discounted' : '')] ?? 0) + 1;
console.log('PL statuses', st);
console.log(JSON.stringify(p.prices.slice(0, 2)));
