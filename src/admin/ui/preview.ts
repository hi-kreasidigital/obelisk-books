/**
 * 5-page ebook preview, rendered in the admin's browser (roadmap §5.3).
 * PDF (default): pdf.js renders the chosen pages. EPUB (fallback): epub.js lays the opening out at a fixed
 * book page size and each page is captured. Pages are saved as WebP at 2x (1200 px wide) in `previews`.
 */
import { supabase } from '../../lib/supabase';

export const PAGE_W = 1200;          // 2x of a 600 px display width
export const PAGE_H = 1800;          // 2:3 book page

const toWebp = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode page'))), 'image/webp', 0.86));

async function coverCanvas(coverUrl: string) {
  const img = await fetch(coverUrl).then((r) => r.blob()).then(createImageBitmap);
  const c = document.createElement('canvas');
  c.width = PAGE_W; c.height = Math.round(PAGE_W * (img.height / img.width));
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function pdfPages(file: Blob, from: number, count: number) {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out: HTMLCanvasElement[] = [];
  for (let p = from; p < from + count && p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: PAGE_W / base.width });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise;
    out.push(c);
  }
  await doc.destroy();
  return out;
}

async function epubPages(file: Blob, from: number, count: number) {
  const ePub = (await import('epubjs')).default;
  const { toCanvas } = await import('html-to-image');
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W / 2}px;height:${PAGE_H / 2}px;background:#fff`;
  document.body.appendChild(host);
  const book = ePub(await file.arrayBuffer());
  const rendition = book.renderTo(host, { width: PAGE_W / 2, height: PAGE_H / 2, flow: 'paginated', spread: 'none' });
  rendition.themes.default({ body: { 'font-family': 'Georgia, serif', 'line-height': '1.5', padding: '28px 32px !important' } });
  await rendition.display();
  const out: HTMLCanvasElement[] = [];
  try {
    for (let i = 1; i < from; i++) await rendition.next();
    for (let i = 0; i < count; i++) {
      const iframe = host.querySelector('iframe') as HTMLIFrameElement;
      const body = iframe.contentDocument!.documentElement;
      const c = await toCanvas(body, { width: PAGE_W / 2, height: PAGE_H / 2, pixelRatio: 2, backgroundColor: '#fff' });
      out.push(c);
      await rendition.next();
    }
  } finally { rendition.destroy(); book.destroy(); host.remove(); }
  return out;
}

export async function generatePreview(opts: {
  formatId: string; source: 'pdf' | 'epub'; file: Blob; from: number; count: number;
  coverUrl?: string | null; onProgress?: (msg: string) => void;
}) {
  const { formatId, source, file, from, count, coverUrl, onProgress } = opts;
  const pages: HTMLCanvasElement[] = [];
  if (coverUrl) { onProgress?.('Adding the cover…'); pages.push(await coverCanvas(coverUrl)); }
  const need = count - pages.length;
  onProgress?.(`Rendering ${need} page(s) from the ${source.toUpperCase()}…`);
  pages.push(...(source === 'pdf' ? await pdfPages(file, from, need) : await epubPages(file, from, need)));

  await supabase.from('preview_pages').delete().eq('format_id', formatId);
  const old = await supabase.storage.from('previews').list(formatId);
  if (old.data?.length) await supabase.storage.from('previews').remove(old.data.map((o) => `${formatId}/${o.name}`));

  const stamp = Date.now().toString(36);
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(`Saving page ${i + 1} of ${pages.length}…`);
    const blob = await toWebp(pages[i]);
    const path = `${formatId}/${stamp}-page-${i + 1}.webp`;
    const up = await supabase.storage.from('previews').upload(path, blob, { contentType: 'image/webp', upsert: true });
    if (up.error) throw up.error;
    const ins = await supabase.from('preview_pages').insert({ format_id: formatId, page_no: i + 1, path, width: pages[i].width, height: pages[i].height });
    if (ins.error) throw ins.error;
  }
  await supabase.from('formats').update({ preview_generated_at: new Date().toISOString() }).eq('id', formatId);
  return pages.length;
}
