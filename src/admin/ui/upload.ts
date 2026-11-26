import { supabase } from '../../lib/supabase';

const safeName = (n: string) => n.normalize('NFKD').replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').toLowerCase();

export async function imageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  try { const b = await createImageBitmap(file); const r = { width: b.width, height: b.height }; b.close(); return r; } catch { return null; }
}

/** Upload an image to a public bucket and register it in `media`. Returns the media row. */
export async function uploadMedia(bucket: 'covers' | 'media' | 'previews', file: File, folder = '') {
  const path = `${folder ? folder + '/' : ''}${Date.now().toString(36)}-${safeName(file.name)}`;
  const up = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const size = await imageSize(file);
  const { data, error } = await supabase.from('media').insert({
    bucket, path, mime: file.type, bytes: file.size, width: size?.width ?? null, height: size?.height ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

/** Upload a full ebook file to the private bucket. Returns the object path. */
export async function uploadEbook(formatId: string, file: File) {
  const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub';
  const path = `${formatId}/${safeName(file.name.replace(/\.(pdf|epub)$/i, ''))}.${ext}`;
  const { error } = await supabase.storage.from('ebooks').upload(path, file, {
    contentType: ext === 'pdf' ? 'application/pdf' : 'application/epub+zip', upsert: true,
  });
  if (error) throw error;
  return path;
}
