// United Dispo — Muadata server-to-server callback endpoint.
//
// Muadata POSTs here (form-encoded) with is_success + order_id after a
// payment resolves. The ?vt=<hex> query param = MD5(order_id + private_key).
// We recompute and compare in constant time. On valid notification, return
// literal "200" (plain string body) per Section 4 — anything else can cause
// Muadata to retry.
//
// United Dispo sells physical goods, so no fulfillment automation runs here
// (no license keys, no digital delivery). The notification is logged and ack'd.

import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { MUADATA_PRIVATE_KEY } = process.env;
  if (!MUADATA_PRIVATE_KEY) {
    console.error('[ud-notify] Missing MUADATA_PRIVATE_KEY env.');
    return res.status(500).send('server misconfigured');
  }

  let body = req.body;
  if (typeof body === 'string') {
    const parsed = new URLSearchParams(body);
    body = Object.fromEntries(parsed.entries());
  } else if (!body || typeof body !== 'object') {
    body = {};
  }

  const order_id = typeof body.order_id === 'string' ? body.order_id : '';
  const is_success = String(body.is_success || '');

  if (!order_id) {
    console.warn('[ud-notify] Missing order_id.');
    return res.status(400).send('missing order_id');
  }

  const got = typeof req.query.vt === 'string' ? req.query.vt : '';
  const expected = crypto
    .createHash('md5')
    .update(order_id + MUADATA_PRIVATE_KEY)
    .digest('hex');

  if (got.length !== expected.length) {
    console.warn('[ud-notify] vt length mismatch for', order_id);
    return res.status(403).send('forbidden');
  }
  const gotBuf = Buffer.from(got, 'utf-8');
  const expBuf = Buffer.from(expected, 'utf-8');
  if (!crypto.timingSafeEqual(gotBuf, expBuf)) {
    console.warn('[ud-notify] vt mismatch for', order_id);
    return res.status(403).send('forbidden');
  }

  console.log(`[ud-notify] ${is_success === '1' ? 'success' : 'failure'} order_id=${order_id}`);

  // Section 4 requires literal "200" body for Muadata to consider it processed.
  res.status(200).send('200');
}
