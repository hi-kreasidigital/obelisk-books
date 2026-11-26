import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { supabase, slugify } from '../../lib/supabase';
import { useAdmin } from '../context';
import { useToast } from './kit';

const RichText = lazy(() => import('./RichText'));

export type TField = {
  name: string; label: string;
  type?: 'text' | 'textarea' | 'rich' | 'slug';
  required?: boolean; max?: number; hint?: string;
  slugFrom?: string;          // for type 'slug': field to derive from
};

type Row = Record<string, any>;

/** Per-language tabs for a *_translations table. English first; only enabled languages are shown. */
export function TranslationTabs({ table, fk, id, fields, onSaved }: {
  table: string; fk: string; id: string; fields: TField[]; onSaved?: () => void;
}) {
  const { enabledLangs, can } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState('en');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase.from(table as any) as any).select('*').eq(fk, id);
    if (error) return toast(error.message, 'error');
    const m: Record<string, Row> = {};
    for (const r of data ?? []) m[r.lang] = { ...r, __slugTouched: true }; // never overwrite a saved slug
    setRows(m); setDirty({});
  };
  useEffect(() => { load(); }, [table, id]);

  const row = rows[lang] ?? {};
  const set = (name: string, value: any) => {
    setRows((s) => {
      const r = { ...(s[lang] ?? { [fk]: id, lang, complete: false }), [name]: value };
      for (const f of fields) if (f.type === 'slug' && f.slugFrom === name && !s[lang]?.__slugTouched) r[f.name] = slugify(String(value ?? ''));
      if (name.endsWith('slug')) r.__slugTouched = true;
      return { ...s, [lang]: r };
    });
    setDirty((d) => ({ ...d, [lang]: true }));
  };

  const missingRequired = (r: Row) => fields.filter((f) => f.required && !String(r?.[f.name] ?? '').trim()).map((f) => f.label);

  const save = async () => {
    setSaving(true);
    const toSave = Object.entries(rows).filter(([l]) => dirty[l]).map(([, r]) => {
      const { __slugTouched, updated_at, updated_by, ...clean } = r;
      return clean;
    });
    for (const r of toSave) {
      const miss = missingRequired(r);
      if (miss.length) { setSaving(false); setLang(r.lang); return toast(`${r.lang.toUpperCase()}: fill in ${miss.join(', ')}`, 'error'); }
    }
    if (toSave.length) {
      const { error } = await (supabase.from(table as any) as any).upsert(toSave, { onConflict: `${fk},lang` });
      if (error) { setSaving(false); return toast(error.message.includes('unique') ? 'This slug is already used in this language — choose another.' : error.message, 'error'); }
    }
    setSaving(false); toast('Saved'); await load(); onSaved?.();
  };

  const status = (code: string) => {
    const r = rows[code];
    if (!r) return 'missing';
    return r.complete ? 'complete' : 'draft';
  };
  const dot = { complete: 'bg-teal', draft: 'bg-orange', missing: 'bg-gray-300' } as const;

  return (
    <div className="card">
      <div role="tablist" aria-label="Language" className="flex flex-wrap border-b border-line px-2">
        {enabledLangs.map((l) => (
          <button key={l.code} role="tab" aria-selected={lang === l.code} onClick={() => setLang(l.code)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px flex items-center gap-1.5 ${lang === l.code ? 'border-teal text-teal-text' : 'border-transparent text-muted'}`}>
            <span className={`w-2 h-2 rounded-full ${dot[status(l.code)]}`} aria-hidden />
            {l.code === 'en' ? 'English' : l.native_name}{dirty[l.code] ? ' •' : ''}
            <span className="sr-only"> ({status(l.code)})</span>
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {lang !== 'en' && rows.en && (
          <details className="text-sm bg-surface rounded p-2"><summary className="cursor-pointer text-muted">Show the English text</summary>
            <div className="mt-2 space-y-1">{fields.filter((f) => f.type !== 'slug').map((f) => (
              <div key={f.name}><b className="text-xs text-muted">{f.label}: </b>{f.type === 'rich' ? <span dangerouslySetInnerHTML={{ __html: rows.en[f.name] ?? '' }} /> : rows.en[f.name]}</div>))}</div>
          </details>
        )}
        {fields.map((f) => {
          const v = row[f.name] ?? '';
          const over = f.max && String(v).length > f.max;
          return (
            <div key={f.name}>
              <label className="label" htmlFor={`${table}-${lang}-${f.name}`}>{f.label}{f.required && ' *'}
                {f.max && <span className={`float-right font-normal ${over ? 'text-red-700' : ''}`}>{String(v).length}/{f.max}</span>}</label>
              {f.type === 'textarea' ? (
                <textarea id={`${table}-${lang}-${f.name}`} className="input min-h-24" value={v} disabled={!can.edit} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === 'rich' ? (
                <Suspense fallback={<div className="input min-h-40">Loading editor…</div>}>
                  <RichText key={`${lang}-${f.name}`} value={v} editable={can.edit} onChange={(html, json) => { set(f.name, html); if (f.name.endsWith('_html')) set(f.name.replace('_html', '_json'), json); }} />
                </Suspense>
              ) : (
                <input id={`${table}-${lang}-${f.name}`} className="input" value={v} disabled={!can.edit}
                  onChange={(e) => set(f.name, f.type === 'slug' ? slugify(e.target.value) : e.target.value)} />
              )}
              {f.hint && <p className="text-xs text-muted mt-1">{f.hint}</p>}
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!row.complete} disabled={!can.edit || !rows[lang]} onChange={(e) => set('complete', e.target.checked)} />
            Translation complete — show this language on the site
          </label>
          {can.edit && <button className="btn-primary" onClick={save} disabled={saving || !Object.values(dirty).some(Boolean)}>Save texts</button>}
        </div>
      </div>
    </div>
  );
}

/** Title/name per item in English (for lists). */
export function useEnglishNames(table: string, fk: string, field: string) {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    (supabase.from(table as any) as any).select(`${fk},${field}`).eq('lang', 'en').then(({ data }: any) => {
      const m: Record<string, string> = {};
      for (const r of data ?? []) m[r[fk]] = r[field];
      setMap(m);
    });
  }, [table]);
  return map;
}

export function useLangCompleteness(table: string, fk: string) {
  const [m, setM] = useState<Record<string, string[]>>({});
  useEffect(() => {
    (supabase.from(table as any) as any).select(`${fk},lang`).eq('complete', true).then(({ data }: any) => {
      const r: Record<string, string[]> = {};
      for (const x of data ?? []) (r[x[fk]] ??= []).push(x.lang);
      setM(r);
    });
  }, [table]);
  return m;
}

export function LangDots({ done }: { done: string[] }) {
  const { enabledLangs } = useAdmin();
  return (
    <span className="inline-flex gap-1" aria-label={`Complete: ${done.join(', ') || 'none'}`}>
      {enabledLangs.map((l) => (
        <span key={l.code} title={`${l.name_en}: ${done.includes(l.code) ? 'complete' : 'not complete'}`}
          className={`text-[10px] font-bold px-1 rounded ${done.includes(l.code) ? 'bg-teal-tint text-teal-text' : 'bg-gray-100 text-gray-400'}`}>
          {l.url_prefix || 'en'}
        </span>
      ))}
    </span>
  );
}
