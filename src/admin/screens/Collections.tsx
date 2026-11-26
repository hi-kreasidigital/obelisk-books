import { useEffect, useState } from 'react';
import { supabase, publicUrl, cents, toCents, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { go } from '../router';
import { PageHeader, Section, Field, Loading, Empty, StatusBadge, useToast, confirmDelete } from '../ui/kit';
import { TranslationTabs, useEnglishNames, useLangCompleteness, LangDots } from '../ui/TranslationTabs';
import { uploadMedia } from '../ui/upload';

const TEXT_FIELDS = [
  { name: 'name', label: 'Name', required: true },
  { name: 'slug', label: 'URL slug', type: 'slug' as const, slugFrom: 'name', required: true, hint: 'Used in /collections/{slug}.' },
  { name: 'intro', label: 'Intro text', type: 'textarea' as const },
  { name: 'seo_title', label: 'Search-result title', max: 60 },
  { name: 'seo_description', label: 'Search-result description', type: 'textarea' as const, max: 155 },
];
const SET_TYPES = ['paperback', 'hardcover', 'ebook'] as const;

export function CollectionsList() {
  const { can } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<(Tables<'collections'> & { books: { id: string }[] })[] | null>(null);
  const names = useEnglishNames('collection_translations', 'collection_id', 'name');
  const done = useLangCompleteness('collection_translations', 'collection_id');
  useEffect(() => { supabase.from('collections').select('*, books(id)').order('sort').then(({ data }) => setRows((data as any) ?? [])); }, []);
  const create = async () => {
    const { data, error } = await supabase.from('collections').insert({}).select().single();
    if (error) return toast(error.message, 'error');
    go(`/collections/${data.id}`);
  };
  if (!rows) return <Loading />;
  return (
    <>
      <PageHeader title="Collections" sub="Books that belong together (book series), with optional complete-set offers."
        actions={can.edit && <button className="btn-primary" onClick={create}>New collection</button>} />
      <div className="card overflow-auto">
        {rows.length === 0 ? <Empty>No collections yet.</Empty> : (
          <table className="table"><thead><tr><th>Name</th><th>Books</th><th>Status</th><th>Languages complete</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface cursor-pointer" onClick={() => go(`/collections/${c.id}`)}>
                <td><a className="link font-semibold" href={`#/collections/${c.id}`}>{names[c.id] ?? '(no English name yet)'}</a></td>
                <td>{c.books.length}</td><td><StatusBadge status={c.status} /></td><td><LangDots done={done[c.id] ?? []} /></td>
              </tr>))}</tbody></table>
        )}
      </div>
    </>
  );
}

type BookRow = { id: string; internal_title: string; collection_position: number | null; formats: Tables<'formats'>[] };

export function CollectionEditor({ id }: { id: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [c, setC] = useState<Tables<'collections'> | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [sets, setSets] = useState<(Tables<'formats'> & { bundle_items: Tables<'bundle_items'>[] })[]>([]);
  const [cover, setCover] = useState<Tables<'media'> | null>(null);
  const titles = useEnglishNames('book_translations', 'book_id', 'title');
  const names = useEnglishNames('collection_translations', 'collection_id', 'name');

  const load = async () => {
    const { data } = await supabase.from('collections').select('*').eq('id', id).single();
    setC(data);
    if (data?.cover_media_id) setCover((await supabase.from('media').select('*').eq('id', data.cover_media_id).single()).data);
    const b = await supabase.from('books').select('id, internal_title, collection_position, formats(*)').eq('collection_id', id).order('collection_position');
    setBooks((b.data as any) ?? []);
    const s = await supabase.from('formats').select('*, bundle_items!bundle_items_bundle_format_id_fkey(*)').eq('collection_id', id).eq('type', 'bundle');
    setSets((s.data as any) ?? []);
  };
  useEffect(() => { load(); }, [id]);
  if (!c) return <Loading />;

  const save = async () => {
    const { error } = await supabase.from('collections').update({ status: c.status, sort: c.sort, wix_slug: c.wix_slug }).eq('id', id);
    toast(error ? error.message : 'Collection saved', error ? 'error' : 'ok');
  };
  const remove = async () => {
    if (!confirmDelete('this collection and its set offers (the books stay)')) return;
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    go('/collections');
  };
  const onCover = async (file?: File) => {
    if (!file) return;
    try { const m = await uploadMedia('covers', file, `collections/${id}`); await supabase.from('collections').update({ cover_media_id: m.id }).eq('id', id); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  /* complete sets: one per format type, only when every book has that format */
  const membersFor = (t: string) => books.map((b) => b.formats.find((f) => f.type === t)).filter(Boolean) as Tables<'formats'>[];
  const eligible = (t: string) => books.length > 1 && books.every((b) => b.formats.some((f) => f.type === t));
  const sumPrice = (t: string, cur: 'eur' | 'usd') => membersFor(t).reduce((s, f) => s + (cur === 'eur' ? f.price_eur_cents : f.price_usd_cents), 0);

  const createSet = async (t: (typeof SET_TYPES)[number]) => {
    const { data, error } = await supabase.from('formats').insert({
      collection_id: id, type: 'bundle', bundle_of: t, availability: 'hidden',
      price_eur_cents: Math.round(sumPrice(t, 'eur') * 0.85), price_usd_cents: Math.round(sumPrice(t, 'usd') * 0.85),
      stripe_tax_code: t === 'ebook' ? 'txcd_10302000' : 'txcd_35010000',
    }).select().single();
    if (error) return toast(error.message, 'error');
    await syncMembers(data.id, t);
    toast(`${t} set created at 15% off — adjust the price below`); load();
  };
  const syncMembers = async (setId: string, t: string) => {
    await supabase.from('bundle_items').delete().eq('bundle_format_id', setId);
    const rows = membersFor(t).map((f, i) => ({ bundle_format_id: setId, member_format_id: f.id, position: i + 1 }));
    const { error } = await supabase.from('bundle_items').insert(rows);
    if (error) toast(error.message, 'error');
  };

  return (
    <>
      <PageHeader title={names[id] ?? 'New collection'} sub={<a className="link" href="#/collections">← All collections</a>}
        actions={can.edit && <><button className="btn-danger" onClick={remove}>Delete</button><button className="btn-primary" onClick={save}>Save</button></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <h2 className="font-bold mb-2">Texts per language</h2>
          <div className="mb-4"><TranslationTabs table="collection_translations" fk="collection_id" id={id} fields={TEXT_FIELDS} /></div>

          <Section title="Books in reading order">
            {books.length === 0 ? <p className="text-sm text-muted">Add books to this collection from each book's editor (Details → Collection).</p> : (
              <ol className="space-y-1">{books.map((b) => (
                <li key={b.id} className="flex gap-2 text-sm items-center">
                  <span className="badge bg-teal-tint text-teal-text">Book {b.collection_position}</span>
                  <a className="link" href={`#/books/${b.id}`}>{titles[b.id] ?? b.internal_title}</a>
                  <span className="text-muted text-xs">{b.formats.map((f) => f.type).join(' · ')}</span>
                </li>))}</ol>
            )}
          </Section>

          <Section title="Complete-collection sets">
            <p className="text-xs text-muted mb-3">One cart line per set; a set contains one format type only and is offered only when every book exists in that format.</p>
            <div className="space-y-3">
              {SET_TYPES.map((t) => {
                const s = sets.find((x) => x.bundle_of === t);
                if (s) return <SetCard key={t} set={s} members={membersFor(t)} titles={titles} books={books} separate={{ eur: sumPrice(t, 'eur'), usd: sumPrice(t, 'usd') }}
                  onSync={async () => { await syncMembers(s.id, t); toast('Books in the set updated'); load(); }} onChange={load} />;
                return (
                  <div key={t} className="flex items-center justify-between rounded-md border border-dashed border-line p-3 text-sm">
                    <span className="capitalize">{t} set</span>
                    {eligible(t) ? (can.edit && <button className="btn btn-sm" onClick={() => createSet(t)}>Create {t} set</button>)
                      : <span className="text-muted">Not possible — not every book has a {t} format</span>}
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
        <div>
          <Section title="Publishing">
            <Field label="Status">
              <select className="input" value={c.status} disabled={!can.edit} onChange={(e) => setC({ ...c, status: e.target.value as any })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option>
              </select>
            </Field>
            <div className="mt-3"><Field label="Sort order"><input className="input" type="number" value={c.sort} disabled={!can.edit} onChange={(e) => setC({ ...c, sort: Number(e.target.value) })} /></Field></div>
            <div className="mt-3"><Field label="Old Wix slug"><input className="input" value={c.wix_slug ?? ''} disabled={!can.edit} onChange={(e) => setC({ ...c, wix_slug: e.target.value || null })} /></Field></div>
          </Section>
          <Section title="Image (stacked covers)">
            {cover && <img src={publicUrl(cover.bucket, cover.path)} alt="Collection image" className="w-full rounded border border-line mb-2" />}
            {can.edit && <input type="file" accept="image/*" aria-label="Upload collection image" onChange={(e) => onCover(e.target.files?.[0])} />}
          </Section>
        </div>
      </div>
    </>
  );
}

function SetCard({ set, members, titles, books, separate, onSync, onChange }: {
  set: Tables<'formats'> & { bundle_items: Tables<'bundle_items'>[] }; members: Tables<'formats'>[]; titles: Record<string, string>;
  books: BookRow[]; separate: { eur: number; usd: number }; onSync: () => void; onChange: () => void;
}) {
  const { can } = useAdmin();
  const toast = useToast();
  const [eur, setEur] = useState(cents(set.price_eur_cents));
  const [usd, setUsd] = useState(cents(set.price_usd_cents));
  const [avail, setAvail] = useState(set.availability);
  const inSet = new Set(set.bundle_items.map((i) => i.member_format_id));
  const outOfSync = members.length !== inSet.size || members.some((m) => !inSet.has(m.id));
  const preorders = members.filter((m) => m.availability === 'preorder');
  const bookOf = (f: Tables<'formats'>) => books.find((b) => b.id === f.book_id);

  const save = async () => {
    const e = toCents(eur), u = toCents(usd);
    if (e == null || u == null) return toast('Enter both prices', 'error');
    const { error } = await supabase.from('formats').update({ price_eur_cents: e, price_usd_cents: u, availability: avail }).eq('id', set.id);
    toast(error ? error.message : 'Set saved', error ? 'error' : 'ok'); if (!error) onChange();
  };
  const remove = async () => {
    if (!confirmDelete(`the ${set.bundle_of} set`)) return;
    await supabase.from('formats').delete().eq('id', set.id); onChange();
  };
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex justify-between items-center mb-2"><h3 className="font-bold capitalize">{set.bundle_of} set</h3><StatusBadge status={avail} /></div>
      <ol className="text-sm list-decimal pl-5 mb-2">{members.map((m) => <li key={m.id}>{titles[m.book_id!] ?? bookOf(m)?.internal_title} <span className="text-muted">· ISBN {m.isbn13 ?? '—'}{m.bookvault_sku ? ` · SKU ${m.bookvault_sku}` : ''}{m.availability === 'preorder' ? ' · pre-order' : ''}</span></li>)}</ol>
      {outOfSync && <p className="text-sm bg-orange-tint p-2 rounded mb-2">The books in this collection changed. {can.edit && <button className="link" onClick={onSync}>Update the set</button>}</p>}
      {preorders.length > 0 && <p className="text-xs text-muted mb-2">Contains a pre-order: published books ship first, the pre-order follows as a second Bookvault order (customer pays shipping once).</p>}
      <div className="grid gap-2 sm:grid-cols-3 items-end">
        <Field label="Set price EUR" hint={`Separately: €${cents(separate.eur)}`}><input className="input" value={eur} disabled={!can.edit} onChange={(e) => setEur(e.target.value)} /></Field>
        <Field label="Set price USD" hint={`Separately: $${cents(separate.usd)}`}><input className="input" value={usd} disabled={!can.edit} onChange={(e) => setUsd(e.target.value)} /></Field>
        <Field label="Availability">
          <select className="input" value={avail} disabled={!can.edit} onChange={(e) => setAvail(e.target.value as any)}>
            <option value="available">Available</option><option value="preorder">Pre-order</option><option value="hidden">Hidden</option><option value="out_of_print">Out of print</option>
          </select>
        </Field>
      </div>
      {can.edit && <div className="flex justify-end gap-2 mt-2"><button className="btn-danger btn-sm" onClick={remove}>Remove set</button><button className="btn-primary" onClick={save}>Save set</button></div>}
    </div>
  );
}
