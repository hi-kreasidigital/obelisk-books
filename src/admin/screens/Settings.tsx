import { useEffect, useState } from 'react';
import { supabase, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Loading, useToast } from '../ui/kit';

export function Settings() {
  const { can } = useAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<Tables<'settings'>[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => { supabase.from('settings').select('*').order('key').then(({ data }) => { setRows(data ?? []); setDraft(Object.fromEntries((data ?? []).map((r) => [r.key, JSON.stringify(r.value, null, 2)]))); }); }, []);
  if (!rows) return <Loading />;
  const save = async (key: string) => {
    let value: any;
    try { value = JSON.parse(draft[key]); } catch { return toast('Not valid JSON — check quotes and commas', 'error'); }
    const { error } = await supabase.from('settings').update({ value }).eq('key', key);
    toast(error ? error.message : 'Setting saved', error ? 'error' : 'ok');
  };
  const editable = (key: string) => can.owner || (can.edit && key.startsWith('homepage.'));
  return (
    <>
      <PageHeader title="Settings" sub="Store details and values used across the site and emails. Items marked CONFIRM still need the client's final value." />
      <div className="space-y-3">{rows.map((r) => (
        <div key={r.key} className="card p-3 grid gap-2 md:grid-cols-[260px_1fr_auto] items-start">
          <div><code className="text-sm font-semibold">{r.key}</code>{r.note && <p className={`text-xs mt-1 ${r.note.startsWith('CONFIRM') ? 'text-[#9a6200] font-semibold' : 'text-muted'}`}>{r.note}</p>}
            <p className="text-[11px] text-muted">{r.is_public ? 'Public (used by the website)' : 'Internal'}</p></div>
          <textarea className="input font-mono text-xs" rows={Math.min(8, draft[r.key]?.split('\n').length ?? 1)} aria-label={r.key}
            value={draft[r.key] ?? ''} disabled={!editable(r.key)} onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} />
          {editable(r.key) && <button className="btn" onClick={() => save(r.key)}>Save</button>}
        </div>))}</div>
      <p className="text-xs text-muted mt-3">Phase 8 adds the Bookvault connection panel here; legal texts are added in Phase 7.</p>
    </>
  );
}
