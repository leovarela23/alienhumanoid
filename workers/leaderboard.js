async function verifyTurnstile(token, ip, secret) {
  if (!secret) return { ok: false, reason: 'Missing Turnstile secret' };
  if (!token) return { ok: false, reason: 'Missing Turnstile token' };

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });

  const data = await response.json();
  return {
    ok: !!data?.success,
    reason: data?.['error-codes']?.join(', ') || 'Verification failed'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = new Set([
      'https://www.leo-varela.com',
      'https://leo-varela.com',
      'https://dev.leo-varela.com'
    ]);
    const corsOrigin = origin && allowedOrigins.has(origin) ? origin : null;
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (corsOrigin) {
      headers['Access-Control-Allow-Origin'] = corsOrigin;
      headers['Vary'] = 'Origin';
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const key = 'wormhole-snake-top5';

    if (request.method === 'GET') {
      const current = await env.KV.get(key, 'json') || [];
      return new Response(JSON.stringify({ scores: current }), { headers });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const verifiedOrigin = origin && allowedOrigins.has(origin);
      if (!verifiedOrigin) {
        return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers });
      }

      const verification = await verifyTurnstile(body?.turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
      if (!verification.ok) {
        return new Response(JSON.stringify({ error: 'Verification failed', detail: verification.reason }), { status: 403, headers });
      }

      const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 24) || 'Anonymous';
      const score = Math.floor(Number(body?.score));
      if (!Number.isFinite(score) || score <= 0 || score > 500) {
        return new Response(JSON.stringify({ error: 'Invalid score' }), { status: 400, headers });
      }

      const cooldownKey = `cooldown:${ip}`;
      const lastSubmission = Number(await env.KV.get(cooldownKey) || 0);
      const now = Date.now();
      const cooldownMs = 15000;
      if (lastSubmission && now - lastSubmission < cooldownMs) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers });
      }

      const current = await env.KV.get(key, 'json') || [];
      current.push({ name, score });
      current.sort((a, b) => b.score - a.score);
      const top5 = current.slice(0, 5);

      await env.KV.put(key, JSON.stringify(top5));
      await env.KV.put(cooldownKey, String(now), { expirationTtl: 60 });
      return new Response(JSON.stringify({ scores: top5 }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }
};
