import { useEffect, useMemo, useState } from 'react';
import { supabase, publicUrl, cents, toCents, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { go } from '../router';
import { PageHeader, Section, Field, Loading, Empty, StatusBadge, useToast, confirmDelete } from '../ui/kit';
import { TranslationTabs, useEnglishNames, useLangCompleteness, LangDots, LangLegend } from '../ui/TranslationTabs';
import { uploadMedia, uploadEbook } from '../ui/upload';
import { generatePreview } from '../ui/preview';

type Book = Tables<'books'>;
type Format = Tables<'formats'>;

export const BOOK_TEXT_FIELDS = [
  { name: 'title', label: 'Title', required: true },
  { name: 'slug', label: 'URL slug', type: 'slug' as const, slugFrom: 'title', required: true, hint: 'Used in /books/{slug} and /ebooks/{slug} for this language.' },
  { name: 'subtitle', label: 'Subtitle' },
  { name: 'heading_h2', label: 'Heading (H2)', max: 70, hint: 'Optional. Shown above the description. Left empty, the page shows “Description”.' },
  { name: 'heading_h3', label: 'Subheading (H3)', max: 90, hint: 'Optional. Shown under the heading.' },
  { name: 'description', label: 'Description', type: 'rich' as const, headings: false, hint: 'Paragraphs, bold, italic, lists and links. Headings go in the fields above.' },
  { name: 'seo_title', label: 'Search-result title', max: 60, hint: 'Leave empty to use the standard template.' },
  { name: 'seo_description', label: 'Search-result description', type: 'textarea' as const, max: 155 },
];

const BOOK_LANGS: [string, string][] = [['en', 'English'], ['nl', 'Dutch'], ['de', 'German'], ['fr', 'French'], ['es', 'Spanish'], ['it', 'Italian'], ['pt', 'Portuguese']];

/* ====================================================================== list */
export function BooksList() {
  const { can } = useAdmin();
  const toast = useToast();
  const [books, setBooks] = useState<(Book & { formats: Pick<Format, 'type' | 'availability' | 'price_eur_cents'>[] })[] | null>(null);
  const titles = useEnglishNames('book_translations', 'book_id', 'title');
  const done = useLangCompleteness('book_translations', 'book_id');
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase.from('books').select('*, formats(type, availability, price_eur_cents)').order('internal_title')
      .then(({ data, error }) => { if (error) toast(error.message, 'error'); setBooks((data as any) ?? []); });
  }, []);

  const create = async () => {
    const name = prompt('Working title of the new book');
    if (!name) return;
    const { data, error } = await supabase.from('books').insert({ internal_title: name }).select().single();
    if (error) return toast(error.message, 'error');
    go(`/books/${data.id}`);
  };

  if (!books) return <Loading />;
  const shown = books.filter((b) => !q || `${b.internal_title} ${titles[b.id] ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Books & formats" sub={`${books.length} books`} actions={can.edit && <button className="btn-primary" onClick={create}>New book</button>} />
      <input className="input max-w-sm mb-3" placeholder="Search by title" aria-label="Search books" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card overflow-auto">
        {shown.length === 0 ? <Empty>No books yet.</Empty> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Formats</th><th>Status</th><th>Languages complete</th></tr></thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} className="hover:bg-surface cursor-pointer" onClick={() => go(`/books/${b.id}`)}>
                  <td><a className="link font-semibold" href={`#/books/${b.id}`}>{titles[b.id] ?? b.internal_title}</a></td>
                  <td className="space-x-1">{b.formats.map((f) => <span key={f.type} className="badge bg-surface">{f.type} €{cents(f.price_eur_cents)}</span>)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td><LangDots status={done[b.id] ?? {}} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <LangLegend />
    </>
  );
}

/* ====================================================================== editor */
export function BookEditor({ id }: { id: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [book, setBook] = useState<Book | null>(null);
  const [cover, setCover] = useState<Tables<'media'> | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const collNames = useEnglishNames('collection_translations', 'collection_id', 'name');

  const load = async () => {
    const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
    if (error) return toast(error.message, 'error');
    setBook(data);
    if (data.cover_media_id) {
      const m = await supabase.from('media').select('*').eq('id', data.cover_media_id).single();
      setCover(m.data);
    } else setCover(null);
  };
  useEffect(() => { load(); supabase.from('collections').select('id').then(({ data }) => setCollections((data ?? []).map((c) => ({ id: c.id, name: '' })))); }, [id]);

  if (!book) return <Loading />;
  const set = (patch: Partial<Book>) => setBook({ ...book, ...patch });

  const save = async () => {
    const { id: _, created_at, updated_at, updated_by, ...rest } = book;
    const { error } = await supabase.from('books').update(rest).eq('id', id);
    toast(error ? error.message : 'Book saved', error ? 'error' : 'ok');
    if (!error) load();
  };
  const remove = async () => {
    if (!confirmDelete(`“${book.internal_title}” with all its formats and texts`)) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    go('/books');
  };
  const onCover = async (file?: File) => {
    if (!file) return;
    try {
      const m = await uploadMedia('covers', file, id);
      await supabase.from('books').update({ cover_media_id: m.id }).eq('id', id);
      toast('Cover uploaded'); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title={book.internal_title} sub={<a className="link" href="#/books">← All books</a>}
        actions={can.edit && <><button className="btn-danger" onClick={remove}>Delete</button><button className="btn-primary" onClick={save}>Save book</button></>} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <h2 className="font-bold mb-2">Texts per language</h2>
          <div className="mb-4"><TranslationTabs table="book_translations" fk="book_id" id={id} fields={BOOK_TEXT_FIELDS} /></div>
          <Formats book={book} coverUrl={cover ? publicUrl(cover.bucket, cover.path) : null} />
          <Contributors bookId={id} />
          <Related bookId={id} />
        </div>

        <div>
          <Section title="Publishing">
            <div className="space-y-3">
              <Field label="Status">
                <select className="input" value={book.status} disabled={!can.edit} onChange={(e) => set({ status: e.target.value as any })}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option>
                </select>
              </Field>
              <Field label="Publish at (optional)" hint="Scheduled publishing — the book appears from this moment.">
                <input className="input" type="datetime-local" value={book.publish_at ? book.publish_at.slice(0, 16) : ''} disabled={!can.edit}
                  onChange={(e) => set({ publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </Field>
              <label className="flex gap-2 text-sm"><input type="checkbox" checked={book.featured} disabled={!can.edit} onChange={(e) => set({ featured: e.target.checked })} /> Featured</label>
            </div>
          </Section>

          <Section title="Cover">
            {cover ? <img src={publicUrl(cover.bucket, cover.path)} alt="Book cover" className="w-40 rounded border border-line mb-2" /> : <p className="text-sm text-muted mb-2">No cover yet.</p>}
            {can.edit && <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload cover" onChange={(e) => onCover(e.target.files?.[0])} />}
          </Section>

          <Section title="Details">
            <div className="space-y-3">
              <Field label="Internal title (dashboard only)"><input className="input" value={book.internal_title} disabled={!can.edit} onChange={(e) => set({ internal_title: e.target.value })} /></Field>
              <Field label="Language of the book itself">
                <select className="input" value={book.text_language} disabled={!can.edit} onChange={(e) => set({ text_language: e.target.value })}>
                  {BOOK_LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </Field>
              <Field label="Publication date"><input className="input" type="date" value={book.publication_date ?? ''} disabled={!can.edit} onChange={(e) => set({ publication_date: e.target.value || null })} /></Field>
              <Field label="Publisher"><input className="input" value={book.publisher} disabled={!can.edit} onChange={(e) => set({ publisher: e.target.value })} /></Field>
              <Field label="Collection">
                <select className="input" value={book.collection_id ?? ''} disabled={!can.edit}
                  onChange={(e) => set({ collection_id: e.target.value || null, collection_position: e.target.value ? book.collection_position ?? 1 : null })}>
                  <option value="">— none —</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{collNames[c.id] ?? c.id.slice(0, 8)}</option>)}
                </select>
              </Field>
              {book.collection_id && (
                <Field label="Position in reading order"><input className="input" type="number" min={1} value={book.collection_position ?? 1} disabled={!can.edit}
                  onChange={(e) => set({ collection_position: Number(e.target.value) || 1 })} /></Field>
              )}
              <Field label="Tags" hint="Comma separated"><input className="input" value={book.tags.join(', ')} disabled={!can.edit}
                onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} /></Field>
              <Field label="Old Wix URLs (for redirects)" hint="One path per line, e.g. /product-page/energy-abundance">
                <textarea className="input" value={book.wix_slugs.join('\n')} disabled={!can.edit}
                  onChange={(e) => set({ wix_slugs: e.target.value.split('\n').map((t) => t.trim()).filter(Boolean) })} />
              </Field>
            </div>
          </Section>

          <Categories bookId={id} />
          <RetailerLinks book={book} set={set} />
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- formats */
const FORMAT_TYPES = ['paperback', 'hardcover', 'ebook'] as const;

function Formats({ book, coverUrl }: { book: Book; coverUrl: string | null }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [formats, setFormats] = useState<Format[] | null>(null);
  const load = () => supabase.from('formats').select('*').eq('book_id', book.id).order('type').then(({ data }) => setFormats(data ?? []));
  useEffect(() => { load(); }, [book.id]);
  if (!formats) return <Loading />;

  const add = async (type: (typeof FORMAT_TYPES)[number]) => {
    const { error } = await supabase.from('formats').insert({
      book_id: book.id, type, price_eur_cents: type === 'ebook' ? 749 : 0, price_usd_cents: type === 'ebook' ? 849 : 0,
      availability: 'hidden', preview_source: type === 'ebook' ? 'pdf' : null,
    });
    if (error) toast(error.message, 'error'); else load();
  };
  const missing = FORMAT_TYPES.filter((t) => !formats.some((f) => f.type === t));

  return (
    <Section title="Formats" actions={can.edit && missing.length > 0 && (
      <div className="flex gap-1">{missing.map((t) => <button key={t} className="btn btn-sm" onClick={() => add(t)}>+ {t}</button>)}</div>
    )}>
      {formats.length === 0 && <p className="text-sm text-muted">Add a paperback, hardcover or ebook format.</p>}
      <div className="space-y-4">{formats.map((f) => <FormatCard key={f.id} format={f} coverUrl={coverUrl} onChange={load} />)}</div>
    </Section>
  );
}

function FormatCard({ format, coverUrl, onChange }: { format: Format; coverUrl: string | null; onChange: () => void }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [f, setF] = useState(format);
  const [money, setMoney] = useState({
    eur: cents(format.price_eur_cents), usd: cents(format.price_usd_cents),
    seur: cents(format.sale_price_eur_cents), susd: cents(format.sale_price_usd_cents),
  });
  const [lowest, setLowest] = useState<{ eur: number | null; usd: number | null }>({ eur: null, usd: null });
  const set = (p: Partial<Format>) => setF({ ...f, ...p });
  const print = f.type !== 'ebook';

  useEffect(() => {
    if (!f.sale_price_eur_cents) return;
    const before = f.sale_starts_at ?? new Date().toISOString();
    Promise.all([
      supabase.rpc('lowest_price_30d', { f: f.id, currency: 'EUR', before }),
      supabase.rpc('lowest_price_30d', { f: f.id, currency: 'USD', before }),
    ]).then(([e, u]) => setLowest({ eur: e.data as any, usd: u.data as any }));
  }, [f.id, f.sale_price_eur_cents, f.sale_starts_at]);

  const save = async () => {
    const eur = toCents(money.eur), usd = toCents(money.usd);
    if (eur == null || usd == null) return toast('Enter both EUR and USD prices', 'error');
    if (f.isbn13 && !/^97[89]\d{10}$/.test(f.isbn13)) return toast('ISBN-13 must be 13 digits starting with 978 or 979', 'error');
    const { id, created_at, updated_at, updated_by, ...rest } = f;
    const { error } = await supabase.from('formats').update({
      ...rest, isbn13: f.isbn13 || null, bookvault_sku: print ? f.bookvault_sku || null : null,
      price_eur_cents: eur, price_usd_cents: usd,
      sale_price_eur_cents: toCents(money.seur), sale_price_usd_cents: toCents(money.susd),
    }).eq('id', f.id);
    toast(error ? error.message : `${f.type} saved`, error ? 'error' : 'ok');
    if (!error) onChange();
  };
  const remove = async () => {
    if (!confirmDelete(`the ${f.type} format`)) return;
    const { error } = await supabase.from('formats').delete().eq('id', f.id);
    if (error) toast(error.message.includes('bundle_items') ? 'This format is part of a collection set — remove it from the set first.' : error.message, 'error'); else onChange();
  };
  const dt = (v: string | null) => (v ? v.slice(0, 16) : '');
  const fromDt = (v: string) => (v ? new Date(v).toISOString() : null);

  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold capitalize">{f.type}</h3>
        <StatusBadge status={f.availability} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="ISBN-13"><input className="input" inputMode="numeric" value={f.isbn13 ?? ''} disabled={!can.edit} onChange={(e) => set({ isbn13: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Price EUR (incl. VAT)"><input className="input" inputMode="decimal" value={money.eur} disabled={!can.edit} onChange={(e) => setMoney({ ...money, eur: e.target.value })} /></Field>
        <Field label="Price USD (incl. VAT)"><input className="input" inputMode="decimal" value={money.usd} disabled={!can.edit} onChange={(e) => setMoney({ ...money, usd: e.target.value })} /></Field>
        <Field label="Availability">
          <select className="input" value={f.availability} disabled={!can.edit} onChange={(e) => set({ availability: e.target.value as any })}>
            <option value="available">Available</option><option value="preorder">Pre-order</option><option value="out_of_print">Out of print</option><option value="hidden">Hidden</option>
          </select>
        </Field>
        <Field label="Sale price EUR"><input className="input" inputMode="decimal" value={money.seur} disabled={!can.edit} onChange={(e) => setMoney({ ...money, seur: e.target.value })} /></Field>
        <Field label="Sale price USD"><input className="input" inputMode="decimal" value={money.susd} disabled={!can.edit} onChange={(e) => setMoney({ ...money, susd: e.target.value })} /></Field>
        <Field label="Sale starts"><input className="input" type="datetime-local" value={dt(f.sale_starts_at)} disabled={!can.edit} onChange={(e) => set({ sale_starts_at: fromDt(e.target.value) })} /></Field>
        <Field label="Sale ends"><input className="input" type="datetime-local" value={dt(f.sale_ends_at)} disabled={!can.edit} onChange={(e) => set({ sale_ends_at: fromDt(e.target.value) })} /></Field>
        <Field label="Release date" hint={f.availability === 'preorder' ? 'Shown as “Pre-order — published on …”' : undefined}>
          <input className="input" type="date" value={f.release_date ?? ''} disabled={!can.edit} onChange={(e) => set({ release_date: e.target.value || null })} /></Field>
        <Field label="Pages"><input className="input" type="number" min={1} value={f.pages ?? ''} disabled={!can.edit} onChange={(e) => set({ pages: e.target.value ? Number(e.target.value) : null })} /></Field>
        {print && <>
          <Field label="Width × height (mm)">
            <div className="flex gap-1">
              <input className="input" type="number" aria-label="Width in mm" value={f.width_mm ?? ''} disabled={!can.edit} onChange={(e) => set({ width_mm: e.target.value ? Number(e.target.value) : null })} />
              <input className="input" type="number" aria-label="Height in mm" value={f.height_mm ?? ''} disabled={!can.edit} onChange={(e) => set({ height_mm: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </Field>
          <Field label="Weight (g)"><input className="input" type="number" value={f.weight_g ?? ''} disabled={!can.edit} onChange={(e) => set({ weight_g: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Bookvault SKU / title ID" hint="Needed for print orders (and the API in Phase 8)."><input className="input" value={f.bookvault_sku ?? ''} disabled={!can.edit} onChange={(e) => set({ bookvault_sku: e.target.value.trim() })} /></Field>
        </>}
        <Field label="Stripe tax code" hint={print ? 'Printed books: txcd_35010000' : 'Ebooks: txcd_10302000'}>
          <input className="input" value={f.stripe_tax_code ?? ''} disabled={!can.edit} onChange={(e) => set({ stripe_tax_code: e.target.value.trim() || null })} /></Field>
      </div>
      {f.sale_price_eur_cents != null && (
        <p className="text-xs text-muted mt-2">Lowest price in the 30 days before the sale (EU rule): EUR {cents(lowest.eur)} · USD {cents(lowest.usd)}</p>
      )}
      {f.type === 'ebook' && <EbookFiles format={f} coverUrl={coverUrl} onChange={(p) => { set(p); onChange(); }} />}
      {can.edit && <div className="flex justify-end gap-2 mt-3"><button className="btn-danger btn-sm" onClick={remove}>Remove format</button><button className="btn-primary" onClick={save}>Save {f.type}</button></div>}
    </div>
  );
}

function EbookFiles({ format, coverUrl, onChange }: { format: Format; coverUrl: string | null; onChange: (p: Partial<Format>) => void }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [pages, setPages] = useState<Tables<'preview_pages'>[]>([]);
  const [useCover, setUseCover] = useState(true);
  const loadPages = () => supabase.from('preview_pages').select('*').eq('format_id', format.id).order('page_no').then(({ data }) => setPages(data ?? []));
  useEffect(() => { loadPages(); }, [format.id]);

  const upload = async (file: File | undefined, kind: 'epub' | 'pdf') => {
    if (!file) return;
    setBusy(`Uploading ${kind.toUpperCase()}…`);
    try {
      const path = await uploadEbook(format.id, file);
      const patch = kind === 'pdf' ? { ebook_pdf_path: path } : { ebook_epub_path: path };
      const { error } = await supabase.from('formats').update(patch).eq('id', format.id);
      if (error) throw error;
      toast(`${kind.toUpperCase()} uploaded`); onChange(patch);
    } catch (e: any) { toast(e.message, 'error'); }
    setBusy(null);
  };

  const generate = async () => {
    const source = (format.preview_source as 'pdf' | 'epub') ?? (format.ebook_pdf_path ? 'pdf' : 'epub');
    const path = source === 'pdf' ? format.ebook_pdf_path : format.ebook_epub_path;
    if (!path) return toast(`Upload the ${source.toUpperCase()} first (or switch the preview source).`, 'error');
    if (useCover && !coverUrl) return toast('Upload the book cover first, or untick “Use the cover as page 1”.', 'error');
    try {
      setBusy('Downloading the file…');
      const dl = await supabase.storage.from('ebooks').download(path);
      if (dl.error) throw dl.error;
      const n = await generatePreview({
        formatId: format.id, source, file: dl.data, from: format.preview_page_from, count: format.preview_page_count,
        coverUrl: useCover ? coverUrl : null, onProgress: setBusy,
      });
      toast(`Preview created: ${n} pages`); loadPages();
    } catch (e: any) { toast(`Preview failed: ${e.message}`, 'error'); }
    setBusy(null);
  };

  const savePreviewSettings = async (p: Partial<Format>) => {
    const { error } = await supabase.from('formats').update(p).eq('id', format.id);
    if (error) toast(error.message, 'error'); else onChange(p);
  };

  return (
    <div className="mt-4 border-t border-line pt-3">
      <h4 className="font-semibold mb-2">Ebook files <span className="text-xs text-muted font-normal">(private — buyers receive both)</span></h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`EPUB ${format.ebook_epub_path ? '✓ ' + format.ebook_epub_path.split('/').pop() : '— not uploaded'}`}>
          {can.edit && <input type="file" accept=".epub,application/epub+zip" onChange={(e) => upload(e.target.files?.[0], 'epub')} />}
        </Field>
        <Field label={`PDF ${format.ebook_pdf_path ? '✓ ' + format.ebook_pdf_path.split('/').pop() : '— not uploaded'}`}>
          {can.edit && <input type="file" accept=".pdf,application/pdf" onChange={(e) => upload(e.target.files?.[0], 'pdf')} />}
        </Field>
      </div>

      <h4 className="font-semibold mt-4 mb-2">5-page preview</h4>
      <div className="grid gap-3 sm:grid-cols-4 items-end">
        <Field label="Source">
          <select className="input" value={format.preview_source ?? 'pdf'} disabled={!can.edit} onChange={(e) => savePreviewSettings({ preview_source: e.target.value })}>
            <option value="pdf">PDF (recommended)</option><option value="epub">EPUB</option>
          </select>
        </Field>
        <Field label="Start at page" hint="Skip copyright / contents pages">
          <input className="input" type="number" min={1} value={format.preview_page_from} disabled={!can.edit} onChange={(e) => savePreviewSettings({ preview_page_from: Math.max(1, Number(e.target.value) || 1) })} />
        </Field>
        <Field label="Pages in total">
          <input className="input" type="number" min={1} max={10} value={format.preview_page_count} disabled={!can.edit} onChange={(e) => savePreviewSettings({ preview_page_count: Math.min(10, Math.max(1, Number(e.target.value) || 5)) })} />
        </Field>
        <label className="flex gap-2 text-sm pb-2"><input type="checkbox" checked={useCover} onChange={(e) => setUseCover(e.target.checked)} /> Use the cover as page 1</label>
      </div>
      {can.edit && <button className="btn mt-2" onClick={generate} disabled={!!busy}>{pages.length ? 'Regenerate preview' : 'Generate preview'}</button>}
      {busy && <p className="text-sm text-muted mt-2" role="status">{busy}</p>}
      {pages.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {pages.map((p) => <img key={p.page_no} src={publicUrl('previews', p.path)} alt={`Preview page ${p.page_no}`} className="h-40 border border-line rounded" />)}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- contributors */
function Contributors({ bookId }: { bookId: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const names = useEnglishNames('author_translations', 'author_id', 'slug');
  const [authors, setAuthors] = useState<Tables<'authors'>[]>([]);
  const [rows, setRows] = useState<Tables<'book_contributors'>[]>([]);
  const [pick, setPick] = useState({ author_id: '', role: 'author' });
  const load = () => supabase.from('book_contributors').select('*').eq('book_id', bookId).order('position').then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); supabase.from('authors').select('*').order('sort_name').then(({ data }) => setAuthors(data ?? [])); }, [bookId]);
  const name = (aid: string) => authors.find((a) => a.id === aid)?.name ?? names[aid] ?? aid;

  const add = async () => {
    if (!pick.author_id) return;
    const { error } = await supabase.from('book_contributors').insert({ book_id: bookId, author_id: pick.author_id, role: pick.role as any, position: rows.length + 1 });
    if (error) toast(error.message, 'error'); else load();
  };
  const remove = async (r: Tables<'book_contributors'>) => {
    await supabase.from('book_contributors').delete().match({ book_id: bookId, author_id: r.author_id, role: r.role }); load();
  };
  return (
    <Section title="Authors & translator">
      <ul className="mb-3 space-y-1">{rows.map((r) => (
        <li key={r.author_id + r.role} className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{name(r.author_id)}</span><span className="badge bg-surface">{r.role}</span>
          {can.edit && <button className="btn btn-sm" onClick={() => remove(r)} aria-label={`Remove ${name(r.author_id)}`}>Remove</button>}
        </li>))}
        {rows.length === 0 && <li className="text-sm text-muted">No authors linked yet.</li>}
      </ul>
      {can.edit && (
        <div className="flex gap-2">
          <select className="input" aria-label="Author" value={pick.author_id} onChange={(e) => setPick({ ...pick, author_id: e.target.value })}>
            <option value="">Choose an author…</option>
            {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input max-w-40" aria-label="Role" value={pick.role} onChange={(e) => setPick({ ...pick, role: e.target.value })}>
            <option value="author">Author</option><option value="translator">Translator</option><option value="editor">Editor</option><option value="illustrator">Illustrator</option>
          </select>
          <button className="btn" onClick={add}>Add</button>
        </div>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- categories */
function Categories({ bookId }: { bookId: string }) {
  const { can } = useAdmin();
  const names = useEnglishNames('category_translations', 'category_id', 'name');
  const [all, setAll] = useState<string[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  useEffect(() => {
    supabase.from('categories').select('id').order('sort').then(({ data }) => setAll((data ?? []).map((c) => c.id)));
    supabase.from('book_categories').select('category_id').eq('book_id', bookId).then(({ data }) => setMine(new Set((data ?? []).map((c) => c.category_id))));
  }, [bookId]);
  const toggle = async (cid: string, on: boolean) => {
    if (on) await supabase.from('book_categories').insert({ book_id: bookId, category_id: cid });
    else await supabase.from('book_categories').delete().match({ book_id: bookId, category_id: cid });
    const s = new Set(mine); on ? s.add(cid) : s.delete(cid); setMine(s);
  };
  return (
    <Section title="Categories">
      {all.length === 0 ? <p className="text-sm text-muted">Create categories first.</p> : all.map((c) => (
        <label key={c} className="flex gap-2 text-sm"><input type="checkbox" checked={mine.has(c)} disabled={!can.edit} onChange={(e) => toggle(c, e.target.checked)} />{names[c] ?? c.slice(0, 8)}</label>
      ))}
    </Section>
  );
}

/* ---------------------------------------------------------------- retailer links */
function RetailerLinks({ book, set }: { book: Book; set: (p: Partial<Book>) => void }) {
  const { can } = useAdmin();
  const links = (book.retailer_links as { label: string; url: string }[]) ?? [];
  const upd = (l: typeof links) => set({ retailer_links: l as any });
  return (
    <Section title="Other retailers">
      <p className="text-xs text-muted mb-2">No Kindle links (decided 25 Nov 2026). Save the book after editing.</p>
      {links.map((l, i) => (
        <div key={i} className="flex gap-1 mb-1">
          <input className="input" aria-label="Store name" placeholder="Store" value={l.label} disabled={!can.edit} onChange={(e) => upd(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input className="input" aria-label="Link" placeholder="https://" value={l.url} disabled={!can.edit} onChange={(e) => upd(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          {can.edit && <button className="btn btn-sm" onClick={() => upd(links.filter((_, j) => j !== i))} aria-label="Remove link">✕</button>}
        </div>
      ))}
      {can.edit && <button className="btn btn-sm" onClick={() => upd([...links, { label: '', url: '' }])}>+ Add link</button>}
    </Section>
  );
}

/* ---------------------------------------------------------------- related */
function Related({ bookId }: { bookId: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const titles = useEnglishNames('book_translations', 'book_id', 'title');
  const atitles = useEnglishNames('article_translations', 'article_id', 'title');
  const [books, setBooks] = useState<{ id: string; internal_title: string }[]>([]);
  const [articles, setArticles] = useState<{ id: string }[]>([]);
  const [rb, setRb] = useState<Record<number, string>>({});
  const [ra, setRa] = useState<Record<number, string>>({});
  useEffect(() => {
    supabase.from('books').select('id, internal_title').neq('id', bookId).order('internal_title').then(({ data }) => setBooks(data ?? []));
    supabase.from('articles').select('id').then(({ data }) => setArticles(data ?? []));
    supabase.from('related_books').select('*').eq('book_id', bookId).then(({ data }) => setRb(Object.fromEntries((data ?? []).map((r) => [r.position, r.related_book_id]))));
    supabase.from('related_articles').select('*').eq('book_id', bookId).then(({ data }) => setRa(Object.fromEntries((data ?? []).map((r) => [r.position, r.article_id]))));
  }, [bookId]);
  const save = async () => {
    await supabase.from('related_books').delete().eq('book_id', bookId);
    await supabase.from('related_articles').delete().eq('book_id', bookId);
    const b = Object.entries(rb).filter(([, v]) => v).map(([p, v]) => ({ book_id: bookId, related_book_id: v, position: Number(p) }));
    const a = Object.entries(ra).filter(([, v]) => v).map(([p, v]) => ({ book_id: bookId, article_id: v, position: Number(p) }));
    const e1 = b.length ? (await supabase.from('related_books').insert(b)).error : null;
    const e2 = a.length ? (await supabase.from('related_articles').insert(a)).error : null;
    const err = e1 || e2;
    toast(err ? (err.message.includes('unique') ? 'Each related item can only be chosen once.' : err.message) : 'Related items saved', err ? 'error' : 'ok');
  };
  const slots = [1, 2, 3];
  return (
    <Section title="Related books & articles" actions={can.edit && <button className="btn btn-sm" onClick={save}>Save related</button>}>
      <p className="text-xs text-muted mb-2">Up to 3 each. Empty slots are filled automatically from the same collection or topic.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">{slots.map((s) => (
          <select key={s} className="input" aria-label={`Related book ${s}`} value={rb[s] ?? ''} disabled={!can.edit} onChange={(e) => setRb({ ...rb, [s]: e.target.value })}>
            <option value="">Book {s}: automatic</option>{books.map((b) => <option key={b.id} value={b.id}>{titles[b.id] ?? b.internal_title}</option>)}
          </select>))}</div>
        <div className="space-y-1">{slots.map((s) => (
          <select key={s} className="input" aria-label={`Related article ${s}`} value={ra[s] ?? ''} disabled={!can.edit} onChange={(e) => setRa({ ...ra, [s]: e.target.value })}>
            <option value="">Article {s}: automatic</option>{articles.map((a) => <option key={a.id} value={a.id}>{atitles[a.id] ?? a.id.slice(0, 8)}</option>)}
          </select>))}</div>
      </div>
    </Section>
  );
}
