import { useEffect, useState } from 'react';
import { supabase, publicUrl, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { go } from '../router';
import { PageHeader, Section, Field, Loading, Empty, StatusBadge, useToast, confirmDelete, FileButton } from '../ui/kit';
import { TranslationTabs, useEnglishNames, useLangCompleteness, LangDots, LangLegend } from '../ui/TranslationTabs';
import { uploadMedia } from '../ui/upload';

/* ====================================================================== categories */
const CAT_FIELDS = [
  { name: 'name', label: 'Name', required: true },
  { name: 'slug', label: 'URL slug', type: 'slug' as const, slugFrom: 'name', required: true, hint: 'Used in /categories/{slug}.' },
  { name: 'intro', label: 'Intro text', type: 'textarea' as const },
  { name: 'seo_title', label: 'Search-result title', max: 60 },
  { name: 'seo_description', label: 'Search-result description', type: 'textarea' as const, max: 155 },
];

export function CategoriesList() {
  const { can } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<(Tables<'categories'> & { book_categories: { book_id: string }[] })[] | null>(null);
  const names = useEnglishNames('category_translations', 'category_id', 'name');
  const done = useLangCompleteness('category_translations', 'category_id');
  useEffect(() => { supabase.from('categories').select('*, book_categories(book_id)').order('sort').then(({ data }) => setRows((data as any) ?? [])); }, []);
  const create = async () => {
    const { data, error } = await supabase.from('categories').insert({ sort: (rows?.length ?? 0) + 1 }).select().single();
    if (error) return toast(error.message, 'error');
    go(`/categories/${data.id}`);
  };
  if (!rows) return <Loading />;
  return (
    <>
      <PageHeader title="Categories" sub="Topics such as Spirituality, Awareness, New Science, Health. Lists like Bestsellers are under Lists."
        actions={can.edit && <button className="btn-primary" onClick={create}>New category</button>} />
      <div className="card overflow-auto">
        {rows.length === 0 ? <Empty>No categories yet.</Empty> : (
          <table className="table"><thead><tr><th>Name</th><th>Books</th><th>Order</th><th>Status</th><th>Languages complete</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id} className="hover:bg-surface cursor-pointer" onClick={() => go(`/categories/${c.id}`)}>
                <td><a className="link font-semibold" href={`#/categories/${c.id}`}>{names[c.id] ?? '(no English name yet)'}</a></td>
                <td>{c.book_categories.length}</td><td>{c.sort}</td><td><StatusBadge status={c.status} /></td><td><LangDots status={done[c.id] ?? {}} /></td>
              </tr>))}</tbody></table>
        )}
      </div>
      <LangLegend />
    </>
  );
}

export function CategoryEditor({ id }: { id: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [c, setC] = useState<Tables<'categories'> | null>(null);
  const [img, setImg] = useState<Tables<'media'> | null>(null);
  const names = useEnglishNames('category_translations', 'category_id', 'name');
  const load = async () => {
    const { data } = await supabase.from('categories').select('*').eq('id', id).single();
    setC(data);
    setImg(data?.image_media_id ? (await supabase.from('media').select('*').eq('id', data.image_media_id).single()).data : null);
  };
  useEffect(() => { load(); }, [id]);
  if (!c) return <Loading />;
  const save = async () => {
    const { error } = await supabase.from('categories').update({ status: c.status, sort: c.sort, wix_slug: c.wix_slug }).eq('id', id);
    toast(error ? error.message : 'Saved', error ? 'error' : 'ok');
  };
  const remove = async () => {
    if (!confirmDelete('this category (books and articles stay)')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    go('/categories');
  };
  const onImg = async (file?: File) => {
    if (!file) return;
    try { const m = await uploadMedia('media', file, 'categories'); await supabase.from('categories').update({ image_media_id: m.id }).eq('id', id); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  return (
    <>
      <PageHeader title={names[id] ?? 'New category'} sub={<a className="link" href="#/categories">← All categories</a>}
        actions={can.edit && <><button className="btn-danger" onClick={remove}>Delete</button><button className="btn-primary" onClick={save}>Save</button></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0"><TranslationTabs table="category_translations" fk="category_id" id={id} fields={CAT_FIELDS} /></div>
        <div>
          <Section title="Settings">
            <div className="space-y-3">
              <Field label="Status"><select className="input" value={c.status} disabled={!can.edit} onChange={(e) => setC({ ...c, status: e.target.value as any })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></Field>
              <Field label="Sort order"><input className="input" type="number" value={c.sort} disabled={!can.edit} onChange={(e) => setC({ ...c, sort: Number(e.target.value) })} /></Field>
              <Field label="Old Wix slug" hint="e.g. /category/spirituality"><input className="input" value={c.wix_slug ?? ''} disabled={!can.edit} onChange={(e) => setC({ ...c, wix_slug: e.target.value || null })} /></Field>
            </div>
          </Section>
          <Section title="Topic tile image (optional)">
            {img && <img src={publicUrl(img.bucket, img.path)} alt="" className="w-full rounded mb-2" />}
            {can.edit && <FileButton label={img ? 'Replace image' : 'Upload image'} accept="image/*" onFiles={(f) => onImg(f[0])} />}
          </Section>
        </div>
      </div>
    </>
  );
}

/* ====================================================================== authors */
const AUTHOR_FIELDS = [
  { name: 'slug', label: 'URL slug', type: 'slug' as const, required: true, hint: 'Used in /authors/{slug}. Usually the same in every language.' },
  { name: 'bio', label: 'Biography', type: 'textarea' as const },
  { name: 'seo_title', label: 'Search-result title', max: 60, hint: 'Leave empty to use the standard template: “{author} — books and biography | Obelisk Books”.' },
  { name: 'seo_description', label: 'Search-result description', type: 'textarea' as const, max: 500, hint: 'Search engines usually show about the first 155 characters.' },
];

export function AuthorsList() {
  const { can } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<(Tables<'authors'> & { book_contributors: { book_id: string }[] })[] | null>(null);
  const done = useLangCompleteness('author_translations', 'author_id');
  useEffect(() => { supabase.from('authors').select('*, book_contributors(book_id)').order('sort_name').then(({ data }) => setRows((data as any) ?? [])); }, []);
  const create = async () => {
    const name = prompt('Author name');
    if (!name) return;
    const parts = name.trim().split(/\s+/);
    const sort_name = parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : name;
    const { data, error } = await supabase.from('authors').insert({ name: name.trim(), sort_name }).select().single();
    if (error) return toast(error.message, 'error');
    go(`/authors/${data.id}`);
  };
  if (!rows) return <Loading />;
  return (
    <>
      <PageHeader title="Authors" actions={can.edit && <button className="btn-primary" onClick={create}>New author</button>} />
      <div className="card overflow-auto">
        {rows.length === 0 ? <Empty>No authors yet.</Empty> : (
          <table className="table"><thead><tr><th>Name</th><th>Books</th><th>Status</th><th>Languages complete</th></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id} className="hover:bg-surface cursor-pointer" onClick={() => go(`/authors/${a.id}`)}>
                <td><a className="link font-semibold" href={`#/authors/${a.id}`}>{a.name}</a></td>
                <td>{new Set(a.book_contributors.map((b) => b.book_id)).size}</td><td><StatusBadge status={a.status} /></td><td><LangDots status={done[a.id] ?? {}} /></td>
              </tr>))}</tbody></table>
        )}
      </div>
      <LangLegend />
    </>
  );
}

export function AuthorEditor({ id }: { id: string }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [a, setA] = useState<Tables<'authors'> | null>(null);
  const [photo, setPhoto] = useState<Tables<'media'> | null>(null);
  const load = async () => {
    const { data } = await supabase.from('authors').select('*').eq('id', id).single();
    setA(data);
    setPhoto(data?.photo_media_id ? (await supabase.from('media').select('*').eq('id', data.photo_media_id).single()).data : null);
  };
  useEffect(() => { load(); }, [id]);
  if (!a) return <Loading />;
  const save = async () => {
    const { id: _, created_at, updated_at, updated_by, ...rest } = a;
    const { error } = await supabase.from('authors').update(rest).eq('id', id);
    toast(error ? error.message : 'Saved', error ? 'error' : 'ok');
  };
  const remove = async () => {
    if (!confirmDelete(`author “${a.name}”`)) return;
    const { error } = await supabase.from('authors').delete().eq('id', id);
    if (error) return toast(error.message.includes('book_contributors') ? 'This author is still linked to books — unlink them first.' : error.message, 'error');
    go('/authors');
  };
  const onPhoto = async (file?: File) => {
    if (!file) return;
    try { const m = await uploadMedia('media', file, 'authors'); await supabase.from('authors').update({ photo_media_id: m.id }).eq('id', id); load(); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  return (
    <>
      <PageHeader title={a.name} sub={<a className="link" href="#/authors">← All authors</a>}
        actions={can.edit && <><button className="btn-danger" onClick={remove}>Delete</button><button className="btn-primary" onClick={save}>Save author</button></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0"><TranslationTabs table="author_translations" fk="author_id" id={id} fields={AUTHOR_FIELDS} /></div>
        <div>
          <Section title="Author">
            <div className="space-y-3">
              <Field label="Name"><input className="input" value={a.name} disabled={!can.edit} onChange={(e) => setA({ ...a, name: e.target.value })} /></Field>
              <Field label="Sort name" hint="e.g. Ward, Suzanne"><input className="input" value={a.sort_name} disabled={!can.edit} onChange={(e) => setA({ ...a, sort_name: e.target.value })} /></Field>
              <Field label="Website"><input className="input" type="url" value={a.website_url ?? ''} disabled={!can.edit} onChange={(e) => setA({ ...a, website_url: e.target.value || null })} /></Field>
              <Field label="Status"><select className="input" value={a.status} disabled={!can.edit} onChange={(e) => setA({ ...a, status: e.target.value as any })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></Field>
              <Field label="Old Wix slug"><input className="input" value={a.wix_slug ?? ''} disabled={!can.edit} onChange={(e) => setA({ ...a, wix_slug: e.target.value || null })} /></Field>
            </div>
          </Section>
          <Section title="Portrait">
            {photo && <img src={publicUrl(photo.bucket, photo.path)} alt={`Portrait of ${a.name}`} className="w-32 h-32 object-cover rounded-full ring-4 ring-orange mb-2" />}
            {can.edit && <FileButton label={photo ? 'Replace portrait' : 'Upload portrait'} accept="image/*" onFiles={(f) => onPhoto(f[0])} />}
          </Section>
        </div>
      </div>
    </>
  );
}
