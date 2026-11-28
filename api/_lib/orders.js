/* United Dispo — Order storage (Upstash Redis).
 *
 * Minimal persistence layer so every successful order shows up in
 * the admin UI without re-typing customer details.
 *
 * Data model:
 *   KEY  order:<orderNumber>    → full JSON record
 *   ZSET orders:index           → ordered by createdAt desc (member = orderNumber)
 *
 * Env var auto-detection (handles every Vercel integration naming scheme):
 *   Modern Upstash marketplace:
 *     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   Legacy @vercel/kv naming:
 *     KV_REST_API_URL + KV_REST_API_TOKEN
 *   Any prefix Vercel chose when connecting the store
 *   (e.g. unidspo_KV_REST_API_URL, STORAGE_KV_REST_API_URL):
 *     Scans process.env for *_REST_API_URL + the matching *_REST_API_TOKEN
 *
 * KV is optional — if no env vars found, every function degrades to
 * a no-op so the confirmation email flow keeps working.
 */

const { Redis } = require('@upstash/redis');

let _client = null;
let _initialized = false;
let _resolvedVars = null; // { urlName, tokenName } so diagnostics can report

function resolveEnv() {
  if (_resolvedVars) return _resolvedVars;
  const env = process.env;

  // Priority 1: explicit Upstash names
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    _resolvedVars = { urlName: 'UPSTASH_REDIS_REST_URL', tokenName: 'UPSTASH_REDIS_REST_TOKEN',
                      url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
    return _resolvedVars;
  }
  // Priority 2: legacy @vercel/kv names
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    _resolvedVars = { urlName: 'KV_REST_API_URL', tokenName: 'KV_REST_API_TOKEN',
                      url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN };
    return _resolvedVars;
  }
  // Priority 3: any *_REST_API_URL + matching *_REST_API_TOKEN (for
  // marketplace integrations that prefix the vars with the store name)
  const urlKeys = Object.keys(env).filter(k => k.endsWith('_REST_API_URL') && env[k]);
  for (const urlKey of urlKeys) {
    const prefix = urlKey.slice(0, -'_REST_API_URL'.length);
    const tokenKey = prefix + '_REST_API_TOKEN';
    if (env[tokenKey]) {
      _resolvedVars = { urlName: urlKey, tokenName: tokenKey, url: env[urlKey], token: env[tokenKey] };
      return _resolvedVars;
    }
  }
  // Priority 4: *_KV_URL / *_URL pattern from newer Upstash prefixes
  const altKeys = Object.keys(env).filter(k => (k.endsWith('_URL') || k === 'REDIS_URL') && env[k] && env[k].includes('upstash.io'));
  for (const urlKey of altKeys) {
    const prefix = urlKey.slice(0, -'_URL'.length);
    const tokenKey = prefix + '_TOKEN';
    if (env[tokenKey]) {
      _resolvedVars = { urlName: urlKey, tokenName: tokenKey, url: env[urlKey], token: env[tokenKey] };
      return _resolvedVars;
    }
  }
  _resolvedVars = null;
  return null;
}

function client() {
  if (_initialized) return _client;
  _initialized = true;
  const vars = resolveEnv();
  if (!vars) {
    console.warn('[orders] No Redis env vars found — persistence disabled.');
    return null;
  }
  try {
    _client = new Redis({ url: vars.url, token: vars.token });
    return _client;
  } catch (err) {
    console.warn('[orders] Redis client init failed:', err.message);
    return null;
  }
}

/**
 * Diagnostic — returns what we found (never leaks values, just key names).
 * Used by /api/admin/list-orders to tell the UI what the env looks like.
 */
function diagnose() {
  const vars = resolveEnv();
  const env = process.env;
  const kvLike = Object.keys(env).filter(k =>
    k.includes('UPSTASH') || k.includes('REDIS') || k.includes('KV_') || k.includes('_KV') ||
    k.includes('REST_API_URL') || k.includes('REST_API_TOKEN')
  ).sort();
  return {
    detected: vars ? { urlName: vars.urlName, tokenName: vars.tokenName } : null,
    matchingEnvKeys: kvLike,
  };
}

async function saveOrder(record) {
  const c = client();
  if (!c) return { ok: false, reason: 'kv_not_configured' };
  if (!record || !record.orderNumber) return { ok: false, reason: 'missing_order_number' };
  try {
    const key = `order:${record.orderNumber}`;
    const existing = await c.get(key);
    const merged = {
      ...record,
      tracking: (existing && existing.tracking) || record.tracking || null,
      followUp: (existing && existing.followUp) || record.followUp || null,
    };
    await c.set(key, merged);
    const score = typeof record.createdAt === 'number' ? record.createdAt : Date.now();
    await c.zadd('orders:index', { score, member: String(record.orderNumber) });
    return { ok: true, created: !existing };
  } catch (err) {
    console.error('[orders] saveOrder failed:', err);
    return { ok: false, reason: 'kv_error', message: err.message };
  }
}

async function listOrders({ limit = 100, offset = 0 } = {}) {
  const c = client();
  if (!c) return { ok: true, orders: [], total: 0, kvEnabled: false };
  try {
    const total = await c.zcard('orders:index');
    const ids = await c.zrange('orders:index', offset, offset + limit - 1, { rev: true });
    if (!ids || !ids.length) return { ok: true, orders: [], total, kvEnabled: true };
    const orders = await Promise.all(
      ids.map(async (id) => {
        const rec = await c.get(`order:${id}`);
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
  const c = client();
  if (!c) return { ok: false, reason: 'kv_not_configured' };
  if (!orderNumber) return { ok: false, reason: 'missing_order_number' };
  try {
    const key = `order:${orderNumber}`;
    const existing = await c.get(key);
    if (!existing) {
      const stub = { orderNumber, createdAt: Date.now(), synthetic: true, ...patch };
      await c.set(key, stub);
      await c.zadd('orders:index', { score: Date.now(), member: String(orderNumber) });
      return { ok: true, created: true };
    }
    const merged = { ...existing, ...patch };
    await c.set(key, merged);
    return { ok: true, created: false };
  } catch (err) {
    console.error('[orders] updateOrder failed:', err);
    return { ok: false, reason: 'kv_error', message: err.message };
  }
}

async function getOrder(orderNumber) {
  const c = client();
  if (!c) return null;
  try { return await c.get(`order:${orderNumber}`); }
  catch (err) { console.error('[orders] getOrder failed:', err); return null; }
}

async function deleteOrder(orderNumber) {
  const c = client();
  if (!c) return { ok: false, reason: 'kv_not_configured' };
  try {
    await c.del(`order:${orderNumber}`);
    await c.zrem('orders:index', String(orderNumber));
    return { ok: true };
  } catch (err) {
    console.error('[orders] deleteOrder failed:', err);
    return { ok: false, reason: 'kv_error', message: err.message };
  }
}

module.exports = { saveOrder, listOrders, updateOrder, getOrder, deleteOrder, diagnose };
