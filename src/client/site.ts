// Small browser script shared by every public page (no framework). Pages stay fully usable without it.
// - currency display: Auto / EUR / USD (roadmap §5.1) — HTML always ships EUR, the same for everyone
// - IP language suggestion banner (§5.2) — suggests, never redirects
// - cart count + "Added to your cart" toast (cart/checkout logic arrives in Phase 4)
// - header search suggestions from the static per-language index (§5.7)
// - mobile menu, dropdowns, "Show more", format selector, ebook preview, newsletter placeholder
import { cartAdd, cartCount, onCart } from './cart';

type Cfg = {
  lang: string; locale: string; alternates: Record<string, string>; langs: { code: string; prefix: string; native: string }[];
  banner: Record<string, { text: string; sw: string; stay: string }>; search: string; searchPage: string; text: Record<string, string>;
};
const cfg: Cfg = JSON.parse(document.getElementById('site-config')!.textContent!);
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel as any) as T | null;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel as any)] as T[];
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// ---------------------------------------------------------------- geo (country from Cloudflare, via /api/geo)
let geoP: Promise<{ country: string | null }> | null = null;
function geo() {
  if (!geoP) {
    const cached = sessionStorage.getItem('ob.geo');
    geoP = cached ? Promise.resolve(JSON.parse(cached))
      : fetch('/api/geo', { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : { country: null }))
        .catch(() => ({ country: null })).then((g) => { try { sessionStorage.setItem('ob.geo', JSON.stringify(g)); } catch { /* */ } return g; });
  }
  return geoP;
}

// ---------------------------------------------------------------- currency
const EURO = new Set(['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK']);
const USD = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'EC', 'SV', 'PA', 'TL', 'FM', 'MH', 'PW']);
const LOCAL: Record<string, string> = {
  GB: 'GBP', CH: 'CHF', LI: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', IS: 'ISK', TR: 'TRY',
  CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', HK: 'HKD', SG: 'SGD', KR: 'KRW', IN: 'INR', ID: 'IDR', MY: 'MYR', TH: 'THB', PH: 'PHP',
  BR: 'BRL', MX: 'MXN', ZA: 'ZAR', IL: 'ILS',
};
type Mode = 'auto' | 'EUR' | 'USD';
const mode = (): Mode => (['auto', 'EUR', 'USD'].includes(store.get('ob.cur') ?? '') ? (store.get('ob.cur') as Mode) : 'auto');
const fmt = (cents: number, cur: string, frac = 2) =>
  new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cur, minimumFractionDigits: frac, maximumFractionDigits: frac }).format(cents / 100);
let rates: Promise<{ rates: Record<string, number> } | null> | null = null;
const getRates = () => (rates ??= fetch('/rates.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));

async function applyCurrency() {
  const m = mode();
  let show: 'EUR' | 'USD' = m === 'USD' ? 'USD' : 'EUR';
  let local: string | null = null;
  if (m === 'auto') {
    const { country } = await geo();
    if (country && USD.has(country)) show = 'USD';
    else if (country && !EURO.has(country) && LOCAL[country]) local = LOCAL[country];
  }
  for (const el of $$('[data-money]')) {
    const v = el.dataset[show === 'USD' ? 'usd' : 'eur'];
    if (v) el.textContent = fmt(Number(v), show);
  }
  let rate = 0;
  if (local) rate = (await getRates())?.rates?.[local] ?? 0;
  for (const el of $$('[data-approx]')) {
    el.textContent = rate ? cfg.text.approx.replace('{amount}', fmt(Math.round(Number(el.dataset.eur) * rate), local!, ['JPY', 'KRW', 'HUF', 'ISK', 'IDR'].includes(local!) ? 0 : 2)) : '';
  }
  const sym = show === 'USD' ? '$ USD' : '€ EUR';
  for (const el of $$('[data-cur-label]')) el.textContent = m === 'auto' ? `Auto · ${local ?? sym}` : sym;
  for (const r of $$<HTMLInputElement>('[data-cur]')) r.checked = r.value === m;
  for (const s of $$<HTMLSelectElement>('[data-cur-select]')) s.value = m;
  document.documentElement.dataset.currency = show;
}
document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.matches('[data-cur], [data-cur-select]')) { store.set('ob.cur', el.value); applyCurrency(); el.closest('details')?.removeAttribute('open'); }
  if (el.matches('[data-lang-select]')) location.href = el.value;
});

// ---------------------------------------------------------------- language suggestion banner
const COUNTRY_LANG: Record<string, string> = {
  FR: 'fr', MC: 'fr', LU: 'fr', DE: 'de', AT: 'de', LI: 'de', IT: 'it', SM: 'it', VA: 'it', BR: 'pt-BR', PT: 'pt-BR', AO: 'pt-BR', MZ: 'pt-BR',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  GB: 'en', US: 'en', IE: 'en', AU: 'en', NZ: 'en', CA: 'en',
};
function matchLang(tag: string) {
  const t = tag.toLowerCase();
  return cfg.langs.find((l) => l.code.toLowerCase() === t)?.code ?? cfg.langs.find((l) => t.split('-')[0] === l.code.split('-')[0].toLowerCase())?.code ?? null;
}
async function langBanner() {
  if (cfg.langs.length < 2 || store.get('ob.lang')) return; // the visitor already chose
  const { country } = await geo();
  let want = country ? COUNTRY_LANG[country] ?? null : null;
  if (want && !cfg.langs.some((l) => l.code === want)) want = null;
  want ??= (navigator.languages ?? []).map(matchLang).find(Boolean) ?? null;
  if (!want || want === cfg.lang || !cfg.alternates[want]) return;
  const b = $('#lang-banner'); const txt = cfg.banner[want];
  if (!b || !txt) return;
  $('[data-text]', b)!.textContent = txt.text;
  const a = $<HTMLAnchorElement>('[data-switch]', b)!;
  a.textContent = txt.sw; a.href = cfg.alternates[want]; a.hreflang = want; a.lang = want;
  a.addEventListener('click', () => store.set('ob.lang', want!));
  const stay = $('[data-stay]', b)!;
  stay.textContent = txt.stay; stay.lang = want;
  stay.addEventListener('click', () => { store.set('ob.lang', cfg.lang); b.hidden = true; });
  b.lang = want;
  b.hidden = false;
}
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('[data-lang-choice]');
  if (a) store.set('ob.lang', a.dataset.langChoice!);
});

// ---------------------------------------------------------------- cart count + toast
function renderCount() {
  const n = cartCount();
  for (const el of $$('[data-cart-count]')) { el.textContent = n ? String(n) : ''; el.dataset.count = String(n); }
  for (const el of $$('[data-cart-sr]')) el.textContent = n ? cfg.text.cartCount.replace('{count}', String(n)) : cfg.text.cart;
}
onCart(renderCount);
const toast = $('#toast')!;
let toastTimer = 0;
function showToast(title: string, label: string) {
  const cartHref = $<HTMLAnchorElement>('[data-cart-link]')?.href ?? '/cart';
  toast.innerHTML = '';
  const h = document.createElement('b'); h.textContent = cfg.text.added;
  const p = document.createElement('p'); p.textContent = `${title} · ${label}`;
  const row = document.createElement('div'); row.className = 'row';
  const go = document.createElement('a'); go.className = 'btn btn-teal'; go.href = cartHref; go.textContent = cfg.text.viewCart;
  const cont = document.createElement('button'); cont.type = 'button'; cont.className = 'btn'; cont.textContent = cfg.text.cont;
  cont.addEventListener('click', () => (toast.hidden = true));
  row.append(go, cont); toast.append(h, p, row); toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => (toast.hidden = true), 7000);
}
document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>('[data-add]');
  if (!btn) return;
  const d = btn.dataset;
  const qtyInput = btn.closest('form, [data-buy]')?.querySelector<HTMLInputElement>('[data-qty]');
  const id = d.add || btn.closest<HTMLElement>('[data-buy]')?.querySelector<HTMLInputElement>('input[name=format]:checked')?.value;
  if (!id) return;
  const src = id === d.add ? d : (btn.closest('[data-buy]')!.querySelector<HTMLInputElement>(`input[value="${id}"]`)!.dataset);
  cartAdd({ id, qty: Math.max(1, Number(qtyInput?.value ?? 1) || 1), title: src.title ?? d.title!, label: src.label ?? '', eur: Number(src.eur), usd: Number(src.usd), href: src.href ?? location.pathname });
  showToast(src.title ?? d.title!, src.label ?? '');
});

// ---------------------------------------------------------------- mobile menu, dropdowns, footer
const menu = $('#mobile-menu');
let lastFocus: HTMLElement | null = null;
const closeMenu = () => { if (!menu || menu.hidden) return; menu.hidden = true; document.body.style.overflow = ''; $$('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', 'false')); lastFocus?.focus(); };
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-menu-open]') && menu) {
    lastFocus = t.closest('[data-menu-open]') as HTMLElement;
    menu.hidden = false; document.body.style.overflow = 'hidden'; lastFocus.setAttribute('aria-expanded', 'true');
    $<HTMLElement>('[data-menu-close]', menu)?.focus();
  }
  if (t.closest('[data-menu-close]')) closeMenu();
  for (const d of $$<HTMLDetailsElement>('details.dropdown[open]')) if (!d.contains(t)) d.open = false;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeMenu();
  for (const d of $$<HTMLDetailsElement>('details.dropdown[open]')) { d.open = false; d.querySelector('summary')?.focus(); }
});
menu?.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const f = $$<HTMLElement>('a, button, input, select', menu);
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
  else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});
if (matchMedia('(max-width: 860px)').matches) $$<HTMLDetailsElement>('.site-footer details').forEach((d) => (d.open = false));

// ---------------------------------------------------------------- "Show more"
for (const c of $$('[data-clamp]')) {
  const body = $('.clamp-body', c)!; const btn = $<HTMLButtonElement>('button', c)!;
  if (body.scrollHeight < 340) { btn.remove(); continue; }
  c.dataset.clamped = 'true'; btn.hidden = false;
  btn.addEventListener('click', () => {
    const open = c.dataset.clamped === 'true';
    c.dataset.clamped = open ? 'false' : 'true';
    btn.textContent = open ? btn.dataset.less! : btn.dataset.more!;
    btn.setAttribute('aria-expanded', String(open));
  });
}

// ---------------------------------------------------------------- format selector (book page)
function syncFormat(root: HTMLElement) {
  const id = root.querySelector<HTMLInputElement>('input[name=format]:checked')?.value;
  for (const el of $$('[data-for-format]')) el.hidden = el.dataset.forFormat !== id;
  applyCurrency();
}
for (const root of $$('[data-buy]')) {
  if (location.hash === '#hardcover') { const hc = root.querySelector<HTMLInputElement>('input[data-type=hardcover]'); if (hc) hc.checked = true; }
  root.addEventListener('change', (e) => { if ((e.target as Element).matches('input[name=format]')) syncFormat(root); });
  syncFormat(root);
}
for (const q of $$('[data-qty-wrap]')) {
  const input = $<HTMLInputElement>('input', q)!;
  q.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-step]');
    if (b) input.value = String(Math.min(20, Math.max(1, (Number(input.value) || 1) + Number(b.dataset.step))));
  });
}

// ---------------------------------------------------------------- ebook preview (simple dialog; page-curl reader in Phase 4)
for (const dlg of $$<HTMLDialogElement>('dialog.reader')) {
  const pages = $$<HTMLImageElement>('img[data-src]', dlg);
  const label = $('[data-page-label]', dlg)!; const end = $('[data-end]', dlg)!; const stage = $('.stage', dlg)!;
  let i = 0;
  const show = () => {
    const atEnd = i >= pages.length;
    stage.hidden = atEnd; end.hidden = !atEnd;
    pages.forEach((p, n) => { const vis = n === i || n === i + 1; p.style.display = n === i ? 'block' : n === i + 1 ? '' : 'none'; if (vis && !p.src) p.src = p.dataset.src!; });
    label.textContent = atEnd ? '' : label.dataset.tpl!.replace('{current}', String(i + 1)).replace('{total}', String(pages.length));
  };
  const step = (d: number) => { i = Math.max(0, Math.min(pages.length, i + d)); show(); };
  $('[data-prev]', dlg)?.addEventListener('click', () => step(-1));
  $('[data-next]', dlg)?.addEventListener('click', () => step(1));
  stage.addEventListener('click', (e) => step((e as MouseEvent).offsetX < stage.clientWidth / 2 ? -1 : 1));
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  for (const open of $$(`[data-preview="${dlg.id}"]`)) open.addEventListener('click', () => { i = Number(open.dataset.page ?? 0); show(); dlg.showModal(); });
}

// ---------------------------------------------------------------- share / copy link
for (const b of $$<HTMLButtonElement>('[data-copy]')) b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); b.textContent = b.dataset.done!; } catch { /* */ }
});
for (const b of $$<HTMLButtonElement>('[data-share]')) {
  if (!('share' in navigator)) { b.remove(); continue; }
  b.addEventListener('click', () => navigator.share({ title: document.title, url: location.href }).catch(() => {}));
}

// ---------------------------------------------------------------- newsletter (double opt-in arrives in Phase 5)
for (const f of $$<HTMLFormElement>('[data-newsletter]')) f.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = $('[data-nl-msg]', f)!; const email = f.querySelector<HTMLInputElement>('input[type=email]')!;
  msg.textContent = email.checkValidity() ? cfg.text.soon : cfg.text.emailInvalid;
});

// ---------------------------------------------------------------- header search suggestions
type Entry = { t: 'b' | 'a' | 'p'; n: string; s?: string; u: string; i?: string; k: string };
let index: Promise<Entry[]> | null = null;
export const loadIndex = () => (index ??= fetch(cfg.search).then((r) => r.json()).catch(() => []));
export const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function searchIndex(entries: Entry[], q: string) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries.map((e) => {
    const name = norm(e.n); let score = 0;
    for (const w of words) {
      if (!e.k.includes(w)) return null;
      score += name.startsWith(w) ? 4 : name.includes(` ${w}`) ? 3 : name.includes(w) ? 2 : 1;
    }
    return { e, score };
  }).filter(Boolean).sort((a, b) => b!.score - a!.score).map((x) => x!.e);
}
for (const form of $$<HTMLFormElement>('form[data-search]')) {
  const input = $<HTMLInputElement>('input', form)!; const list = $<HTMLUListElement>('.suggest', form)!;
  let sel = -1;
  const render = async () => {
    const q = input.value.trim();
    if (q.length < 2) { list.hidden = true; input.removeAttribute('aria-expanded'); return; }
    const hits = searchIndex(await loadIndex(), q).slice(0, 5);
    list.innerHTML = '';
    hits.forEach((h, n) => {
      const li = document.createElement('li'); const a = document.createElement('a');
      a.href = h.u; a.id = `sg-${n}`; a.setAttribute('role', 'option');
      if (h.i) { const img = document.createElement('img'); img.src = h.i; img.alt = ''; img.width = 34; img.height = 48; a.append(img); }
      const span = document.createElement('span'); span.textContent = h.n;
      if (h.s) { const sm = document.createElement('small'); sm.textContent = h.s; span.append(sm); }
      a.append(span); li.append(a); list.append(li);
    });
    sel = -1; list.hidden = !hits.length; input.setAttribute('aria-expanded', String(!!hits.length));
  };
  input.addEventListener('focus', () => { loadIndex(); }, { once: true });
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    const items = $$<HTMLAnchorElement>('a', list);
    if (list.hidden || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, n) => a.setAttribute('aria-selected', String(n === sel))); input.setAttribute('aria-activedescendant', items[sel].id);
    } else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); location.href = items[sel].href; }
    else if (e.key === 'Escape') list.hidden = true;
  });
  document.addEventListener('click', (e) => { if (!form.contains(e.target as Node)) list.hidden = true; });
}

applyCurrency();
langBanner();
