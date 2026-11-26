import { useEffect, useState } from 'react';
import { supabase, publicUrl, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { go } from '../router';
import { PageHeader, Section, Field, Loading, Empty, StatusBadge, useToast, confirmDelete } from '../ui/kit';
import { TranslationTabs, useEnglishNames, useLangCompleteness, LangDots, LangLegend } from '../ui/TranslationTabs';
import { uploadMedia } from '../ui/upload';

const FIELDS = [
  { name: 'title', label: 'Title', required: true },
  { name: 'slug', label: 'URL slug', type: 'slug' as const, slugFrom: 'title', required: true, hint: 'Used in /articles/{slug}.' },
  { name: 'excerpt', label: 'Excerpt', type: 'textarea' as const, max: 220, hint: 'Shown on article cards.' },
  { name: 'body_html', label: 'Article', type: 'rich' as const },
  { name: 'seo_title', label: 'Search-result title', max: 60 },
  { name: 'seo_description', label: 'Search-result description', type: 'textarea' as const, max: 155 },
];

export function ArticlesList() {
  const { can } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<Tables<'articles'>[] | null>(null);
  const titles = useEnglishNames('article_translations', 'article_id', 'title');
  const done = useLangCompleteness('article_translations', 'article_id');
  const [q, setQ] = useState('');
  useEffect(() => { supabase.from('articles').select('*').order('publish_at', { ascending: false, nullsFirst: true }).then(({ data }) => setRows(data ?? [])); }, []);
  const create = async () => {
    const { data, error } = await supabase.from('articles').insert({}).select().single();
    if (error) return toast(error.message, 'error');
    go(`/articles/${data.id}`);
  };
  if (!rows) return <Loading />;
  const shown = rows.filter((r) => !q || (titles[r.id] ?? '').toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Articles" sub={`${rows.length} articles`} actions={can.edit && <button className="btn-primary" onClick={create}>New article</button>} />
      <input className="input max-w-sm mb-3" placeholder="Search by title" aria-label="Search articles" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card overflow-auto">
        {shown.length === 0 ? <Empty>No articles yet.</Empty> : (
          <table className="table"><thead><tr><th>Title</th><th>Publish date</th><th>Status</th><th>Languages complete</th></tr></thead>
            <tbody>{shown.map((a) => (
              <tr key={a.id} className="hover:bg-surface cursor-pointer" onClick={() => go(`/articles/${a.id}`)}>
                <td><a className="link font-semibold" href={`#/articles/${a.id}`}>{titles[a.id] ?? '(untitled)'}</a></td>
                <td>{a.publish_at ? new Date(a.publish_at).toLocaleDateString('en-GB') : '—'}</td>
                <td><StatusBadge status={a.status} />{a.status === 'published' && a.publish_at && new Date(a.publish_at) > new Date() && <span className="badge bg-orange-tint ml-1">scheduled</span>}</td>
                <td><LangDots status={done[a.id] ?? {}} /></td>
              </tr>))}</tbody></table>
        )}
      </div>
      <LangLegend />
    </>
  );
}

export function ArticleEditor({ id }: { id: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [a, setA] = useState<Tables<'articles'> | null>(null);
  const [cover, setCover] = useState<Tables<'media'> | null>(null);
  const [authors, setAuthors] = useState<Tables<'authors'>[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [books, setBooks] = useState<{ id: string; internal_title: string }[]>([]);
  const [mentioned, setMentioned] = useState<string[]>([]);
  const catNames = useEnglishNames('category_translations', 'category_id', 'name');
  const bookTitles = useEnglishNames('book_translations', 'book_id', 'title');
  const title = useEnglishNames('article_translations', 'article_id', 'title')[id];

  const load = async () => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).single();
    setA(data);
    setCover(data?.cover_media_id ? (await supabase.from('media').select('*').eq('id', data.cover_media_id).single()).data : null);
  };
  useEffect(() => {
    load();
    supabase.from('authors').select('*').order('sort_name').then(({ data }) => setAuthors(data ?? []));
    supabase.from('categories').select('id').order('sort').then(({ data }) => setCats((data ?? []).map((c) => c.id)));
    supabase.from('article_categories').select('category_id').eq('article_id', id).then(({ data }) => setMine(new Set((data ?? []).map((c) => c.category_id))));
    supabase.from('books').select('id, internal_title').order('internal_title').then(({ data }) => setBooks(data ?? []));
    supabase.from('article_books').select('book_id').eq('article_id', id).order('position').then(({ data }) => setMentioned((data ?? []).map((b) => b.book_id)));
  }, [id]);
  if (!a) return <Loading />;

  const save = async () => {
    const { error } = await supabase.from('articles').update({ status: a.status, publish_at: a.publish_at, author_id: a.author_id, wix_url: a.wix_url }).eq('id', id);
    if (error) return toast(error.message, 'error');
    await supabase.from('article_books').delete().eq('article_id', id);
    if (mentioned.length) await supabase.from('article_books').insert(mentioned.map((b, i) => ({ article_id: id, book_id: b, position: i + 1 })));
    // reading time per language from the saved text (≈ 220 words per minute)
    const { data: tr } = await supabase.from('article_translations').select('lang, body_html').eq('article_id', id);
    for (const t of tr ?? []) {
      const words = (t.body_html ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      await supabase.from('article_translations').update({ reading_minutes: Math.max(1, Math.round(words / 220)) }).match({ article_id: id, lang: t.lang });
    }
    toast('Article saved');
  };
  const remove = async () => {
    if (!confirmDelete('this article in all languages')) return;
    await supabase.from('articles').delete().eq('id', id); go('/articles');
  };
  const toggleCat = async (cid: string, on: boolean) => {
    if (on) await supabase.from('article_categories').insert({ article_id: id, category_id: cid });
    else await supabase.from('article_categories').delete().match({ article_id: id, category_id: cid });
    const s = new Set(mine); on ? s.add(cid) : s.delete(cid); setMine(s);
  };
  const onCover = async (file?: File) => {
    if (!file) return;
    try { const m = await uploadMedia('media', file, 'articles'); await supabase.from('articles').update({ cover_media_id: m.id }).eq('id', id); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title={title ?? 'New article'} sub={<a className="link" href="#/articles">← All articles</a>}
        actions={can.edit && <><button className="btn-danger" onClick={remove}>Delete</button><button className="btn-primary" onClick={save}>Save article</button></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0"><TranslationTabs table="article_translations" fk="article_id" id={id} fields={FIELDS} /></div>
        <div>
          <Section title="Publishing">
            <div className="space-y-3">
              <Field label="Status"><select className="input" value={a.status} disabled={!can.edit} onChange={(e) => setA({ ...a, status: e.target.value as any })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></Field>
              <Field label="Publish date" hint="A future date schedules the article.">
                <input className="input" type="datetime-local" value={a.publish_at ? a.publish_at.slice(0, 16) : ''} disabled={!can.edit}
                  onChange={(e) => setA({ ...a, publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
              <Field label="Author (optional)"><select className="input" value={a.author_id ?? ''} disabled={!can.edit} onChange={(e) => setA({ ...a, author_id: e.target.value || null })}>
                <option value="">Obelisk Books</option>{authors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Field label="Old Wix URL" hint="e.g. /post/…"><input className="input" value={a.wix_url ?? ''} disabled={!can.edit} onChange={(e) => setA({ ...a, wix_url: e.target.value || null })} /></Field>
            </div>
          </Section>
          <Section title="Cover image">
            {cover && <div className="aspect-[4/3] bg-surface rounded mb-2 grid place-items-center overflow-hidden"><img src={publicUrl(cover.bucket, cover.path)} alt="" className="max-h-full object-contain" /></div>}
            <p className="text-xs text-muted mb-1">Shown 4:3 without cropping.</p>
            {can.edit && <input type="file" accept="image/*" aria-label="Upload cover image" onChange={(e) => onCover(e.target.files?.[0])} />}
          </Section>
          <Section title="Topics">
            {cats.map((c) => <label key={c} className="flex gap-2 text-sm"><input type="checkbox" checked={mine.has(c)} disabled={!can.edit} onChange={(e) => toggleCat(c, e.target.checked)} />{catNames[c] ?? c.slice(0, 8)}</label>)}
            {cats.length === 0 && <p className="text-sm text-muted">No categories yet.</p>}
          </Section>
          <Section title="Books mentioned">
            <ol className="list-decimal pl-5 text-sm mb-2">{mentioned.map((b) => <li key={b}>{bookTitles[b] ?? books.find((x) => x.id === b)?.internal_title}
              {can.edit && <button className="link text-xs ml-1" onClick={() => setMentioned(mentioned.filter((x) => x !== b))}>remove</button>}</li>)}</ol>
            {can.edit && <select className="input" aria-label="Add a book" value="" onChange={(e) => e.target.value && setMentioned([...mentioned, e.target.value])}>
              <option value="">+ Add a book…</option>{books.filter((b) => !mentioned.includes(b.id)).map((b) => <option key={b.id} value={b.id}>{bookTitles[b.id] ?? b.internal_title}</option>)}
            </select>}
          </Section>
        </div>
      </div>
    </>
  );
}
