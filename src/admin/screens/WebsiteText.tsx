import { useEffect, useMemo, useState } from 'react';
import { supabase, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Loading, useToast } from '../ui/kit';

type Key = Tables<'text_keys'>;
const PAGE = 60;

export function WebsiteText() {
  const { enabledLangs, can } = useAdmin();
  const toast = useToast();
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [tr, setTr] = useState<Record<string, Record<string, string>>>({}); // key -> lang -> value
  const [section, setSection] = useState<number | 0>(0);
  const [q, setQ] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const targets = enabledLangs.filter((l) => l.code !== 'en');
  const [shownLangs, setShownLangs] = useState<string[]>(() => targets.map((l) => l.code));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    (async () => {
      const k = await supabase.from('text_keys').select('*').is('removed_at', null).order('sort');
      const all: Tables<'text_translations'>[] = [];
      for (let from = 0; ; from += 1000) {           // PostgREST returns max 1000 rows per request
        const { data } = await supabase.from('text_translations').select('key, lang, value').range(from, from + 999);
        all.push(...((data as any) ?? []));
        if (!data || data.length < 1000) break;
      }
      const m: Record<string, Record<string, string>> = {};
      for (const t of all) (m[t.key] ??= {})[t.lang] = t.value;
      setTr(m); setKeys(k.data ?? []);
    })();
  }, []);

  const sections = useMemo(() => {
    const s = new Map<number, string>();
    for (const k of keys ?? []) s.set(k.section_no, k.section_title);
    return [...s.entries()];
  }, [keys]);

  if (!keys) return <Loading />;

  const filtered = keys.filter((k) => {
    if (section && k.section_no !== section) return false;
    if (q) {
      const hay = `${k.key} ${tr[k.key]?.en ?? ''} ${shownLangs.map((l) => tr[k.key]?.[l] ?? '').join(' ')}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (missingOnly && shownLangs.every((l) => tr[k.key]?.[l])) return false;
    return true;
  });

  const save = async (key: string, lang: string, value: string) => {
    const prev = tr[key]?.[lang] ?? '';
    if (value === prev) return;
    const id = `${key}|${lang}`;
    if (!value.trim()) {
      if (lang === 'en') return toast('The English source text cannot be empty', 'error');
      const { error } = await supabase.from('text_translations').delete().match({ key, lang });
      if (error) return toast(error.message, 'error');
    } else {
      const { error } = await supabase.from('text_translations').upsert({ key, lang, value }, { onConflict: 'key,lang' });
      if (error) { setErrors((e) => ({ ...e, [id]: error.message })); return; }
    }
    setErrors(({ [id]: _, ...rest }) => rest);
    setTr((t) => ({ ...t, [key]: { ...t[key], [lang]: value } }));
    if (lang === 'en') toast('English source changed — check the translations of this row');
  };

  const done = (lang: string) => keys.filter((k) => tr[k.key]?.[lang]).length;

  return (
    <>
      <PageHeader title="Website text" sub={`${keys.length} texts from obelisk-website-text-en.docx v1.3. Keep {placeholders} exactly as in English.`} />
      <div className="flex flex-wrap gap-3 mb-3 items-end">
        <label><span className="label">Section</span>
          <select className="input" value={section} onChange={(e) => { setSection(Number(e.target.value)); setLimit(PAGE); }}>
            <option value={0}>All sections</option>{sections.map(([n, t]) => <option key={n} value={n}>{n}. {t}</option>)}
          </select></label>
        <label className="grow max-w-sm"><span className="label">Search key or text</span>
          <input className="input" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} /></label>
        <label className="flex gap-2 text-sm pb-2"><input type="checkbox" checked={missingOnly} onChange={(e) => { setMissingOnly(e.target.checked); setLimit(PAGE); }} /> Missing only</label>
        <fieldset className="flex flex-wrap gap-2 text-sm pb-2"><legend className="sr-only">Languages to show</legend>
          {targets.map((l) => (
            <label key={l.code} className="flex gap-1 items-center">
              <input type="checkbox" checked={shownLangs.includes(l.code)} onChange={(e) => setShownLangs(e.target.checked ? [...shownLangs, l.code] : shownLangs.filter((x) => x !== l.code))} />
              {l.url_prefix.toUpperCase()} <span className="text-muted">{Math.round((done(l.code) / keys.length) * 100)}%</span>
            </label>))}
        </fieldset>
      </div>
      <p className="text-sm text-muted mb-2">{filtered.length} rows · changes are saved when you leave a field</p>
      <div className="card overflow-auto max-h-[75vh]">
        <table className="table">
          <thead><tr><th className="min-w-56">Key</th><th className="min-w-72">English (source)</th>
            {shownLangs.map((c) => <th key={c} className="min-w-72">{enabledLangs.find((l) => l.code === c)?.native_name}</th>)}</tr></thead>
          <tbody>
            {filtered.slice(0, limit).map((k) => (
              <tr key={k.key}>
                <td>
                  <code className="text-xs">{k.key}</code>
                  {k.note && <p className={`text-xs mt-1 ${k.needs_confirm ? 'text-[#9a6200] font-semibold' : 'text-muted'}`}>{k.note}</p>}
                  {k.max_length && !/max \d+ char/i.test(k.note ?? '') && <p className="text-xs text-muted">Max {k.max_length} characters</p>}
                </td>
                {['en', ...shownLangs].map((lang) => {
                  const v = tr[k.key]?.[lang] ?? '';
                  const err = errors[`${k.key}|${lang}`];
                  return (
                    <td key={lang} className={lang === 'en' ? 'bg-surface' : ''}>
                      <Cell value={v} lang={lang} max={k.max_length} disabled={!can.edit} invalid={!!err}
                        label={`${k.key} in ${lang}`} onSave={(val) => save(k.key, lang, val)} />
                      {err && <p className="text-xs text-red-700 mt-1" role="alert">{err}</p>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > limit && <div className="p-3 text-center"><button className="btn" onClick={() => setLimit(limit + PAGE)}>Show more ({filtered.length - limit} left)</button></div>}
      </div>
    </>
  );
}

function Cell({ value, onSave, max, disabled, invalid, label, lang }: { value: string; onSave: (v: string) => void; max: number | null; disabled: boolean; invalid: boolean; label: string; lang: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const over = max != null && v.length > max;
  return (
    <div>
      <textarea aria-label={label} lang={lang} rows={Math.min(6, Math.max(1, Math.ceil(v.length / 34)))} disabled={disabled}
        className={`input resize-y ${invalid ? 'border-red-600' : ''} ${!v && lang !== 'en' ? 'bg-orange-tint/40' : ''}`}
        value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onSave(v)} />
      {max != null && <span className={`text-[11px] ${over ? 'text-red-700 font-semibold' : 'text-muted'}`}>{v.length}/{max}{over ? ' — too long' : ''}</span>}
    </div>
  );
}
