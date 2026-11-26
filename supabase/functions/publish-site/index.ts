// "Publish site" button → starts the GitHub Actions build + deploy (roadmap §3, Phase 3).
// Caller: a signed-in Owner or Editor (RLS on publish_runs decides). Secret: GITHUB_PUBLISH_TOKEN
// (fine-grained GitHub token for hi-kreasidigital/obelisk-books with "Contents: read and write").
import { createClient } from 'npm:@supabase/supabase-js@2';

const REPO = 'hi-kreasidigital/obelisk-books';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, key, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'not_signed_in' }, 401);

  // one build at a time: a queued/running run younger than 15 minutes is still in progress
  const { data: last } = await sb.from('publish_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (last && ['queued', 'running'].includes(last.status) && Date.now() - Date.parse(last.created_at) < 15 * 60_000) {
    return json({ error: 'already_running', run: last }, 409);
  }

  const { data: run, error } = await sb.from('publish_runs').insert({ triggered_by: user.id, status: 'queued', message: 'Publish button' }).select().single();
  if (error) return json({ error: 'not_allowed', message: error.message }, 403); // RLS: Owner and Editor only

  const token = Deno.env.get('GITHUB_PUBLISH_TOKEN');
  if (!token) {
    await sb.from('publish_runs').update({ status: 'failed', message: 'GITHUB_PUBLISH_TOKEN is not set in Supabase secrets', finished_at: new Date().toISOString() }).eq('id', run.id);
    return json({ error: 'not_configured' }, 503);
  }
  const gh = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'obelisk-publish' },
    body: JSON.stringify({ event_type: 'publish', client_payload: { run_id: run.id } }),
  });
  if (!gh.ok) {
    const msg = `GitHub refused the build (${gh.status}): ${(await gh.text()).slice(0, 200)}`;
    await sb.from('publish_runs').update({ status: 'failed', message: msg, finished_at: new Date().toISOString() }).eq('id', run.id);
    return json({ error: 'github_failed', message: msg }, 502);
  }
  return json({ run });
});
