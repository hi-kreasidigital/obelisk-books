// Browser cart (localStorage). Phase 4 adds server-side price checks, discounts and Stripe Checkout on top.
export type Line = { id: string; qty: number; title: string; label: string; eur: number; usd: number; href: string };
const KEY = 'ob.cart';
const subs: (() => void)[] = [];
export function cartLines(): Line[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function save(lines: Line[]) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export const cartCount = () => cartLines().reduce((n, l) => n + l.qty, 0);
export function cartAdd(line: Line) {
  const lines = cartLines();
  const ex = lines.find((l) => l.id === line.id);
  if (ex) ex.qty = Math.min(20, ex.qty + line.qty); else lines.push(line);
  save(lines);
}
export function cartSet(id: string, qty: number) {
  save(cartLines().map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0));
}
export function onCart(f: () => void) {
  subs.push(f); f();
  addEventListener('storage', (e) => { if (e.key === KEY) f(); });
}
