// POST /api/white-paper  (2026-10-19)
// White paper demand test: log the request in D1, send the requester a double opt-in email
// with a signed one-time link, and notify Matthew. Uses the same Resend account and sender
// as functions/api/contact.js.
// Bindings: WP_DB (D1). Secrets: RESEND_API_KEY (existing), WP_SIGNING_SECRET (new).
// Vars: WP_NOTIFY_TO (default matthew@nthlayer.co.uk), SITE_URL (default https://nthlayer.co.uk),
//       WP_TEST_ONLY ("1" = accept only WP_TEST_EMAIL, default matthewdewstowe@gmail.com).

const FROM = 'The Nth Layer <hello@nthlayer.co.uk>';
const LOGO = '/images/nthlayer-email-logo.png';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const json = (body, status = 200) => Response.json(body, { status });

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendEmail(env, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, ...payload }),
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

export function optInEmail({ site, name, link }) {
  const first = esc(name.split(' ')[0] || name);
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Confirm your email</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#F7F6F3;">
<div style="display:none;max-height:0;overflow:hidden;">Confirm your email address to receive the white paper when it is ready.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F3;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E6E2DA;border-radius:16px;">
<tr><td style="padding:32px 36px 8px 36px;"><img src="${site}${LOGO}" width="150" height="66" alt="The Nth Layer" style="display:block;border:0;width:150px;height:66px;"></td></tr>
<tr><td style="padding:20px 36px 0 36px;font-family:Manrope,'Helvetica Neue',Arial,sans-serif;color:#252423;">
<p style="margin:0 0 6px 0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6B6862;"><span style="display:inline-block;width:8px;height:8px;background:#BFFF00;margin-right:8px;vertical-align:1px;"></span>White paper</p>
<h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-.02em;color:#252423;">Confirm Your Email</h1>
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#4A4842;">Hello ${first},</p>
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#4A4842;">Thank you for requesting the white paper from The Nth Layer. Please confirm your email address so it can be sent to you as soon as it is ready.</p>
</td></tr>
<tr><td style="padding:10px 36px 6px 36px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#BFFF00;border-radius:999px;">
<a href="${esc(link)}" style="display:inline-block;padding:15px 30px;font-family:Manrope,'Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:700;color:#141414;text-decoration:none;border-radius:999px;">Confirm email address</a>
</td></tr></table></td></tr>
<tr><td style="padding:14px 36px 30px 36px;font-family:Manrope,'Helvetica Neue',Arial,sans-serif;">
<p style="margin:0 0 12px 0;font-size:13px;line-height:1.6;color:#6B6862;">This link works once and expires in 7 days. If the button does not work, copy this address into your browser:<br><a href="${esc(link)}" style="color:#252423;word-break:break-all;">${esc(link)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#6B6862;">If you did not request this, you can ignore this email and nothing further will be sent.</p>
</td></tr></table>
<p style="margin:18px 0 0 0;font-family:Manrope,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:#8A867E;">The Nth Layer &middot; <a href="${site}/" style="color:#8A867E;">nthlayer.co.uk</a> &middot; <a href="${site}/privacy/" style="color:#8A867E;">Privacy</a></p>
</td></tr></table></body></html>`;
  const text = `Hello ${name.split(' ')[0] || name},\n\nThank you for requesting the white paper from The Nth Layer. Please confirm your email address so it can be sent to you as soon as it is ready:\n\n${link}\n\nThis link works once and expires in 7 days. If you did not request this, you can ignore this email and nothing further will be sent.\n\nThe Nth Layer\n${site}/`;
  return { subject: 'Confirm your email for The Nth Layer white paper', html, text };
}

export function notifyEmail(row, status) {
  const rows = [['Name', row.name], ['Email', row.email], ['Company', row.company], ['Job title', row.job_title], ['Source', row.source], ['Requested', row.created_at], ['Confirmed', status]];
  const html = `<div style="font-family:Manrope,'Helvetica Neue',Arial,sans-serif;color:#252423;max-width:560px;"><p style="font-size:16px;margin:0 0 12px;"><b>White paper download</b> (${esc(status)})</p><table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">${rows.map(([k, v]) => `<tr><td style="color:#6B6862;border-bottom:1px solid #eee;">${k}</td><td style="border-bottom:1px solid #eee;">${esc(v)}</td></tr>`).join('')}</table></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { html, text };
}

export async function onRequestPost({ request, env, waitUntil }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot
  const row = {
    id: crypto.randomUUID(),
    name: clean(b.name, 120), email: clean(b.email, 200).toLowerCase(),
    company: clean(b.company, 160), job_title: clean(b.jobtitle ?? b.job_title, 160),
    source: clean(b.source || 'home', 40), created_at: new Date().toISOString(),
  };
  if (!row.name || !row.company || !row.job_title || !EMAIL_RE.test(row.email)) return json({ ok: false, error: 'Please complete every field with a valid email address.' }, 400);
  const testOnly = String(env.WP_TEST_ONLY || '') === '1';
  const testEmail = (env.WP_TEST_EMAIL || 'matthewdewstowe@gmail.com').toLowerCase();
  if (testOnly && row.email !== testEmail) return json({ ok: false, error: 'Requests are paused during testing.' }, 403);
  if (!env.WP_DB || !env.WP_SIGNING_SECRET || !env.RESEND_API_KEY) return json({ ok: false, error: 'Not configured.' }, 500);

  // light abuse limit: at most 3 requests per email per 24 hours
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = await env.WP_DB.prepare('SELECT COUNT(*) AS n FROM wp_requests WHERE email = ? AND created_at > ?').bind(row.email, since).first();
  if (recent && recent.n >= 3) return json({ ok: true }); // quietly accept, no more email

  await env.WP_DB.prepare('INSERT INTO wp_requests (id,name,email,company,job_title,source,created_at,confirmed_at) VALUES (?,?,?,?,?,?,?,NULL)')
    .bind(row.id, row.name, row.email, row.company, row.job_title, row.source, row.created_at).run();

  const site = (env.SITE_URL || 'https://nthlayer.co.uk').replace(/\/$/, '');
  const exp = Date.now() + 7 * 864e5;
  const sig = await sign(env.WP_SIGNING_SECRET, `${row.id}.${row.email}.${exp}`);
  const link = `${site}/white-paper/confirm/?id=${row.id}&e=${exp}&s=${sig}`;
  try {
    await sendEmail(env, { to: [row.email], ...optInEmail({ site, name: row.name, link }) });
  } catch (e) {
    return json({ ok: false, error: 'The request could not be sent. Please try again in a moment.' }, 502);
  }
  const n = notifyEmail(row, 'not yet');
  waitUntil(sendEmail(env, { to: [env.WP_NOTIFY_TO || 'matthew@nthlayer.co.uk'], reply_to: row.email, subject: `White paper download: ${row.name}, ${row.company}`, ...n }).catch(() => {}));
  return json({ ok: true });
}
