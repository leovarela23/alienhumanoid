export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8'
    };

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

      const name = String(body?.name || '').trim().slice(0, 24) || 'Anonymous';
      const score = Number(body?.score);
      if (!Number.isFinite(score) || score <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid score' }), { status: 400, headers });
      }

      const current = await env.KV.get(key, 'json') || [];
      current.push({ name, score: Math.floor(score) });
      current.sort((a, b) => b.score - a.score);
      const top5 = current.slice(0, 5);
      await env.KV.put(key, JSON.stringify(top5));
      return new Response(JSON.stringify({ scores: top5 }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }
};
