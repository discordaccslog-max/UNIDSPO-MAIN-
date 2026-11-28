/* United Dispo — Order storage (Vercel KV / Upstash Redis).
 *
 * Minimal persistence layer so every successful order shows up in
 * the admin UI without re-typing customer details.
 *
 * Data model:
 *   KEY  order:<orderNumber>    → full JSON record
 *   ZSET orders:index           → ordered by createdAt desc (member = orderNumber)
 *
 * Record shape:
 *   {
 *     orderNumber, createdAt,
 *     customer: { first, last, email, phone, address, apt, city, state, zip, country },
 *     item:     { title, variant, price, image },
 *     shipping: { method, price, estimate },
 *     subtotal, protectionPrice, shippingProtection, total,
 *     tracking: null | { number, carrier, sentAt, sendId },
 *     followUp: null | { sentAt, sendId }
 *   }
 *
 * KV is optional — if the env vars aren't configured, every function
 * degrades to a no-op/empty result so the rest of the flow keeps
 * working (the confirmation email still sends; the admin tab just
 * won't show historical orders until KV is enabled).
 */

let _kv = null;
let _kvInitialized = false;

function kv() {
  if (_kvInitialized) return _kv;
  _kvInitialized = true;
  // Either KV_REST_API_URL+KV_REST_API_TOKEN or the Upstash names work
  // through @vercel/kv's auto-detection.
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    console.warn('[orders] No KV env vars found — order persistence disabled.');
    return null;
  }
  try {
    const mod = require('@vercel/kv');
    _kv = mod.kv;
    return _kv;
  } catch (err) {
    console.warn('[orders] @vercel/kv load failed:', err.message);
    return null;
  }
}

async function saveOrder(record) {
  const client = kv();
  if (!client) return { ok: false, reason: 'kv_not_configured' };
  if (!record || !record.orderNumber) return { ok: false, reason: 'missing_order_number' };
  try {
    // Don't overwrite tracking/followUp if the order is being re-stored for any reason
    const existing = await client.get(`order:${record.orderNumber}`);
    const merged = {
      ...record,
      tracking: (existing && existing.tracking) || record.tracking || null,
      followUp: (existing && existing.followUp) || record.followUp || null,
    };
    await client.set(`order:${record.orderNumber}`, merged);
    const score = typeof record.createdAt === 'number' ? record.createdAt : Date.now();
    await client.zadd('orders:index', { score, member: String(record.orderNumber) });
    return { ok: true, created: !existing };
  } catch (err) {
    console.error('[orders] saveOrder failed:', err);
    return { ok: false, reason: 'kv_error', message: err.message };
  }
}

async function listOrders({ limit = 100, offset = 0 } = {}) {
  const client = kv();
  if (!client) return { ok: true, orders: [], total: 0, kvEnabled: false };
  try {
    const total = await client.zcard('orders:index');
    const ids = await client.zrange('orders:index', offset, offset + limit - 1, { rev: true });
    if (!ids || !ids.length) return { ok: true, orders: [], total, kvEnabled: true };
    // Batch-get all orders
    const orders = await Promise.all(
      ids.map(async (id) => {
        const rec = await client.get(`order:${id}`);
        return rec || { orderNumber: id, missing: true };
      })
    );
    return { ok: true, orders, total, kvEnabled: true };
  } catch (err) {
    console.error('[orders] listOrders failed:', err);
    return { ok: false, orders: [], total: 0, kvEnabled: true, reason: 'kv_error', message: err.message };
  }
}

async function updateOrder(orderNumber, patch) {
  const client = kv();
  if (!client) return { ok: false, reason: 'kv_not_configured' };
  if (!orderNumber) return { ok: false, reason: 'missing_order_number' };
  try {
    const existing = await client.get(`order:${orderNumber}`);
    if (!existing) {
      // Create a stub so the patch sticks even if the order was never auto-logged
      // (e.g. manual send from the Manual tab for an old pre-KV order)
      const stub = {
        orderNumber,
        createdAt: Date.now(),
        synthetic: true,
        ...patch,
      };
      await client.set(`order:${orderNumber}`, stub);
      await client.zadd('orders:index', { score: Date.now(), member: String(orderNumber) });
      return { ok: true, created: true };
    }
    const merged = { ...existing, ...patch };
    await client.set(`order:${orderNumber}`, merged);
    return { ok: true, created: false };
  } catch (err) {
    console.error('[orders] updateOrder failed:', err);
    return { ok: false, reason: 'kv_error', message: err.message };
  }
}

async function getOrder(orderNumber) {
  const client = kv();
  if (!client) return null;
  try {
    return await client.get(`order:${orderNumber}`);
  } catch (err) {
    console.error('[orders] getOrder failed:', err);
    return null;
  }
}

async function deleteOrder(orderNumber) {
  const client = kv();
  if (!client) return { ok: false, reason: 'kv_not_configured' };
  try {
    await client.del(`order:${orderNumber}`);
    await client.zrem('orders:index', String(orderNumber));
    return { ok: true };
  } catch (err) {
    console.error('[orders] deleteOrder failed:', err);
    return { ok: false, reason: 'kv_error', message: err.message };
  }
}

module.exports = { saveOrder, listOrders, updateOrder, getOrder, deleteOrder };
