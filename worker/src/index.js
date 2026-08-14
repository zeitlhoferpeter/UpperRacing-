const ALLOWED_HOSTS = new Set(['stardesignracing.com', 'www.stardesignracing.com']);
const APP_ORIGINS = new Set([
  'https://zeitlhoferpeter.github.io'
]);

function corsHeaders(origin) {
  const allowOrigin = APP_ORIGINS.has(origin) ? origin : 'https://zeitlhoferpeter.github.io';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function allowedTarget(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname) ? u : null;
  } catch (_) {
    return null;
  }
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'UpperRacing Stardesign Proxy' }, 200, origin);
    }
    if (url.pathname !== '/proxy') return json({ error: 'Not found' }, 404, origin);

    const target = allowedTarget(url.searchParams.get('url') || '');
    if (!target) return json({ error: 'Only HTTPS URLs from stardesignracing.com are allowed' }, 400, origin);

    try {
      const upstream = await fetch(target.toString(), {
        redirect: 'follow',
        headers: {
          'User-Agent': 'UpperRacing/1.0 (+GitHub Pages)',
          'Accept': 'application/pdf,text/html;q=0.9,*/*;q=0.8'
        }
      });

      if (!upstream.ok) {
        return json({ error: 'Stardesign returned HTTP ' + upstream.status }, 502, origin);
      }

      const headers = new Headers(corsHeaders(origin));
      headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
      const length = upstream.headers.get('Content-Length');
      if (length) headers.set('Content-Length', length);
      headers.set('Cache-Control', 'public, max-age=300');
      headers.set('X-Content-Type-Options', 'nosniff');

      return new Response(upstream.body, { status: 200, headers });
    } catch (err) {
      return json({ error: 'Upstream fetch failed', detail: String(err && err.message || err) }, 502, origin);
    }
  }
};
