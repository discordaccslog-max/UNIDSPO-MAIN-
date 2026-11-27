/* United Dispo — Admin email endpoint.
 *
 * Validates a shared admin key (env ADMIN_EMAIL_KEY) sent in the
 * x-admin-key header, then dispatches one of two templates via Resend:
 *
 *   - 'tracking'  → shipment tracking email with carrier + number
 *   - 'followup'  → freeform follow-up with a custom message body
 *
 * Triggered manually from /admin/send.html. Not reachable without the
 * admin key, and the admin page itself is marked noindex / robots-blocked.
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = 'https://uniteddispo.com';
const FROM = 'United Dispo <orders@uniteddispo.com>';
const SUPPORT_PHONE_DISPLAY = '(954) 289-1648';
const SUPPORT_PHONE_E164 = '+19542891648';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Turn a user-written message body into safe HTML:
 *  - escape everything
 *  - preserve blank lines as paragraph breaks
 *  - preserve single newlines as <br> */
function bodyToHtml(body) {
  const safe = esc(body || '');
  return safe
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;font-family:'Figtree',Arial,sans-serif;font-size:15.5px;line-height:1.7;color:#E6E6E8;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function trackingUrl(carrier, trackingNumber) {
  const t = encodeURIComponent(String(trackingNumber || '').trim());
  if (!t) return '';
  switch (String(carrier || '').toLowerCase()) {
    case 'usps':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case 'fedex':
      return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case 'ups':
      return `https://www.ups.com/track?tracknum=${t}`;
    case 'dhl':
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${t}`;
    default:
      return '';
  }
}

function carrierLabel(carrier) {
  switch (String(carrier || '').toLowerCase()) {
    case 'usps': return 'USPS';
    case 'fedex': return 'FedEx';
    case 'ups': return 'UPS';
    case 'dhl': return 'DHL';
    default: return esc(carrier || 'Carrier');
  }
}

/* --------------------------------------------------------------------
   Shared email chrome — same dark/gold brand as the order-confirm email.
   -------------------------------------------------------------------- */

function wrap({ preheader, headline, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(headline)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap');
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0; mso-table-rspace:0; }
  img { -ms-interpolation-mode:bicubic; border:0; display:block; }
  * { box-sizing:border-box; }
</style>
</head>
<body style="margin:0;padding:0;background:#0e0e10;font-family:'Figtree',Arial,sans-serif;">

<div style="display:none;font-size:1px;color:#0e0e10;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(preheader)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e10;">
<tr><td align="center" style="padding:28px 16px 48px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

    <tr>
      <td align="center" style="background:#000;border-bottom:1px solid rgba(212,175,55,0.28);padding:24px 32px;border-radius:12px 12px 0 0;">
        <a href="${SITE}" style="font-family:'Oswald',Arial,sans-serif;font-size:28px;font-weight:500;letter-spacing:0.14em;color:#fff;text-decoration:none;">UNITED DISPO</a>
      </td>
    </tr>

    ${bodyHtml}

    <!-- support footer -->
    <tr>
      <td style="background:#111113;padding:28px 32px 36px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0 0 6px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#9EA0A6;">24/7 Online Support</p>
        <p style="margin:0 0 14px;font-family:'Figtree',Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#9EA0A6;">Questions about your order? Our team is available around the clock via chat and text.</p>
        <a href="sms:${SUPPORT_PHONE_E164}?&body=Hi%2C%20I%20have%20a%20question%20about%20my%20United%20Dispo%20order." style="font-family:'Oswald',Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:0.8px;color:#FFD976;text-decoration:none;">${SUPPORT_PHONE_DISPLAY}</a>
        <br>
        <a href="sms:${SUPPORT_PHONE_E164}?&body=Hi%2C%20I%20have%20a%20question%20about%20my%20United%20Dispo%20order." style="display:inline-block;margin-top:14px;padding:12px 28px;border-radius:999px;border:1px solid #FFD700;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:'Oswald',Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">Text Us</a>
      </td>
    </tr>

    <tr>
      <td style="background:#0A0A0C;border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 12px 12px;padding:22px 32px;text-align:center;">
        <p style="margin:0 0 6px;font-family:'Oswald',Arial,sans-serif;font-size:18px;font-weight:500;letter-spacing:0.12em;color:rgba(255,255,255,0.4);">UNITED DISPO</p>
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:12px;color:#555;line-height:1.6;">
          You're receiving this because you placed an order at <a href="${SITE}" style="color:#D4AF37;text-decoration:none;">uniteddispo.com</a>.<br>
          &copy; ${new Date().getFullYear()} United Dispo. All rights reserved.
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}

/* --------------------------------------------------------------------
   Template: shipment tracking
   -------------------------------------------------------------------- */

function buildTrackingEmail({ firstName, orderNumber, carrier, trackingNumber, estimatedDelivery, shippingAddress }) {
  const trackUrl = trackingUrl(carrier, trackingNumber);
  const trackBtn = trackUrl
    ? `<a href="${trackUrl}" style="display:inline-block;margin-top:18px;padding:16px 36px;border-radius:999px;border:1px solid #FFD700;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:'Oswald',Arial,sans-serif;font-size:16px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">Track Your Package</a>`
    : '';

  const addrBlock = shippingAddress
    ? `<tr>
        <td colspan="2" style="padding:12px 0 0;border-top:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0 0 6px;font-family:'Figtree',Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#9EA0A6;">Shipping to</p>
          <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:14px;color:#E6E6E8;line-height:1.6;">${esc(shippingAddress).replace(/\n/g, '<br>')}</p>
        </td>
       </tr>`
    : '';

  const etaRow = estimatedDelivery
    ? `<tr>
        <td style="padding:5px 0 10px;color:#9EA0A6;font-size:13.5px;vertical-align:top;">Estimated delivery</td>
        <td style="padding:5px 0 10px;color:#fff;font-size:13.5px;font-weight:700;text-align:right;vertical-align:top;">${esc(estimatedDelivery)}</td>
       </tr>`
    : '';

  const body = `
    <tr>
      <td style="background:#111113;padding:36px 32px 28px;text-align:left;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:52px;height:52px;border-radius:50%;background:rgba(212,175,55,0.12);text-align:center;vertical-align:middle;">
              <span style="display:inline-block;font-size:24px;line-height:52px;color:#FFD976;">&#x2708;</span>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 4px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#FFD976;">${orderNumber ? `Order ${esc(orderNumber)} &middot; Shipped` : 'Shipped'}</p>
        <h1 style="margin:4px 0 10px;font-family:'Oswald',Arial,sans-serif;font-size:32px;font-weight:500;line-height:1.15;color:#fff;">Your order is on the way!</h1>
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:15px;line-height:1.65;color:#C9CBD0;">Your package has shipped via ${carrierLabel(carrier)}. You can track its progress with the button below.</p>
      </td>
    </tr>

    <tr>
      <td style="background:#111113;padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17181A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;">
          <tr>
            <td style="padding:22px 22px 18px;text-align:center;">
              <p style="margin:0 0 6px;font-family:'Figtree',Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#9EA0A6;">${carrierLabel(carrier)} Tracking Number</p>
              <p style="margin:0;font-family:'Oswald',Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:1px;color:#fff;word-break:break-all;">${esc(trackingNumber)}</p>
              ${trackBtn}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${(etaRow || addrBlock) ? `
    <tr>
      <td style="background:#111113;padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17181A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${etaRow}
                ${addrBlock}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}
  `;

  return wrap({
    preheader: orderNumber
      ? `Your United Dispo order ${orderNumber} has shipped — tracking inside.`
      : `Your United Dispo order has shipped — tracking inside.`,
    headline: orderNumber ? `Order ${orderNumber} shipped — United Dispo` : `Order shipped — United Dispo`,
    bodyHtml: body,
  });
}

/* --------------------------------------------------------------------
   Template: follow-up (ONE fixed template — lost-in-transit refund notice)

   Fully hardcoded. To change copy, edit the strings and HTML directly
   in buildFollowUpEmail below. Button links to the refund-request page
   at /refund-request (served as refund-request.html via cleanUrls).
   -------------------------------------------------------------------- */

const FOLLOWUP_SUBJECT = `[UNITED DISPO] Important Update Regarding Your United Dispo Order`;
const REFUND_URL = `${SITE}/refund-request`;

function buildFollowUpEmail({ firstName, orderNumber }) {
  const para = (text) =>
    `<p style="margin:0 0 16px;font-family:'Figtree',Arial,sans-serif;font-size:15.5px;line-height:1.7;color:#E6E6E8;">${text}</p>`;

  const paragraphs = [
    para(`We regret to inform you that your order appears to have been lost during transit. Unfortunately, the shipping carrier has not provided us with a reason for the loss. While we sincerely apologize for this inconvenience, shipping-related incidents are outside of our direct control and depend on the carrier's handling and delivery processes.`),
    para(`Please rest assured that you are eligible for a full refund. To proceed, please submit a refund request through the button below:`),
    `<div style="margin:22px 0 28px;text-align:center;">
       <a href="${REFUND_URL}" style="display:inline-block;padding:16px 36px;border-radius:999px;border:1px solid #FFD700;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:'Oswald',Arial,sans-serif;font-size:16px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">Submit Refund Request</a>
     </div>`,
    para(`Additionally, as compensation for the inconvenience, we have issued you a <b style="color:#FFD976;">$50 store credit</b>. Your store credit coupon can be applied once your refund request has been successfully submitted.`),
    para(`Once again, we sincerely apologize for this experience and appreciate your understanding. We hope to have the opportunity to serve you again in the future.`),
    `<p style="margin:28px 0 0;font-family:'Figtree',Arial,sans-serif;font-size:15.5px;line-height:1.7;color:#E6E6E8;">Regards,<br><b style="color:#fff;letter-spacing:0.04em;">UNITED DISPO LLC</b></p>`,
  ];

  const body = `
    <tr>
      <td style="background:#111113;padding:36px 32px 32px;text-align:left;">
        ${orderNumber ? `<p style="margin:0 0 18px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#FFD976;">Regarding Order ${esc(orderNumber)}</p>` : ''}
        ${paragraphs.join('')}
      </td>
    </tr>
  `;

  return {
    html: wrap({
      preheader: `An important update about your United Dispo order — refund available.`,
      headline: FOLLOWUP_SUBJECT,
      bodyHtml: body,
    }),
    subject: FOLLOWUP_SUBJECT,
  };
}

/* --------------------------------------------------------------------
   Handler
   -------------------------------------------------------------------- */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = process.env.ADMIN_EMAIL_KEY;
  if (!adminKey) {
    console.error('[admin-send] ADMIN_EMAIL_KEY env not set — refusing to send.');
    return res.status(500).json({ error: 'Server misconfigured (missing admin key).' });
  }

  const providedKey = req.headers['x-admin-key'] || '';
  if (providedKey !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const body = req.body || {};
  const {
    template,
    email,
    firstName,
    orderNumber,
    // tracking-specific
    carrier,
    trackingNumber,
    estimatedDelivery,
    shippingAddress,
  } = body;

  if (!email) return res.status(400).json({ error: 'Missing customer email.' });
  if (!template) return res.status(400).json({ error: 'Missing template.' });

  let html;
  let emailSubject;

  if (template === 'tracking') {
    if (!trackingNumber) return res.status(400).json({ error: 'Missing tracking number.' });
    html = buildTrackingEmail({
      firstName,
      orderNumber,
      carrier: carrier || 'USPS',
      trackingNumber,
      estimatedDelivery,
      shippingAddress,
    });
    emailSubject = orderNumber
      ? `Your United Dispo order ${orderNumber} has shipped`
      : `Your United Dispo order has shipped`;
  } else if (template === 'followup') {
    const built = buildFollowUpEmail({ firstName, orderNumber });
    html = built.html;
    emailSubject = built.subject;
  } else {
    return res.status(400).json({ error: `Unknown template: ${template}` });
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: email,
      subject: emailSubject,
      html,
    });
    return res.status(200).json({ ok: true, id: result && result.data && result.data.id });
  } catch (err) {
    console.error('[admin-send] Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email: ' + (err && err.message || 'unknown') });
  }
};
