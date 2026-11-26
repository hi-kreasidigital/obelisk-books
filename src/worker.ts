// Cloudflare Worker in front of the static site. Only /api/* runs here (run_worker_first); everything else is static.
// Phase 3: /api/geo — the visitor's country, used in the browser to *suggest* a language and pick the display
// currency. HTML is never changed by IP, so search engines see the same page as everyone else (roadmap §5.1–5.2).
interface Env { ASSETS: { fetch: (r: Request) => Promise<Response> } }

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', ...(init.headers ?? {}) } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/geo') {
      const cf = (request as any).cf ?? {};
      return json({ country: cf.country ?? request.headers.get('cf-ipcountry') ?? null, continent: cf.continent ?? null });
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
