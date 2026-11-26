import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/* ---------- toasts ---------- */
type Toast = { id: number; text: string; kind: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === 'error' ? 8000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`rounded-md px-4 py-2 text-sm shadow-lg max-w-md ${t.kind === 'error' ? 'bg-red-700 text-white' : 'bg-ink text-white'}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- layout bits ---------- */
export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

export function Field({ label, hint, children, error }: { label: string; hint?: ReactNode; children: ReactNode; error?: string | null }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-700 mt-1">{error}</span>}
    </label>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Loading() {
  return <div className="p-8 text-muted">Loading…</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-8 text-center text-muted">{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    published: 'bg-teal-tint text-teal-text', draft: 'bg-gray-100 text-gray-700', hidden: 'bg-orange-tint text-ink',
    available: 'bg-teal-tint text-teal-text', preorder: 'bg-orange-tint text-ink', out_of_print: 'bg-gray-100 text-gray-700',
  };
  return <span className={`badge ${c[status] ?? 'bg-gray-100'}`}>{status.replace(/_/g, ' ')}</span>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-auto" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-2xl mt-12 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const confirmDelete = (what: string) => window.confirm(`Delete ${what}? This can't be undone.`);
