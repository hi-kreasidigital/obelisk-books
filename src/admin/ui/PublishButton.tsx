// "Publish site": starts the build through the Edge Function publish-site and shows the latest build status.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from './kit';

type Run = { id: string; status: 'queued' | 'running' | 'success' | 'failed'; created_at: string; finished_at: string | null; message: string | null; github_run_url: string | null };
const LABEL = { queued: 'Waiting to build…', running: 'Building…', success: 'Live', failed: 'Build failed' } as const;
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString();
};

export function PublishButton() {
  const toast = useToast();
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => supabase.from('publish_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => setRun(data as Run | null));
  useEffect(() => { load(); }, []);
  const active = run && (run.status === 'queued' || run.status === 'running') && Date.now() - Date.parse(run.created_at) < 15 * 60_000;
  useEffect(() => { if (!active) return; const t = setInterval(load, 8000); return () => clearInterval(t); }, [active]);

  const publish = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('publish-site', { method: 'POST' });
    setBusy(false);
    if (error) {
      let msg = error.message;
      try { const b = await (error as any).context?.json(); msg = b?.error === 'already_running' ? 'A build is already running — your changes will be included if they were saved before it started.' : b?.message ?? b?.error ?? msg; } catch { /* */ }
      toast(`Publish: ${msg}`, 'error');
    } else {
      toast('Publishing started. The site updates in about 2–4 minutes.', 'ok');
      setRun((data as any).run);
    }
    load();
  };
  const when = run ? ago(run.finished_at ?? run.created_at) : '';
  return (
    <div className="flex items-center gap-2">
      {run && (
        <span className={`text-xs hidden md:inline ${run.status === 'failed' ? 'text-red-700' : 'text-muted'}`} title={run.message ?? ''}>
          {run.github_run_url ? <a className="underline" href={run.github_run_url} target="_blank" rel="noopener">{LABEL[run.status]}</a> : LABEL[run.status]} · {when}
        </span>
      )}
      <button className="btn-primary" onClick={publish} disabled={busy || !!active}>{active ? 'Publishing…' : 'Publish site'}</button>
    </div>
  );
}
