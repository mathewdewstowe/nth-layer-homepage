// POST /api/white-paper  (2026-10-19; double opt-in removed 2026-10-20 11:24)
// White paper request: log in D1, email the requester a download link (PDF also attached when it is
// reachable, a PDF and under the size limit), mark the row delivered and notify the owner with the
// same link. Uses the same Resend account and sender as functions/api/contact.js.
// Bindings: WP_DB (D1). Secrets: RESEND_API_KEY.
// Vars: WP_NOTIFY_TO (owner notification address), SITE_URL (default https://nthlayer.co.uk),
//       WP_FILE_URL (default SITE_URL + /white-paper/Nth-Layer-AI-Native-SDLC-White-Paper.pdf),
//       WP_BOOK_URL (default SITE_URL + /#contact), WP_ATTACH ("0" = link only),
//       WP_ATTACH_MAX_BYTES (default 5000000),
//       WP_TEST_ONLY ("1" = accept only WP_TEST_EMAIL; with no WP_TEST_EMAIL every request is refused).
//       On *.pages.dev previews, groqbotdewstowe@gmail.com is also accepted so a preview can be checked.

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

const F = 'Arial,Helvetica,sans-serif';
const BLUE = '#1a73e8';

function emailDocument(title, inner) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
</head>
<body bgcolor="#ffffff" style="margin:0;padding:0;background:#ffffff;background-color:#ffffff;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;background-color:#ffffff;">
<tr><td align="center" bgcolor="#ffffff" style="background:#ffffff;background-color:#ffffff;padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px;background:#ffffff;background-color:#ffffff;">
<tr><td bgcolor="#ffffff" style="background:#ffffff;background-color:#ffffff;font-family:${F};color:#1a1a1a;">
${inner}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function downloadBlock(fileUrl) {
  const href = esc(fileUrl);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;background-color:#ffffff;margin:0 0 4px 0;"><tr>
<td bgcolor="${BLUE}" style="background:${BLUE};background-color:${BLUE};border-radius:6px;">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${F};font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;background:${BLUE};background-color:${BLUE};border-radius:6px;">Download the white paper</a>
</td></tr></table>
<p style="margin:14px 0 0 0;font-family:${F};font-size:15px;line-height:1.5;color:#1a1a1a;">Or copy this link into your browser:<br><a href="${href}" style="color:${BLUE};text-decoration:underline;word-break:break-word;">${href}</a></p>`;
}

export function deliveryEmail({ site, name, fileUrl, bookUrl }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'there';
  const html = emailDocument('Your copy: The AI-Native Software Development Lifecycle', `
<img src="${esc(site)}/images/nthlayer-email-logo.png" width="150" height="66" alt="The Nth Layer" style="display:block;border:0;width:150px;height:66px;background:#ffffff;background-color:#ffffff;">
<h1 style="margin:24px 0 16px 0;font-family:${F};font-size:24px;line-height:1.25;font-weight:700;color:#1a1a1a;">The AI-Native Software Development Lifecycle</h1>
<p style="margin:0 0 14px 0;font-family:${F};font-size:16px;line-height:1.6;color:#1a1a1a;">Hello ${esc(first)},</p>
<p style="margin:0 0 14px 0;font-family:${F};font-size:16px;line-height:1.6;color:#1a1a1a;">Thank you for requesting the white paper. Here is your copy.</p>
<p style="margin:0 0 18px 0;font-family:${F};font-size:16px;line-height:1.6;color:#1a1a1a;">It covers why faster, AI-written code is not reaching customers any sooner, and sets out a 12-week route to an AI-native SDLC.</p>
${downloadBlock(fileUrl)}
<p style="margin:22px 0 0 0;font-family:${F};font-size:16px;line-height:1.6;color:#1a1a1a;">Want to talk it through? <a href="${esc(bookUrl)}" style="color:${BLUE};text-decoration:underline;">Book 30 minutes with Matthew</a>.</p>
<p style="margin:22px 0 0 0;font-family:${F};font-size:15px;line-height:1.6;color:#1a1a1a;">Nth Layer</p>
<p style="margin:18px 0 0 0;font-family:${F};font-size:12px;line-height:1.6;color:#1a1a1a;">You are receiving this because you requested the white paper at <a href="${esc(site)}/" style="color:${BLUE};text-decoration:underline;">nthlayer.co.uk</a>. <a href="${esc(site)}/privacy/" style="color:${BLUE};text-decoration:underline;">Privacy</a></p>`);
  const text = `Hello ${first},

Thank you for requesting the white paper. Here is your copy.

It covers why faster, AI-written code is not reaching customers any sooner, and sets out a 12-week route to an AI-native SDLC.

Download the white paper:
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

export function notifyEmail(row, fileUrl) {
  const rows = [['Name', row.name], ['Email', row.email], ['Company', row.company], ['Job title', row.job_title], ['Source', row.source], ['Requested', row.created_at], ['Consent', row.consent_at], ['Download link', fileUrl]];
  const cells = rows.map(([k, v]) => {
    const value = k === 'Download link'
      ? `<a href="${esc(v)}" style="color:${BLUE};text-decoration:underline;word-break:break-word;">${esc(v)}</a>`
      : k === 'Email'
        ? `<a href="mailto:${esc(v)}" style="color:${BLUE};text-decoration:underline;">${esc(v)}</a>`
        : esc(v);
    return `<tr><td style="color:#1a1a1a;border-bottom:1px solid #e6e6e6;padding:6px 16px 6px 0;vertical-align:top;font-family:${F};font-size:14px;">${esc(k)}</td><td style="color:#1a1a1a;border-bottom:1px solid #e6e6e6;padding:6px 0;font-family:${F};font-size:14px;">${value}</td></tr>`;
  }).join('');
  const html = emailDocument('White paper download', `
<p style="margin:0 0 8px 0;font-family:${F};font-size:18px;line-height:1.4;font-weight:700;color:#1a1a1a;">White paper download</p>
<p style="margin:0 0 18px 0;font-family:${F};font-size:16px;line-height:1.6;color:#1a1a1a;">${esc(row.name)} at ${esc(row.company)} requested the white paper.</p>
${downloadBlock(fileUrl)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin-top:22px;border-collapse:collapse;background:#ffffff;background-color:#ffffff;">${cells}</table>`);
  const text = `White paper download

${row.name} at ${row.company} requested the white paper.

Download the white paper:
${fileUrl}

${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`;
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
  let host = '';
  try { host = new URL(request.url).hostname; } catch { host = ''; }
  const previewProbe = host.endsWith('.pages.dev') && row.email === 'groqbotdewstowe@gmail.com';
  if (testOnly && !previewProbe && (!testEmail || row.email !== testEmail)) return json({ ok: false, error: 'Requests are paused during testing.' }, 403);
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
    const n = notifyEmail(row, fileUrl);
    waitUntil(sendEmail(env, { to: [env.WP_NOTIFY_TO], reply_to: row.email, subject: `White paper download: ${row.name}, ${row.company}`, ...n }).catch(() => {}));
  }
  return json({ ok: true });
}
