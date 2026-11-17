import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

// só aceita endereços dos serviços de notificação conhecidos
const OK = /^https:\/\/(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

export default async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });
  let b;
  try { b = await req.json(); } catch (e) { return new Response('json inválido', { status: 400 }); }
  const sub = b && b.sub;
  if (!sub || typeof sub.endpoint !== 'string' || !OK.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return new Response('inscrição inválida', { status: 400 });
  }
  const events = (Array.isArray(b.events) ? b.events : [])
    .filter((e) => e && e.id && e.title && !isNaN(Date.parse(e.at)))
    .slice(0, 60)
    .map((e) => ({
      id: String(e.id).slice(0, 120),
      at: new Date(e.at).toISOString(),
      title: String(e.title).slice(0, 100),
      body: String(e.body || '').slice(0, 240),
    }));
  const store = getStore('subs');
  const key = createHash('sha256').update(sub.endpoint).digest('hex');
  const old = await store.get(key, { type: 'json' });
  const sent = {};
  events.forEach((e) => { if (old && old.sent && old.sent[e.id]) sent[e.id] = 1; });
  await store.setJSON(key, { sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, events, sent, updated: Date.now() });
  return Response.json({ ok: true, count: events.length });
};

export const config = { path: '/api/subscribe' };
