// Chaves que identificam o servidor do Whalist junto aos serviços de notificação.
// São criadas sozinhas na primeira vez e guardadas no armazenamento da Netlify.
import { getStore } from '@netlify/blobs';
import { generateKeyPairSync } from 'node:crypto';

export async function getVapid() {
  const store = getStore('config');
  let v = await store.get('vapid', { type: 'json' });
  if (!v) {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = privateKey.export({ format: 'jwk' });
    const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
    await store.setJSON('vapid', { publicKey: pub.toString('base64url'), privateKey: jwk.d });
    v = await store.get('vapid', { type: 'json' });
  }
  return v;
}
