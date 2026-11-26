import { useEffect, useState } from 'react';
import { supabase, publicUrl, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Section, Loading, Empty, Modal, Field, useToast, confirmDelete } from '../ui/kit';
import { uploadMedia } from '../ui/upload';

export function MediaLibrary() {
  const { can, enabledLangs } = useAdmin();
  const toast = useToast();
  const [items, setItems] = useState<Tables<'media'>[] | null>(null);
  const [tiles, setTiles] = useState<Tables<'instagram_tiles'>[]>([]);
  const [open, setOpen] = useState<Tables<'media'> | null>(null);
  const [bucket, setBucket] = useState<'all' | 'media' | 'covers'>('all');
  const [busy, setBusy] = useState(false);
  const load = () => {
    supabase.from('media').select('*').neq('bucket', 'previews').order('created_at', { ascending: false }).then(({ data }) => setItems(data ?? []));
    supabase.from('instagram_tiles').select('*').order('position').then(({ data }) => setTiles(data ?? []));
  };
  useEffect(load, []);
  if (!items) return <Loading />;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) { try { await uploadMedia('media', f, 'library'); } catch (e: any) { toast(`${f.name}: ${e.message}`, 'error'); } }
    setBusy(false); load();
  };
  const saveAlt = async (m: Tables<'media'>) => {
    const { error } = await supabase.from('media').update({ alt: m.alt, caption: m.caption }).eq('id', m.id);
    toast(error ? error.message : 'Saved', error ? 'error' : 'ok'); if (!error) { setOpen(null); load(); }
  };
  const remove = async (m: Tables<'media'>) => {
    if (!confirmDelete('this image')) return;
    const { error } = await supabase.from('media').delete().eq('id', m.id);
    if (error) return toast('This image is still used (cover, portrait or tile). Replace it there first.', 'error');
    await supabase.storage.from(m.bucket).remove([m.path]); setOpen(null); load();
  };
  const addTile = async (m: Tables<'media'>) => {
    const url = prompt('Instagram post link (optional)') ?? '';
    const { error } = await supabase.from('instagram_tiles').insert({ media_id: m.id, post_url: url || null, position: tiles.length + 1 });
    toast(error ? error.message : 'Added to the Instagram strip', error ? 'error' : 'ok'); load();
  };
  const removeTile = async (t: Tables<'instagram_tiles'>) => { await supabase.from('instagram_tiles').delete().eq('id', t.id); load(); };

  const shown = items.filter((m) => bucket === 'all' || m.bucket === bucket);
  const byId = Object.fromEntries(items.map((m) => [m.id, m]));
  return (
    <>
      <PageHeader title="Media" sub="Article images, author photos, category images and covers."
        actions={can.edit && <label className="btn-primary cursor-pointer">{busy ? 'Uploading…' : 'Upload images'}<input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} /></label>} />

      <Section title="Homepage Instagram strip">
        <p className="text-xs text-muted mb-2">5 portrait images, chosen here (no Instagram API). Use “Add to Instagram strip” on an image below.</p>
        <div className="flex gap-2 overflow-x-auto">
          {tiles.map((t) => byId[t.media_id] && (
            <figure key={t.id} className="w-28 shrink-0">
              <img src={publicUrl(byId[t.media_id].bucket, byId[t.media_id].path)} alt="" className="aspect-[4/5] object-cover rounded" />
              {can.edit && <button className="link text-xs" onClick={() => removeTile(t)}>remove</button>}
            </figure>))}
          {tiles.length === 0 && <p className="text-sm text-muted">No images yet.</p>}
        </div>
      </Section>

      <div className="flex gap-2 mb-3" role="group" aria-label="Filter">
        {(['all', 'media', 'covers'] as const).map((b) => <button key={b} className={`btn btn-sm ${bucket === b ? 'bg-teal-tint' : ''}`} aria-pressed={bucket === b} onClick={() => setBucket(b)}>{b === 'all' ? 'All' : b === 'media' ? 'Library' : 'Covers'}</button>)}
      </div>
      {shown.length === 0 ? <div className="card"><Empty>No images yet.</Empty></div> : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((m) => (
            <button key={m.id} className="card p-1 text-left hover:border-teal" onClick={() => setOpen(m)}>
              <div className="aspect-square bg-surface rounded grid place-items-center overflow-hidden"><img src={publicUrl(m.bucket, m.path)} alt={(m.alt as any)?.en ?? ''} loading="lazy" className="max-h-full object-contain" /></div>
              <div className="text-[11px] text-muted truncate mt-1">{m.path.split('/').pop()}</div>
              {!(m.alt as any)?.en && <div className="text-[11px] text-red-700">No alt text</div>}
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="Image">
        {open && (
          <div className="space-y-3">
            <img src={publicUrl(open.bucket, open.path)} alt="" className="max-h-64 mx-auto" />
            <div className="flex gap-2 items-center">
              <input className="input" readOnly value={publicUrl(open.bucket, open.path)} aria-label="Image address" onFocus={(e) => e.target.select()} />
              <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(publicUrl(open.bucket, open.path)); toast('Address copied'); }}>Copy</button>
            </div>
            <p className="text-xs text-muted">{open.width}×{open.height} · {Math.round((open.bytes ?? 0) / 1024)} KB</p>
            <span className="label">Alt text (description for screen readers) per language</span>
            {enabledLangs.map((l) => (
              <Field key={l.code} label={l.name_en}>
                <input className="input" value={(open.alt as any)?.[l.code] ?? ''} disabled={!can.edit}
                  onChange={(e) => setOpen({ ...open, alt: { ...(open.alt as any), [l.code]: e.target.value } })} />
              </Field>
            ))}
            {can.edit && <div className="flex justify-between">
              <div className="flex gap-2"><button className="btn-danger" onClick={() => remove(open)}>Delete</button><button className="btn" onClick={() => addTile(open)}>Add to Instagram strip</button></div>
              <button className="btn-primary" onClick={() => saveAlt(open)}>Save</button></div>}
          </div>
        )}
      </Modal>
    </>
  );
}
