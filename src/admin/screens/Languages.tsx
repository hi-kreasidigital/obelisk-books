import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Loading, useToast } from '../ui/kit';

type Row = Record<string, any>;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 100);

export function Languages() {
  const { can, reloadLanguages, languages } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = () => supabase.from('language_completeness').select('*').order('sort').then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  if (!rows) return <Loading />;

  const toggle = async (code: string, enabled: boolean) => {
    if (code === 'en') return;
    if (enabled && !confirm('Switch this language on? Pages only appear in it once their translation is complete.')) return;
    const { error } = await supabase.from('languages').update({ enabled }).eq('code', code);
    if (error) return toast(error.message, 'error');
    toast(enabled ? 'Language switched on' : 'Language switched off'); await reloadLanguages(); load();
  };
  const parts: [string, string, string][] = [['Website text', 'text_done', 'text_total'], ['Books', 'books_done', 'books_total'], ['Authors', 'authors_done', 'authors_total'],
    ['Collections', 'collections_done', 'collections_total'], ['Categories', 'categories_done', 'categories_total'], ['Articles', 'articles_done', 'articles_total']];

  return (
    <>
      <PageHeader title="Languages" sub="Switch languages on or off and see how complete each translation is. Only the Owner can switch languages." />
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>Language</th><th>URL</th><th>On</th>{parts.map(([l]) => <th key={l}>{l}</th>)}</tr></thead>
          <tbody>{rows.map((r) => {
            const lang = languages.find((l) => l.code === r.code)!;
            return (
              <tr key={r.code} className={r.enabled ? '' : 'opacity-70'}>
                <td><b>{lang.name_en}</b> <span className="text-muted">· {lang.native_name}</span>{lang.notes && <p className="text-xs text-muted">{lang.notes}</p>}</td>
                <td><code>/{lang.url_prefix}{lang.url_prefix ? '/' : ''}</code></td>
                <td>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={r.enabled} disabled={!can.owner || r.code === 'en'} onChange={(e) => toggle(r.code, e.target.checked)} />
                    <span className="sr-only">{lang.name_en} switched on</span>{r.enabled ? 'On' : 'Off'}
                  </label>
                </td>
                {parts.map(([l, a, b]) => {
                  const p = pct(r[a], r[b]);
                  return (
                    <td key={l}>
                      <div className="w-28 h-2 bg-gray-100 rounded" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${l} ${p}%`}>
                        <div className={`h-2 rounded ${p === 100 ? 'bg-teal' : 'bg-orange'}`} style={{ width: `${p}%` }} />
                      </div>
                      <span className="text-xs text-muted">{r[a]}/{r[b]} · {p}%</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3">Adding Hindi, Japanese, Chinese or Korean later: switch it on, enter the translations, and add its web font (upgrade project).</p>
    </>
  );
}
