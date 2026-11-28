/* United Dispo — Manually delete a single order from KV.
 *
 * POST /api/admin/delete-order
 *   body: { orderNumber }
 *
 * Auth: x-admin-key header must equal ADMIN_EMAIL_KEY env var.
 *
 * Does NOT un-send any emails. Only removes the KV record so the
 * order stops appearing in the admin Orders tab. Intended for
 * clearing old test orders or orders that no longer need action
 * before they would otherwise be archived by the follow-up flow.
 */

const { deleteOrder } = require('../_lib/orders');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const orderNumber = req.body && req.body.orderNumber;
  if (!orderNumber) {
    return res.status(400).json({ error: 'Missing orderNumber' });
  }

  const result = await deleteOrder(orderNumber);
  if (!result.ok) {
    return res.status(500).json({ error: result.message || 'Delete failed', reason: result.reason });
  }
  return res.status(200).json({ ok: true });
};
