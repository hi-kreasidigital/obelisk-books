import { useEffect, useState } from 'react';
import { supabase, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Section, Field, Loading, useToast } from '../ui/kit';
import { useEnglishNames } from '../ui/TranslationTabs';

const HELP: Record<string, string> = {
  bestsellers: 'Automatic from sales (last 90 days) once orders come in. Pinned books always show first.',
  new_releases: 'Automatic: books published in the last 90 days. Pin books to force them in.',
  upcoming: 'Automatic: formats set to Pre-order.',
  on_sale: 'Automatic: formats with an active sale price.',
};

export function Lists() {
  const { can, enabledLangs } = useAdmin();
  const toast = useToast();
  const [lists, setLists] = useState<(Tables<'lists'> & { list_translations: Tables<'list_translations'>[]; list_items: Tables<'list_items'>[] })[] | null>(null);
  const [formats, setFormats] = useState<{ id: string; type: string; book_id: string | null }[]>([]);
  const titles = useEnglishNames('book_translations', 'book_id', 'title');
  const load = () => supabase.from('lists').select('*, list_translations(*), list_items(*)').order('key').then(({ data }) => setLists((data as any) ?? []));
  useEffect(() => { load(); supabase.from('formats').select('id, type, book_id').not('book_id', 'is', null).then(({ data }) => setFormats(data ?? [])); }, []);
  if (!lists) return <Loading />;
  const label = (fid: string) => { const f = formats.find((x) => x.id === fid); return f ? `${titles[f.book_id!] ?? '?'} — ${f.type}` : fid; };

  const pin = async (listId: string, fid: string, n: number) => {
    if (!fid) return;
    const { error } = await supabase.from('list_items').insert({ list_id: listId, format_id: fid, position: n + 1, pinned: true });
    if (error) toast(error.message, 'error'); else load();
  };
  const unpin = async (listId: string, fid: string) => { await supabase.from('list_items').delete().match({ list_id: listId, format_id: fid }); load(); };
  const saveName = async (listId: string, lang: string, name: string) => {
    const { error } = await supabase.from('list_translations').upsert({ list_id: listId, lang, name }, { onConflict: 'list_id,lang' });
    if (error) toast(error.message, 'error');
  };
  const saveList = async (l: Tables<'lists'>) => {
    const { error } = await supabase.from('lists').update({ mode: l.mode, max_items: l.max_items }).eq('id', l.id);
    toast(error ? error.message : 'List saved', error ? 'error' : 'ok');
  };

  return (
    <>
      <PageHeader title="Lists" sub="Shelves on the homepage and shop pages." />
      {lists.map((l) => (
        <Section key={l.id} title={l.list_translations.find((t) => t.lang === 'en')?.name ?? l.key}
          actions={can.edit && <button className="btn btn-sm" onClick={() => saveList(l)}>Save</button>}>
          <p className="text-sm text-muted mb-3">{HELP[l.key]}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Field label="Mode"><select className="input" value={l.mode} disabled={!can.edit}
                onChange={(e) => setLists(lists.map((x) => (x.id === l.id ? { ...x, mode: e.target.value as any } : x)))}>
                <option value="automatic">Automatic only</option><option value="mixed">Pinned first, then automatic</option><option value="manual">Pinned only</option></select></Field>
              <Field label="Maximum books shown"><input className="input" type="number" min={1} max={30} value={l.max_items} disabled={!can.edit}
                onChange={(e) => setLists(lists.map((x) => (x.id === l.id ? { ...x, max_items: Number(e.target.value) } : x)))} /></Field>
              <div>
                <span className="label">Shelf heading per language</span>
                {enabledLangs.map((lg) => (
                  <div key={lg.code} className="flex items-center gap-2 mb-1">
                    <span className="w-8 text-xs font-bold text-muted">{lg.url_prefix || 'en'}</span>
                    <input className="input" aria-label={`Heading in ${lg.name_en}`} disabled={!can.edit}
                      defaultValue={l.list_translations.find((t) => t.lang === lg.code)?.name ?? ''} onBlur={(e) => e.target.value && saveName(l.id, lg.code, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Pinned books</span>
              <ol className="list-decimal pl-5 text-sm mb-2">{l.list_items.sort((a, b) => a.position - b.position).map((i) => (
                <li key={i.format_id}>{label(i.format_id)} {can.edit && <button className="link text-xs ml-1" onClick={() => unpin(l.id, i.format_id)}>remove</button>}</li>))}</ol>
              {can.edit && (
                <select className="input" aria-label="Pin a book" value="" onChange={(e) => pin(l.id, e.target.value, l.list_items.length)}>
                  <option value="">+ Pin a book format…</option>
                  {formats.filter((f) => !l.list_items.some((i) => i.format_id === f.id)).map((f) => <option key={f.id} value={f.id}>{label(f.id)}</option>)}
                </select>
              )}
            </div>
          </div>
        </Section>
      ))}
    </>
  );
}
