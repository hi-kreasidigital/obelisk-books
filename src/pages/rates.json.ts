// /rates.json — ECB euro reference rates, fetched at build time (the scheduled rebuild refreshes them daily).
// Used only to show "Approx. ¥…" next to EUR prices; charges are always EUR or USD (roadmap §5.1).
import type { APIRoute } from 'astro';
import fallback from '../data/rates-fallback.json';
export const GET: APIRoute = async () => {
  let data: any = fallback;
  if (process.env.OBELISK_DATA !== 'fixture') {
    try {
      const res = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      const rates = Object.fromEntries([...text.matchAll(/currency='([A-Z]{3})'\s+rate='([\d.]+)'/g)].map((m) => [m[1], Number(m[2])]));
      const date = text.match(/time='(\d{4}-\d{2}-\d{2})'/)?.[1];
      if (Object.keys(rates).length > 10) data = { date, base: 'EUR', source: 'European Central Bank euro foreign exchange reference rates', rates };
      else console.warn('[rates] ECB response not usable — using fallback rates');
    } catch (e) { console.warn('[rates] ECB fetch failed — using fallback rates', e); }
  }
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
};
