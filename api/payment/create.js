// United Dispo — Muadata payment creation endpoint (Vercel serverless function).
//
// Receives { customer, item, shipping, total } POST from the browser's
// uni:place-order handler, validates the 9 required billing fields,
// re-verifies price server-side from js/uni-product-catalog.json, signs
// the Muadata request, posts to the gateway, returns { url } with the
// hosted linkform URL for the browser to redirect to.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ------------------------------------------------------------------
// Catalog loader (reads js/uni-product-catalog.json, cached across invocations)
// ------------------------------------------------------------------

let CATALOG = null;
function loadCatalog() {
  if (CATALOG) return CATALOG;
  const p = path.join(process.cwd(), 'js', 'uni-product-catalog.json');
  const raw = fs.readFileSync(p, 'utf-8');
  const data = JSON.parse(raw);
  const map = new Map();
  for (const product of data.products || []) {
    const slug = product.handle;
    if (!slug) continue;
    const title = product.title;
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      // Single-price product with no variants
      map.set(slug + '||', {
        title,
        price: parseFloat(product.price),
      });
      continue;
    }
    for (const v of product.variants) {
      map.set(slug + '||' + (v.title || ''), {
        title: v.title ? `${title} — ${v.title}` : title,
        price: parseFloat(v.price != null ? v.price : product.price),
      });
    }
  }
  CATALOG = map;
  return map;
}

function lookup(slug, variant) {
  const cat = loadCatalog();
  // Try with variant first, then without (simple products are stored with '')
  const key1 = slug + '||' + (variant || '');
  if (cat.has(key1)) return cat.get(key1);
  const key2 = slug + '||';
  if (cat.has(key2)) return cat.get(key2);
  return null;
}

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { MUADATA_GATEWAY_URL, MUADATA_API_USER, MUADATA_PRIVATE_KEY, MUADATA_WEBSITE, MUADATA_SITE_B_URL, NEXT_PUBLIC_SITE_URL } = process.env;
  for (const [k, v] of Object.entries({ MUADATA_GATEWAY_URL, MUADATA_API_USER, MUADATA_PRIVATE_KEY, MUADATA_WEBSITE, MUADATA_SITE_B_URL, NEXT_PUBLIC_SITE_URL })) {
    if (!v) {
      console.error(`[ud-create] Missing env: ${k}`);
      return res.status(500).json({ error: 'Payment system not configured.' });
    }
  }

  // Body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const customer = body.customer || {};
  const item = body.item || {};
  const shippingMethod = typeof body.shippingMethod === 'string' ? body.shippingMethod : 'standard';

  // Customer validation — 9 required fields; names match checkout.html's form ids
  // (first, last, email, phone, address, city, state, zip). Country is 'US' by design.
  const required = ['first', 'last', 'email', 'phone', 'address', 'city', 'state', 'zip'];
  const billing = {};
  for (const f of required) {
    const v = typeof customer[f] === 'string' ? customer[f].trim() : '';
    if (!v) return res.status(400).json({ error: 'Please fill in every billing field.' });
    billing[f] = v;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  billing.apt = typeof customer.apt === 'string' ? customer.apt.trim() : '';
  billing.country = 'US';  // hardcoded in the checkout form

  // Item + price validation
  const slug = typeof item.slug === 'string' ? item.slug.trim() : '';
  const variant = typeof item.variant === 'string' ? item.variant.trim() : '';
  let qty = parseInt(item.qty, 10);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  if (qty > 99) qty = 99;

  const product = lookup(slug, variant);
  if (!product) {
    return res.status(400).json({ error: 'That product is no longer available.' });
  }

  const unit = product.price;
  const subtotal = unit * qty;

  // Shipping — server authoritative
  const EXPRESS_PRICE = 5.99;
  const shipPrice = shippingMethod === 'express' ? EXPRESS_PRICE : 0;

  // Optional protection
  const PROTECTION_PRICE = 1.99;
  const wantsProtection = body.shippingProtection === true || body.shippingProtection === 'true';
  const protectionPrice = wantsProtection ? PROTECTION_PRICE : 0;

  const order_total = subtotal + shipPrice + protectionPrice;
  if (order_total <= 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  // Build order_product with one line (+ optional protection + shipping as flat lines so processor sees totals match)
  const order_product = [{
    name: product.title,
    model: variant ? `${slug}-${variant.toLowerCase().replace(/\s+/g, '-')}` : slug,
    price: unit.toFixed(2),
    quantity: qty,
    option: [],
    weight: 0,
    products_image: '',  // Never leak image URLs
  }];
  if (shipPrice > 0) {
    order_product.push({
      name: 'Express shipping (FedEx)',
      model: 'ship-express',
      price: shipPrice.toFixed(2),
      quantity: 1,
      option: [],
      weight: 0,
      products_image: '',
    });
  }
  if (protectionPrice > 0) {
    order_product.push({
      name: 'Shipping protection',
      model: 'ship-protection',
      price: protectionPrice.toFixed(2),
      quantity: 1,
      option: [],
      weight: 0,
      products_image: '',
    });
  }

  // Order ID — UD_ prefix + 28 hex chars = 31 chars (A-Z/a-z/0-9/_ only, Muadata-safe)
  const order_id = 'UD_' + crypto.randomBytes(14).toString('hex');
  const order_currency = 'USD';
  const order_amount = order_total.toFixed(2);

  // Sign: MD5(api_user + private_key + currency + amount + order_id)
  const sign = crypto
    .createHash('md5')
    .update(MUADATA_API_USER + MUADATA_PRIVATE_KEY + order_currency + order_amount + order_id)
    .digest('hex');

  // Vt token for notify URL: MD5(order_id + private_key)
  const vt = crypto
    .createHash('md5')
    .update(order_id + MUADATA_PRIVATE_KEY)
    .digest('hex');

  // Site B URIs with URL-encoded ?back= pointing to this Site A (Section 17 Phase 7)
  const back_success = encodeURIComponent(`${NEXT_PUBLIC_SITE_URL}/order-success.html`);
  const back_failed = encodeURIComponent(`${NEXT_PUBLIC_SITE_URL}/order-failed.html`);
  const order_success_uri = `${MUADATA_SITE_B_URL}/order-success?back=${back_success}`;
  const order_return_uri = `${MUADATA_SITE_B_URL}/order-failed?back=${back_failed}`;
  const order_notify_uri = `${NEXT_PUBLIC_SITE_URL}/api/payment/notify?vt=${vt}`;

  // Client IP — CF-Connecting-IP > first of X-Forwarded-For > fallback
  const fwd = req.headers['x-forwarded-for'];
  const ip =
    req.headers['cf-connecting-ip'] ||
    (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') ||
    '0.0.0.0';

  // Combine address + apt for Muadata's billing_address1 (which has no address2)
  const address1 = billing.apt ? `${billing.address} ${billing.apt}` : billing.address;

  const params = new URLSearchParams({
    order_id,
    order_currency,
    order_amount,
    order_product: JSON.stringify(order_product),
    pay: 'nolimit',
    api_user: MUADATA_API_USER,
    website: MUADATA_WEBSITE,
    sign,
    ip,
    lan: 'en-US',
    user_agent: req.headers['user-agent'] || 'Mozilla/5.0',
    billing_first_name: billing.first,
    billing_last_name: billing.last,
    billing_email: billing.email,
    billing_phone: billing.phone,
    billing_address1: address1,
    billing_city: billing.city,
    billing_state: billing.state,
    billing_zip: billing.zip,
    billing_country: billing.country,
    shipping_first_name: billing.first,
    shipping_last_name: billing.last,
    shipping_email: billing.email,
    shipping_phone: billing.phone,
    shipping_address1: address1,
    shipping_city: billing.city,
    shipping_state: billing.state,
    shipping_zip: billing.zip,
    shipping_country: billing.country,
    order_return_uri,
    order_success_uri,
    order_notify_uri,
    reorder: 'reorder',
    jump: '1',
  });

  let muadataRaw;
  try {
    const r = await fetch(MUADATA_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    muadataRaw = await r.text();
  } catch (err) {
    console.error('[ud-create] Muadata fetch error:', err.message);
    return res.status(502).json({ error: 'Payment could not be processed. Please try again.' });
  }

  // Parse Muadata response — JSON or URL-encoded
  let linkform = null;
  const trimmed = muadataRaw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      linkform = data.linkform || null;
    } catch { /* fall through */ }
  } else {
    const parsed = new URLSearchParams(trimmed);
    linkform = parsed.get('linkform');
  }

  if (!linkform) {
    console.error('[ud-create] Muadata rejected:', trimmed.slice(0, 400));
    return res.status(500).json({ error: 'Payment could not be processed. Please try again.' });
  }

  return res.status(200).json({ url: linkform, order_id });
}
