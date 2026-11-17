// Roda sozinha a cada 10 minutos e manda os avisos que já estão na hora.
import webpush from 'web-push';
import { getStore } from '@netlify/blobs';
import { getVapid } from '../lib/vapid.mjs';

export default async () => {
  const v = await getVapid();
  webpush.setVapidDetails(process.env.URL || 'https://example.com', v.publicKey, v.privateKey);
  const store = getStore('subs');
  const now = Date.now();
  const { blobs } = await store.list();
  for (const item of blobs) {
    const rec = await store.get(item.key, { type: 'json' });
    if (!rec) continue;
    let changed = false, gone = false;
    for (const e of rec.events || []) {
      const at = Date.parse(e.at);
      if (rec.sent[e.id] || at > now) continue;
      if (now - at > 36 * 3600 * 1000) { rec.sent[e.id] = 1; changed = true; continue; } // passou muito: não manda
      try {
        await webpush.sendNotification(rec.sub, JSON.stringify({ title: e.title, body: e.body, tag: e.id, url: './' }), { TTL: 6 * 3600 });
        rec.sent[e.id] = 1; changed = true;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) { gone = true; break; }
        console.log('falha ao enviar', err.statusCode || err.message);
      }
    }
    if (gone) await store.delete(item.key);
    else if (changed) await store.setJSON(item.key, rec);
  }
};

export const config = { schedule: '*/10 * * * *' };
