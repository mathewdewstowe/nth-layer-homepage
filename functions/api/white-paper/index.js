// POST /api/white-paper  (2026-10-19; double opt-in removed 2026-10-20 11:24)
// White paper request: log in D1, email the white paper straight away (PDF attached when it is
// reachable, a PDF and under the size limit, otherwise a link), mark the row delivered and
// notify the owner. Uses the same Resend account and sender as functions/api/contact.js.
// Bindings: WP_DB (D1). Secrets: RESEND_API_KEY.
// Vars: WP_NOTIFY_TO (owner notification address), SITE_URL (default https://nthlayer.co.uk),
//       WP_FILE_URL (default SITE_URL + /white-paper/Nth-Layer-AI-Native-SDLC-White-Paper.pdf),
//       WP_BOOK_URL (default SITE_URL + /#contact), WP_ATTACH ("0" = link only),
//       WP_ATTACH_MAX_BYTES (default 5000000),
//       WP_TEST_ONLY ("1" = accept only WP_TEST_EMAIL; with no WP_TEST_EMAIL every request is refused).

const FROM = 'The Nth Layer <hello@nthlayer.co.uk>';
const PDF_NAME = 'Nth-Layer-AI-Native-SDLC-White-Paper.pdf';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const json = (body, status = 200) => Response.json(body, { status });

async function sendEmail(env, payload, idem) {
  const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
  if (idem) headers['Idempotency-Key'] = idem; // Resend drops a repeat with the same key for 24 hours
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from: FROM, ...payload }),
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
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
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#4A4842;">Thank you for requesting the white paper. Here is your copy.</p>
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

Thank you for requesting the white paper. Here is your copy.

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
    const r = await fetch(fileUrl, { method: 'HEAD', headers: { 'Accept-Encoding': 'identity' } }); // without this the size header is dropped
    const len = Number(r.headers.get('content-length') || 0), type = r.headers.get('content-type') || '';
    // the host sometimes omits the size; the file is a known ~672 KB PDF, so a missing size still attaches
    if (!r.ok || (type && !/pdf/i.test(type)) || (len && len > max)) return null;
    return [{ filename: PDF_NAME, path: fileUrl, content_type: 'application/pdf' }]; // Resend fetches the file itself
  } catch { return null; }
}

export function notifyEmail(row, status) {
  const rows = [['Name', row.name], ['Email', row.email], ['Company', row.company], ['Job title', row.job_title], ['Source', row.source], ['Requested', row.created_at], ['Consent', row.consent_at], ['White paper sent', status]];
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
  // consent is required; the server time is stored (the browser's consent_at is not trusted)
  if (b.consent !== true) return json({ ok: false, error: 'Please tick the consent box to continue.' }, 400);
  row.consent_at = row.created_at;
  if (!row.name || !row.company || !row.job_title || !EMAIL_RE.test(row.email)) return json({ ok: false, error: 'Please complete every field with a valid email address.' }, 400);
  const testOnly = String(env.WP_TEST_ONLY || '') === '1';
  const testEmail = String(env.WP_TEST_EMAIL || '').trim().toLowerCase();
  if (testOnly && (!testEmail || row.email !== testEmail)) return json({ ok: false, error: 'Requests are paused during testing.' }, 403);
  if (!env.WP_DB || !env.RESEND_API_KEY) return json({ ok: false, error: 'Not configured.' }, 500);

  // no re-sends: if this address already received the paper in the last 24 hours, log the request but send nothing
  const since = new Date(Date.now() - 864e5).toISOString();
  const prior = await env.WP_DB.prepare('SELECT COUNT(*) AS n FROM wp_requests WHERE email = ? AND delivered_at > ?').bind(row.email, since).first();
  const recent = await env.WP_DB.prepare('SELECT COUNT(*) AS n FROM wp_requests WHERE email = ? AND created_at > ?').bind(row.email, since).first();
  if ((prior && prior.n > 0) || (recent && recent.n >= 3)) {
    if (!recent || recent.n < 10) await env.WP_DB.prepare("INSERT INTO wp_requests (id,name,email,company,job_title,source,created_at,confirmed_at,consent_at,delivery_method) VALUES (?,?,?,?,?,?,?,NULL,?,'duplicate')")
      .bind(row.id, row.name, row.email, row.company, row.job_title, row.source, row.created_at, row.consent_at).run();
    return json({ ok: true });
  }

  await env.WP_DB.prepare('INSERT INTO wp_requests (id,name,email,company,job_title,source,created_at,confirmed_at,consent_at) VALUES (?,?,?,?,?,?,?,NULL,?)')
    .bind(row.id, row.name, row.email, row.company, row.job_title, row.source, row.created_at, row.consent_at).run();

  const site = (env.SITE_URL || 'https://nthlayer.co.uk').replace(/\/$/, '');
  const fileUrl = env.WP_FILE_URL || `${site}/white-paper/${PDF_NAME}`;
  const bookUrl = env.WP_BOOK_URL || `${site}/#contact`;
  const mail = { to: [row.email], ...deliveryEmail({ site, name: row.name, fileUrl, bookUrl }) };
  let method = null;
  const att = await attachment(env, fileUrl);
  if (att) { try { await sendEmail(env, { ...mail, attachments: att }, `wp-deliver-${row.id}`); method = 'attached'; } catch {} }
  if (!method) {
    try { await sendEmail(env, mail, `wp-deliver-${row.id}-link`); method = 'link'; }
    catch { return json({ ok: false, error: 'The white paper could not be sent. Please try again in a moment.' }, 502); }
  }
  await env.WP_DB.prepare('UPDATE wp_requests SET delivered_at = ?, delivery_method = ? WHERE id = ?').bind(new Date().toISOString(), method, row.id).run();
  if (env.WP_NOTIFY_TO) {
    const n = notifyEmail(row, method);
    waitUntil(sendEmail(env, { to: [env.WP_NOTIFY_TO], reply_to: row.email, subject: `White paper download: ${row.name}, ${row.company}`, ...n }).catch(() => {}));
  }
  return json({ ok: true });
}
