// Called by the GitHub Actions workflow to report build status (queued → running → success / failed).
// Authenticated with the workflow's GitHub OIDC token (no shared secret): issuer, audience and repository are checked.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

const REPO = 'hi-kreasidigital/obelisk-books';
const ISSUER = 'https://token.actions.githubusercontent.com';
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let claims: Record<string, unknown>;
  try {
    ({ payload: claims } = await jwtVerify(token, jwks, { issuer: ISSUER, audience: 'obelisk-publish' }));
  } catch {
    return json({ error: 'unauthorized' }, 401);
  }
  if (claims.repository !== REPO || claims.ref !== 'refs/heads/main') return json({ error: 'forbidden' }, 403);

  const body = await req.json().catch(() => ({}));
  const status = ['running', 'success', 'failed'].includes(body.status) ? body.status : null;
  if (!status) return json({ error: 'bad_status' }, 400);
  const url = typeof body.url === 'string' && body.url.startsWith(`https://github.com/${REPO}/`) ? body.url : null;
  const message = typeof body.message === 'string' ? body.message.slice(0, 300) : null;

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const patch = { status, github_run_url: url, ...(message ? { message } : {}), ...(status === 'running' ? {} : { finished_at: new Date().toISOString() }) };
  if (typeof body.run_id === 'string' && /^[0-9a-f-]{36}$/.test(body.run_id)) {
    const { error } = await sb.from('publish_runs').update(patch).eq('id', body.run_id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
  // builds not started from the dashboard (push, schedule): log them too, so the dashboard shows the latest deploy
  if (typeof body.github_run_id === 'string') {
    const { data: existing } = await sb.from('publish_runs').select('id').eq('github_run_url', url).maybeSingle();
    const { error } = existing
      ? await sb.from('publish_runs').update(patch).eq('id', existing.id)
      : await sb.from('publish_runs').insert({ ...patch, message: message ?? 'Automatic build' });
    if (error) return json({ error: error.message }, 500);
  }
  return json({ ok: true });
});
