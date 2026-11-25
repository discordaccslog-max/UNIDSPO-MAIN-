const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = 'https://uniteddispo.com';
const FROM = 'United Dispo <orders@uniteddispo.com>';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

function absImg(src) {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  return SITE + '/' + src.replace(/^\//, '');
}

function buildEmail(order, orderNumber) {
  const c = order.customer;
  const item = order.item;
  const imgUrl = absImg(item.image);
  const addressLine2 = c.apt ? esc(c.apt) + '<br>' : '';
  const shipMethod = order.shipping.method === 'express' ? 'Express FedEx' : 'Standard USPS';
  const protRow = order.shippingProtection
    ? `<tr>
        <td style="padding:5px 0;color:#9EA0A6;font-size:14px;">Shipping protection</td>
        <td style="padding:5px 0;color:#E6E6E8;font-size:14px;text-align:right;">${fmt(order.protectionPrice)}</td>
       </tr>`
    : '';
  const shipCost = order.shipping.price > 0
    ? fmt(order.shipping.price)
    : '<span style="color:#7FD3A8;font-weight:700;">Free</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Order ${esc(orderNumber)} confirmed</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap');
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0; mso-table-rspace:0; }
  img { -ms-interpolation-mode:bicubic; border:0; display:block; }
  * { box-sizing:border-box; }
</style>
</head>
<body style="margin:0;padding:0;background:#0e0e10;font-family:'Figtree',Arial,sans-serif;">

<!-- pre-header -->
<div style="display:none;font-size:1px;color:#0e0e10;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  Order ${esc(orderNumber)} confirmed — your United Dispo order is on its way.
</div>

<!-- wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e10;">
<tr><td align="center" style="padding:28px 16px 48px;">

  <!-- card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

    <!-- header -->
    <tr>
      <td align="center" style="background:#000;border-bottom:1px solid rgba(212,175,55,0.28);padding:24px 32px;border-radius:12px 12px 0 0;">
        <a href="${SITE}" style="font-family:'Oswald',Arial,sans-serif;font-size:28px;font-weight:500;letter-spacing:0.14em;color:#fff;text-decoration:none;">UNITED DISPO</a>
      </td>
    </tr>

    <!-- hero -->
    <tr>
      <td style="background:#111113;padding:36px 32px 28px;text-align:left;">
        <!-- checkmark -->
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:52px;height:52px;border-radius:50%;background:rgba(212,175,55,0.12);text-align:center;vertical-align:middle;">
              <img src="${SITE}/images/email-check.png" alt="" width="26" height="26" style="display:inline-block;">
              <!--[if !mso]><!-->
              <span style="display:inline-block;font-size:22px;line-height:52px;color:#FFD976;">✓</span>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 4px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#FFD976;">Order ${esc(orderNumber)}</p>
        <h1 style="margin:4px 0 10px;font-family:'Oswald',Arial,sans-serif;font-size:34px;font-weight:500;line-height:1.15;color:#fff;">Thank you, ${esc(c.first)}!</h1>
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:15px;line-height:1.65;color:#C9CBD0;">Your order is confirmed. We'll send your tracking number as soon as it ships.</p>
      </td>
    </tr>

    <!-- divider -->
    <tr><td style="background:#111113;padding:0 32px;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td></tr>

    <!-- product -->
    <tr>
      <td style="background:#111113;padding:24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:76px;vertical-align:top;">
              ${imgUrl
                ? `<img src="${esc(imgUrl)}" alt="${esc(item.title)}" width="76" height="76" style="border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:#161718;object-fit:cover;">`
                : `<div style="width:76px;height:76px;border-radius:10px;background:#161718;border:1px solid rgba(255,255,255,0.08);"></div>`
              }
            </td>
            <td style="padding-left:16px;vertical-align:top;">
              <p style="margin:0 0 4px;font-family:'Figtree',Arial,sans-serif;font-size:14.5px;font-weight:700;line-height:1.35;color:#fff;">${esc(item.title)}</p>
              ${item.variant ? `<p style="margin:0 0 8px;font-family:'Figtree',Arial,sans-serif;font-size:13px;color:#9EA0A6;">${esc(item.variant)}</p>` : ''}
              <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:14.5px;font-weight:700;color:#fff;">${fmt(item.price)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- divider -->
    <tr><td style="background:#111113;padding:0 32px;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td></tr>

    <!-- price breakdown -->
    <tr>
      <td style="background:#111113;padding:20px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;color:#9EA0A6;font-size:14px;">Subtotal · 1 item</td>
            <td style="padding:5px 0;color:#E6E6E8;font-size:14px;text-align:right;">${fmt(order.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#9EA0A6;font-size:14px;">Shipping</td>
            <td style="padding:5px 0;font-size:14px;text-align:right;">${shipCost}</td>
          </tr>
          ${protRow}
          <tr>
            <td style="padding:14px 0 5px;border-top:1px solid rgba(255,255,255,0.1);">
              <span style="font-family:'Figtree',Arial,sans-serif;font-size:17px;font-weight:800;color:#fff;">Total</span>
            </td>
            <td style="padding:14px 0 5px;border-top:1px solid rgba(255,255,255,0.1);text-align:right;">
              <span style="font-family:'Oswald',Arial,sans-serif;font-size:24px;font-weight:500;color:#fff;letter-spacing:0.3px;">${fmt(order.total)}</span>
              <span style="font-family:'Figtree',Arial,sans-serif;font-size:11px;font-weight:600;color:#8E9096;margin-left:4px;letter-spacing:0.04em;">USD</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- delivery + address card -->
    <tr>
      <td style="background:#111113;padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17181A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:5px 0 10px;color:#9EA0A6;font-size:13.5px;width:120px;vertical-align:top;">Estimated delivery</td>
                  <td style="padding:5px 0 10px;color:#fff;font-size:13.5px;font-weight:700;text-align:right;vertical-align:top;">${esc(order.shipping.estimate)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0 10px;color:#9EA0A6;font-size:13.5px;vertical-align:top;">Shipping method</td>
                  <td style="padding:5px 0 10px;color:#fff;font-size:13.5px;font-weight:700;text-align:right;vertical-align:top;">${esc(shipMethod)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:10px 0 0;border-top:1px solid rgba(255,255,255,0.08);">
                    <p style="margin:0 0 6px;font-family:'Figtree',Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#9EA0A6;">Ship to</p>
                    <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:14px;color:#E6E6E8;line-height:1.6;">
                      ${esc(c.first)} ${esc(c.last)}<br>
                      ${esc(c.address)}<br>
                      ${addressLine2}${esc(c.city)}, ${esc(c.state)} ${esc(c.zip)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- support CTA -->
    <tr>
      <td style="background:#111113;padding:0 32px 36px;text-align:center;">
        <p style="margin:0 0 18px;font-family:'Figtree',Arial,sans-serif;font-size:14.5px;color:#9EA0A6;line-height:1.6;">Questions about your order? We're here to help.</p>
        <a href="${SITE}/contact.html" style="display:inline-block;padding:14px 36px;border-radius:999px;border:1px solid #FFD700;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:'Oswald',Arial,sans-serif;font-size:16px;font-weight:500;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">Contact Support</a>
      </td>
    </tr>

    <!-- footer -->
    <tr>
      <td style="background:#0A0A0C;border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 12px 12px;padding:22px 32px;text-align:center;">
        <p style="margin:0 0 6px;font-family:'Oswald',Arial,sans-serif;font-size:18px;font-weight:500;letter-spacing:0.12em;color:rgba(255,255,255,0.4);">UNITED DISPO</p>
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:12px;color:#555;line-height:1.6;">
          You're receiving this because you placed an order at <a href="${SITE}" style="color:#D4AF37;text-decoration:none;">uniteddispo.com</a>.<br>
          © ${new Date().getFullYear()} United Dispo. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
  <!-- /card -->

</td></tr>
</table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order, orderNumber } = req.body || {};

  if (!order || !orderNumber) {
    return res.status(400).json({ error: 'Missing order data' });
  }

  const email = order.customer && order.customer.email;
  if (!email) {
    return res.status(400).json({ error: 'Missing customer email' });
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Order ${orderNumber} confirmed — United Dispo`,
      html: buildEmail(order, orderNumber)
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-confirmation error:', err);
    return res.status(500).json({ error: 'Failed to send confirmation email' });
  }
};
