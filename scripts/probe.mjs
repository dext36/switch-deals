// Tymczasowa diagnostyka źródeł danych – do usunięcia.
const show = async (label, url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'switch-deals/0.1 (+https://github.com/dext36/switch-deals)' } });
    const text = await res.text();
    console.log(`==== ${label} ${res.status} ${res.headers.get('content-type')} len=${text.length}`);
    return text;
  } catch (e) { console.log(`==== ${label} ERROR ${e.message}`); return ''; }
};
const fq = encodeURIComponent('type:GAME AND system_type:nintendoswitch* AND price_has_discount_b:true');
for (const locale of ['pl', 'en']) {
  const t = await show(`EU search ${locale}`, `https://searching.nintendo-europe.com/${locale}/select?q=*&fq=${fq}&rows=2&start=0&wt=json&sort=popularity%20asc`);
  try {
    const j = JSON.parse(t);
    console.log('numFound', j.response.numFound);
    for (const d of j.response.docs) console.log(JSON.stringify(d).slice(0, 4000));
    if (locale === 'pl') globalThis.ids = j.response.docs.flatMap((d) => d.nsuid_txt ?? []);
  } catch { console.log(t.slice(0, 1500)); }
}
const ids = (globalThis.ids ?? []).join(',');
console.log('IDS', ids);
console.log((await show('price PL', `https://api.ec.nintendo.com/v1/price?country=PL&lang=pl&ids=${ids}`)).slice(0, 3000));
