// POST /api/white-paper/confirm  body {id,e,s}  (2026-10-19, delivery email added 2026-10-20)
// Called by the button on /white-paper/confirm/ (the link in the email opens that page).
// A POST from a button, not a GET, so corporate link scanners that prefetch links
// cannot confirm on the reader's behalf and inflate the count.
// Verifies the signed one-time link, sets confirmed_at once, sends the white paper to the
// registrant (first confirmation only, never on reuse) and notifies the owner.
// Vars: WP_FILE_URL (default SITE_URL + /white-paper/Nth-Layer-AI-Native-SDLC-White-Paper.pdf),
//       WP_BOOK_URL (default SITE_URL + /#contact, which opens the call booking form),
//       WP_ATTACH ("0" = link only), WP_ATTACH_MAX_BYTES (default 5000000).
const FROM = 'The Nth Layer <hello@nthlayer.co.uk>';
const PDF_NAME = 'Nth-Layer-AI-Native-SDLC-White-Paper.pdf';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

async function resend(env, payload, idem) {
  const h = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
  if (idem) h['Idempotency-Key'] = idem;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: h, body: JSON.stringify({ from: FROM, ...payload }) });
  if (!r.ok) throw new Error('resend ' + r.status);
  return r;
}

export function deliveryEmail({ site, name, fileUrl, bookUrl }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'there';
  const F = "Manrope,'Helvetica Neue',Arial,sans-serif";
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Your copy: The AI-Native Software Development Lifecycle</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#F7F6F3;">
<div style="display:none;max-height:0;overflow:hidden;">Your copy of the white paper, plus a 12-week route to an AI-native SDLC.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F3;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E6E2DA;border-radius:16px;overflow:hidden;">
<tr><td style="padding:32px 36px 8px 36px;"><img src="${site}/images/nthlayer-email-logo.png" width="150" height="66" alt="The Nth Layer" style="display:block;border:0;width:150px;height:66px;"></td></tr>
<tr><td style="padding:20px 36px 0 36px;font-family:${F};color:#252423;">
<p style="margin:0 0 6px 0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6B6862;"><span style="display:inline-block;width:8px;height:8px;background:#BFFF00;margin-right:8px;vertical-align:1px;"></span>White paper</p>
<h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-.02em;color:#252423;">The AI-Native Software Development Lifecycle</h1>
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#4A4842;">Hello ${esc(first)},</p>
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#4A4842;">Thank you for confirming your email. Here is your copy of the white paper.</p>
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#4A4842;">It covers why faster, AI-written code is not reaching customers any sooner, and sets out a 12-week route to an AI-native SDLC.</p>
</td></tr>
<tr><td style="padding:10px 36px 6px 36px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#BFFF00;border-radius:999px;">
<a href="${esc(fileUrl)}" style="display:inline-block;padding:15px 30px;font-family:${F};font-size:16px;font-weight:700;color:#141414;text-decoration:none;border-radius:999px;">Download the white paper (PDF)</a>
</td></tr></table></td></tr>
<tr><td style="padding:12px 36px 28px 36px;font-family:${F};">
<p style="margin:0;font-size:13px;line-height:1.6;color:#6B6862;">If the button does not work, copy this address into your browser:<br><a href="${esc(fileUrl)}" style="color:#252423;word-break:break-all;">${esc(fileUrl)}</a></p>
</td></tr>
<tr><td style="background:#141414;padding:26px 36px;font-family:${F};">
<p style="margin:0 0 6px 0;font-size:17px;line-height:1.4;font-weight:600;color:#ffffff;">Want to talk it through?</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#C9C6BF;">A short call to see where the paper applies to your team. No deck.</p>
<a href="${esc(bookUrl)}" style="display:inline-block;padding:11px 22px;font-family:${F};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border:1.5px solid #BFFF00;border-radius:999px;">Book 30 minutes with Matthew</a>
</td></tr>
<tr><td style="padding:22px 36px 28px 36px;font-family:${F};">
<p style="margin:0;font-size:15px;line-height:1.6;color:#4A4842;">Nth Layer</p>
</td></tr></table>
<p style="margin:18px 0 0 0;font-family:${F};font-size:12px;line-height:1.6;color:#8A867E;">You are receiving this because you requested the white paper at <a href="${site}/" style="color:#8A867E;">nthlayer.co.uk</a> &middot; <a href="${site}/privacy/" style="color:#8A867E;">Privacy</a></p>
</td></tr></table></body></html>`;
  const text = `Hello ${first},

Thank you for confirming your email. Here is your copy of the white paper.

It covers why faster, AI-written code is not reaching customers any sooner, and sets out a 12-week route to an AI-native SDLC.

Download the white paper (PDF):
${fileUrl}

Want to talk it through? Book 30 minutes with Matthew:
${bookUrl}

Nth Layer

You are receiving this because you requested the white paper at nthlayer.co.uk. Privacy: ${site}/privacy/`;
  return { subject: 'Your copy: The AI-Native Software Development Lifecycle', html, text };
}

// Attach the PDF only if it is reachable, a PDF and small enough; otherwise link only.
async function attachment(env, fileUrl) {
  if (String(env.WP_ATTACH || '') === '0') return null;
  const max = Number(env.WP_ATTACH_MAX_BYTES || 5e6);
  try {
    const r = await fetch(fileUrl, { method: 'HEAD' });
    const len = Number(r.headers.get('content-length') || 0), type = r.headers.get('content-type') || '';
    if (!r.ok || !/pdf/i.test(type) || !len || len > max) return null;
    return [{ filename: PDF_NAME, path: fileUrl, content_type: 'application/pdf' }]; // Resend fetches the file itself
  } catch { return null; }
}

export async function deliver(env, row, site) {
  const fileUrl = env.WP_FILE_URL || `${site}/white-paper/${PDF_NAME}`;
  const bookUrl = env.WP_BOOK_URL || `${site}/#contact`;
  const mail = { to: [row.email], ...deliveryEmail({ site, name: row.name, fileUrl, bookUrl }) };
  const att = await attachment(env, fileUrl);
  if (att) {
    try { await resend(env, { ...mail, attachments: att }, `wp-deliver-${row.id}`); return 'attached'; } catch {}
  }
  await resend(env, mail, `wp-deliver-${row.id}-link`);
  return 'link';
}

export async function onRequestPost({ request, env, waitUntil }) {
  const go = (state) => Response.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
  let b = {}; try { b = await request.json(); } catch {}
  const id = String(b.id || ''), e = String(b.e || ''), s = String(b.s || '');
  if (!id || !e || !s || !env.WP_DB || !env.WP_SIGNING_SECRET) return go('invalid');
  const row = await env.WP_DB.prepare('SELECT * FROM wp_requests WHERE id = ?').bind(id).first();
  if (!row) return go('invalid');
  const good = same(await sign(env.WP_SIGNING_SECRET, `${row.id}.${row.email}.${e}`), s);
  if (!good) return go('invalid');
  if (row.confirmed_at) return go('confirmed');          // already used: same friendly page, no update, no resend
  if (Date.now() > Number(e)) return go('expired');
  const now = new Date().toISOString();
  const res = await env.WP_DB.prepare('UPDATE wp_requests SET confirmed_at = ? WHERE id = ? AND confirmed_at IS NULL').bind(now, id).run();
  if (res.meta && res.meta.changes === 1 && env.RESEND_API_KEY) {
    const site = (env.SITE_URL || 'https://nthlayer.co.uk').replace(/\/$/, '');
    waitUntil((async () => {
      let sent = 'failed';
      try { sent = await deliver(env, row, site); } catch {}
      if (!env.WP_NOTIFY_TO) return;
      const rows = [['Name', row.name], ['Email', row.email], ['Company', row.company], ['Job title', row.job_title], ['Source', row.source], ['Requested', row.created_at], ['Consent', row.consent_at || ''], ['Confirmed', now], ['White paper sent', sent]];
      await resend(env, { to: [env.WP_NOTIFY_TO], reply_to: row.email,
        subject: `White paper download confirmed: ${row.name}, ${row.company}`,
        html: `<div style="font-family:Manrope,'Helvetica Neue',Arial,sans-serif;color:#252423;"><p><b>White paper download</b> (confirmed)</p><table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">${rows.map(([k, v]) => `<tr><td style="color:#6B6862;border-bottom:1px solid #eee;">${k}</td><td style="border-bottom:1px solid #eee;">${esc(v)}</td></tr>`).join('')}</table></div>`,
        text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') }).catch(() => {});
    })());
  }
  return go('confirmed');
}
