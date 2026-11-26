import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader } from '../ui/kit';

export function Overview() {
  const { staff } = useAdmin();
  const [n, setN] = useState<Record<string, number>>({});
  const [langs, setLangs] = useState<any[]>([]);
  useEffect(() => {
    const tables = ['books', 'formats', 'collections', 'authors', 'categories', 'articles', 'shipping_options'] as const;
    Promise.all(tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true }).then((r) => [t, r.count ?? 0] as const)))
      .then((r) => setN(Object.fromEntries(r)));
    supabase.from('language_completeness').select('code, text_done, text_total').eq('enabled', true).neq('code', 'en').order('sort').then(({ data }) => setLangs(data ?? []));
  }, []);
  const tiles: [string, string, string][] = [['Books', 'books', '#/books'], ['Formats', 'formats', '#/books'], ['Collections', 'collections', '#/collections'],
    ['Authors', 'authors', '#/authors'], ['Categories', 'categories', '#/categories'], ['Articles', 'articles', '#/articles'], ['Shipping options', 'shipping_options', '#/shipping']];
  return (
    <>
      <PageHeader title={`Welcome, ${staff!.display_name}`} sub="Sales and order figures appear here from Phase 5." />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7 mb-6">
        {tiles.map(([l, k, href]) => <a key={k} href={href} className="card p-4 hover:border-teal"><div className="text-2xl font-bold">{n[k] ?? '…'}</div><div className="text-sm text-muted">{l}</div></a>)}
      </div>
      <h2 className="font-bold mb-2">Website text translated</h2>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {langs.map((l) => { const p = l.text_total ? Math.round((l.text_done / l.text_total) * 100) : 0; return (
          <a key={l.code} href="#/text" className="card p-4 hover:border-teal"><div className="text-xl font-bold">{p}%</div><div className="text-sm text-muted">{l.code} · {l.text_done}/{l.text_total}</div></a>); })}
      </div>
    </>
  );
}
