import { getVapid } from '../lib/vapid.mjs';

export default async () => {
  const v = await getVapid();
  return Response.json({ key: v.publicKey }, { headers: { 'cache-control': 'no-store' } });
};

export const config = { path: '/api/vapid' };
