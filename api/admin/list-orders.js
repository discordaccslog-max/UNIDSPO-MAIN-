/* United Dispo — Admin orders list.
 *
 * GET /api/admin/list-orders
 *   Returns { ok, orders: [...], total, kvEnabled }
 *   Query params:
 *     limit  (default 100, max 500)
 *     offset (default 0)
 *
 * Auth: x-admin-key header must equal ADMIN_EMAIL_KEY env var.
 */

const { listOrders } = require('../_lib/orders');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = process.env.ADMIN_EMAIL_KEY;
  if (!adminKey) {
    return res.status(500).json({ error: 'Server misconfigured (missing admin key).' });
  }
  const providedKey = req.headers['x-admin-key'] || '';
  if (providedKey !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const q = req.query || {};
  let limit = parseInt(q.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  if (limit > 500) limit = 500;
  let offset = parseInt(q.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  const result = await listOrders({ limit, offset });
  return res.status(200).json(result);
};
