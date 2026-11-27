/* United Dispo — Contact form endpoint.
 *
 * Receives { name, email, subject, message } POST from contact.html's
 * submit handler. Sends one email to the UnitedDispo inbox via Resend,
 * with Reply-To set to the customer so hitting Reply in Gmail goes
 * straight back to them.
 *
 * Basic validation + length caps + honeypot to blunt scrapers.
 * Does NOT confirm to the customer — this is a one-way inbox feed.
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'United Dispo Contact <orders@uniteddispo.com>';
const TO   = 'nstdispofficial@gmail.com';

/* Reasonable hard caps so pasted log dumps / scraper floods don't
 * blow the function up. These are deliberately generous for real
 * humans. */
const MAX_NAME    = 120;
const MAX_EMAIL   = 200;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function bodyToHtml(body) {
  return esc(body)
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function buildEmail({ name, email, subject, message, ip, userAgent }) {
  const when = new Date().toISOString();
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">

  <tr><td style="background:#0e0e10;padding:18px 24px;">
    <p style="margin:0;color:#D4AF37;font-weight:700;letter-spacing:.14em;font-size:12px;text-transform:uppercase;">United Dispo &middot; New contact form submission</p>
  </td></tr>

  <tr><td style="padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      <tr>
        <td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;width:110px;">From</td>
        <td style="padding:8px 0;color:#111;font-size:15px;">${esc(name)} &lt;<a href="mailto:${esc(email)}" style="color:#0A66C2;text-decoration:none;">${esc(email)}</a>&gt;</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Subject</td>
        <td style="padding:8px 0;color:#111;font-size:15px;">${esc(subject) || '<span style="color:#999;">(none)</span>'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;vertical-align:top;">Received</td>
        <td style="padding:8px 0;color:#111;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(when)}</td>
      </tr>
    </table>

    <div style="border-top:1px solid #eee;padding-top:18px;">
      <p style="margin:0 0 12px;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Message</p>
      ${bodyToHtml(message)}
    </div>

    <div style="margin-top:28px;padding:14px 16px;background:#fafafa;border-radius:6px;border:1px solid #eee;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:#999;line-height:1.6;">
      IP: ${esc(ip)}<br>
      UA: ${esc(userAgent)}
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
    console.error('[contact] RESEND_API_KEY missing');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  const body = req.body || {};
  const name    = String(body.name    || '').trim().slice(0, MAX_NAME);
  const email   = String(body.email   || '').trim().slice(0, MAX_EMAIL);
  const subject = String(body.subject || '').trim().slice(0, MAX_SUBJECT);
  const message = String(body.message || '').trim().slice(0, MAX_MESSAGE);
  const honey   = String(body.website || ''); // honeypot — real users leave empty

  // Honeypot — bots fill every field including hidden ones
  if (honey) {
    // Pretend success so scrapers don't retry
    return res.status(200).json({ ok: true });
  }

  if (!name)    return res.status(400).json({ error: 'Name is required.' });
  if (!email)   return res.status(400).json({ error: 'Email is required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!message) return res.status(400).json({ error: 'Message is required.' });

  const ip =
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 300);

  const emailSubject = subject
    ? `[UD Contact] ${subject} — from ${name}`
    : `[UD Contact] New message from ${name}`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: TO,
      reply_to: email,
      subject: emailSubject,
      html: buildEmail({ name, email, subject, message, ip, userAgent }),
      text:
        `New contact form submission\n\n` +
        `From: ${name} <${email}>\n` +
        `Subject: ${subject || '(none)'}\n\n` +
        `${message}\n\n---\nIP: ${ip}\nUA: ${userAgent}`,
    });
    return res.status(200).json({ ok: true, id: result?.data?.id });
  } catch (err) {
    console.error('[contact] Resend error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please try again or email us directly.' });
  }
};
