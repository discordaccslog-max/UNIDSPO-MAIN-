/* United Dispo — Refund request endpoint.
 *
 * POST /api/refund-request
 *   Body: { orderNumber, firstName, lastName, email, reason }
 *
 * Sends two emails via Resend:
 *   1. Confirmation email to the customer — carries the exact PLEASE
 *      NOTE paragraph and the $50 store credit sentence that also
 *      appear on the refund-request submitted screen, so the
 *      customer sees the same wording in both places.
 *   2. Notification to the owner inbox (nstdispofficial@gmail.com)
 *      so refund requests don't get lost — with Reply-To set to the
 *      customer's email so clicking Reply responds to them directly.
 *
 * Validation + length caps + honeypot. No auth — public endpoint.
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = 'https://uniteddispo.com';
const FROM = 'United Dispo <orders@uniteddispo.com>';
const OWNER_INBOX = 'nstdispofficial@gmail.com';
const SUPPORT_PHONE_DISPLAY = '(954) 289-1648';
const SUPPORT_PHONE_E164 = '+19542891648';

const MAX_ORDER_NUMBER = 60;
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_REASON = 300;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/* --------------------------------------------------------------------
   Customer confirmation email — mirrors the brand chrome of the other
   templates (confirmation / tracking / follow-up) and surfaces the
   same wording from the on-page submitted screen.
   -------------------------------------------------------------------- */

function buildCustomerEmail({ firstName, orderNumber }) {
  const greeting = firstName ? `Hi ${esc(firstName)},` : 'Hello,';
  const orderLine = orderNumber
    ? `<p style="margin:0 0 18px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#FFD976;">Regarding Order ${esc(orderNumber)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Refund request approved</title>
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
  Your United Dispo refund request has been approved.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e10;">
<tr><td align="center" style="padding:28px 16px 48px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

    <tr>
      <td align="center" style="background:#000;border-bottom:1px solid rgba(212,175,55,0.28);padding:24px 32px;border-radius:12px 12px 0 0;">
        <a href="${SITE}" style="font-family:'Oswald',Arial,sans-serif;font-size:28px;font-weight:500;letter-spacing:0.14em;color:#fff;text-decoration:none;">UNITED DISPO</a>
      </td>
    </tr>

    <tr>
      <td style="background:#111113;padding:36px 32px 24px;text-align:left;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:52px;height:52px;border-radius:50%;background:rgba(212,175,55,0.12);text-align:center;vertical-align:middle;">
              <span style="display:inline-block;font-size:28px;line-height:52px;color:#FFD976;">&#x2713;</span>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 4px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#FFD976;">Refund Request Approved</p>
        <h1 style="margin:4px 0 14px;font-family:'Oswald',Arial,sans-serif;font-size:30px;font-weight:500;line-height:1.15;color:#fff;">Your refund is on the way.</h1>
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:15.5px;line-height:1.7;color:#C9CBD0;">${greeting} Your refund request has been successfully submitted. Our team will review your request and begin processing it shortly.</p>
      </td>
    </tr>

    ${orderLine ? `<tr><td style="background:#111113;padding:0 32px 8px;">${orderLine}</td></tr>` : ''}

    <!-- PLEASE NOTE block (mirrors the submitted-screen wording verbatim) -->
    <tr>
      <td style="background:#111113;padding:0 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17181A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;">
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 14px;font-family:'Figtree',Arial,sans-serif;font-size:15px;line-height:1.7;color:#E6E6E8;">
                <b style="color:#FFD976;letter-spacing:0.04em;">PLEASE NOTE:</b> Your refund may take up to 14 days to appear on your original payment method, depending on your bank or payment processor. Please understand that we have no control over these processing times, as they depend entirely on your bank or payment provider and how quickly they process the refund — we thank you for your understanding.
              </p>
              <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#C9CBD0;">
                Your <b style="color:#FFD976;">$50 store credit</b> will be emailed to the email on file after your refund has finished finalizing to your original payment method.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="background:#111113;padding:0 32px 36px;">
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:14px;line-height:1.7;color:#9EA0A6;">If you have any questions about your refund in the meantime, reply to this email or text us using the button below.</p>
      </td>
    </tr>

    <!-- support footer -->
    <tr>
      <td style="background:#111113;padding:28px 32px 36px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0 0 6px;font-family:'Figtree',Arial,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#9EA0A6;">24/7 Online Support</p>
        <p style="margin:0 0 14px;font-family:'Figtree',Arial,sans-serif;font-size:13.5px;line-height:1.55;color:#9EA0A6;">Questions about your refund? Our team is available around the clock via chat and text.</p>
        <a href="sms:${SUPPORT_PHONE_E164}?&body=Hi%2C%20I%20have%20a%20question%20about%20my%20United%20Dispo%20refund%20request." style="font-family:'Oswald',Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:0.8px;color:#FFD976;text-decoration:none;">${SUPPORT_PHONE_DISPLAY}</a>
        <br>
        <a href="sms:${SUPPORT_PHONE_E164}?&body=Hi%2C%20I%20have%20a%20question%20about%20my%20United%20Dispo%20refund%20request." style="display:inline-block;margin-top:14px;padding:12px 28px;border-radius:999px;border:1px solid #FFD700;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:'Oswald',Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">Text Us</a>
      </td>
    </tr>

    <tr>
      <td style="background:#0A0A0C;border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 12px 12px;padding:22px 32px;text-align:center;">
        <p style="margin:0 0 6px;font-family:'Oswald',Arial,sans-serif;font-size:18px;font-weight:500;letter-spacing:0.12em;color:rgba(255,255,255,0.4);">UNITED DISPO</p>
        <p style="margin:0;font-family:'Figtree',Arial,sans-serif;font-size:12px;color:#555;line-height:1.6;">
          You're receiving this because you submitted a refund request at <a href="${SITE}" style="color:#D4AF37;text-decoration:none;">uniteddispo.com</a>.<br>
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
   Owner notification email — plain, readable, carries all submission
   data so the admin can action it without logging in to Resend.
   -------------------------------------------------------------------- */

function buildOwnerEmail({ firstName, lastName, email, orderNumber, reason, ip, userAgent }) {
  const when = new Date().toISOString();
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#0e0e10;padding:18px 24px;">
    <p style="margin:0;color:#D4AF37;font-weight:700;letter-spacing:.14em;font-size:12px;text-transform:uppercase;">United Dispo &middot; New refund request</p>
  </td></tr>
  <tr><td style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      <tr><td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;width:140px;">Customer</td>
          <td style="padding:8px 0;color:#111;font-size:15px;">${esc(firstName)} ${esc(lastName)} &lt;<a href="mailto:${esc(email)}" style="color:#0A66C2;text-decoration:none;">${esc(email)}</a>&gt;</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Order number</td>
          <td style="padding:8px 0;color:#111;font-size:15px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(orderNumber)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Reason</td>
          <td style="padding:8px 0;color:#111;font-size:15px;">${esc(reason)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;vertical-align:top;">Submitted</td>
          <td style="padding:8px 0;color:#111;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(when)}</td></tr>
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#fafafa;border-radius:6px;border:1px solid #eee;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:#999;line-height:1.6;">
      IP: ${esc(ip)}<br>UA: ${esc(userAgent)}
    </div>
    <p style="margin:22px 0 0;color:#999;font-size:12px;line-height:1.5;">
      Reply directly to this email &mdash; it will go to the customer at
      <a href="mailto:${esc(email)}" style="color:#0A66C2;text-decoration:none;">${esc(email)}</a>.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[refund-request] RESEND_API_KEY missing');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  const body = req.body || {};
  const orderNumber = String(body.orderNumber || '').trim().slice(0, MAX_ORDER_NUMBER);
  const firstName   = String(body.firstName   || '').trim().slice(0, MAX_NAME);
  const lastName    = String(body.lastName    || '').trim().slice(0, MAX_NAME);
  const email       = String(body.email       || '').trim().slice(0, MAX_EMAIL);
  const reason      = String(body.reason      || '').trim().slice(0, MAX_REASON);
  const honey       = String(body.website     || ''); // honeypot

  // Honeypot — bots fill every field
  if (honey) {
    return res.status(200).json({ ok: true });
  }

  if (!orderNumber) return res.status(400).json({ error: 'Order number is required.' });
  if (!firstName)   return res.status(400).json({ error: 'First name is required.' });
  if (!lastName)    return res.status(400).json({ error: 'Last name is required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!reason)      return res.status(400).json({ error: 'Please select a reason.' });

  const ip =
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 300);

  // Fire both emails in parallel. If the customer email fails, we still
  // return 200 so the UI shows the submitted screen — the honest promise
  // of the form is "we received your request", not "we delivered an email
  // to you." If the owner email fails, we also don't fail the request,
  // but log it for investigation.
  const customerSend = resend.emails.send({
    from: FROM,
    to: email,
    subject: orderNumber
      ? `Refund request approved — Order ${orderNumber}`
      : `Your United Dispo refund request has been received`,
    html: buildCustomerEmail({ firstName, orderNumber }),
  }).catch(function (err) {
    console.error('[refund-request] customer email failed (non-fatal):', err && err.message);
    return null;
  });

  const ownerSend = resend.emails.send({
    from: FROM,
    to: OWNER_INBOX,
    reply_to: email,
    subject: `[UD Refund] ${firstName} ${lastName} · Order ${orderNumber}`,
    html: buildOwnerEmail({ firstName, lastName, email, orderNumber, reason, ip, userAgent }),
    text:
      `New refund request\n\n` +
      `Customer: ${firstName} ${lastName} <${email}>\n` +
      `Order: ${orderNumber}\n` +
      `Reason: ${reason}\n\n` +
      `---\nIP: ${ip}\nUA: ${userAgent}`,
  }).catch(function (err) {
    console.error('[refund-request] owner email failed (non-fatal):', err && err.message);
    return null;
  });

  await Promise.all([customerSend, ownerSend]);
  return res.status(200).json({ ok: true });
};
