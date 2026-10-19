// POST /api/white-paper/confirm  body {id,e,s}  (2026-10-19)
// Called by the button on /white-paper/confirm/ (the link in the email opens that page).
// A POST from a button, not a GET, so corporate link scanners that prefetch links
// cannot confirm on the reader's behalf and inflate the count.
// Verifies the signed one-time link, sets confirmed_at once and notifies Matthew.
const FROM = 'The Nth Layer <hello@nthlayer.co.uk>';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export async function onRequestPost({ request, env, waitUntil }) {
  const go = (state) => Response.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
  let b = {}; try { b = await request.json(); } catch {}
  const id = String(b.id || ''), e = String(b.e || ''), s = String(b.s || '');
  if (!id || !e || !s || !env.WP_DB || !env.WP_SIGNING_SECRET) return go('invalid');
  const row = await env.WP_DB.prepare('SELECT * FROM wp_requests WHERE id = ?').bind(id).first();
  if (!row) return go('invalid');
  const good = same(await sign(env.WP_SIGNING_SECRET, `${row.id}.${row.email}.${e}`), s);
  if (!good) return go('invalid');
  if (row.confirmed_at) return go('confirmed');          // already used: same friendly page, no second update
  if (Date.now() > Number(e)) return go('expired');
  const now = new Date().toISOString();
  const res = await env.WP_DB.prepare('UPDATE wp_requests SET confirmed_at = ? WHERE id = ? AND confirmed_at IS NULL').bind(now, id).run();
  if (res.meta && res.meta.changes === 1 && env.RESEND_API_KEY) {
    const rows = [['Name', row.name], ['Email', row.email], ['Company', row.company], ['Job title', row.job_title], ['Source', row.source], ['Requested', row.created_at], ['Confirmed', now]];
    waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [env.WP_NOTIFY_TO || 'matthew@nthlayer.co.uk'], reply_to: row.email,
        subject: `White paper download confirmed: ${row.name}, ${row.company}`,
        html: `<div style="font-family:Manrope,'Helvetica Neue',Arial,sans-serif;color:#252423;"><p><b>White paper download</b> (confirmed)</p><table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">${rows.map(([k, v]) => `<tr><td style="color:#6B6862;border-bottom:1px solid #eee;">${k}</td><td style="border-bottom:1px solid #eee;">${esc(v)}</td></tr>`).join('')}</table></div>`,
        text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') }),
    }).catch(() => {}));
  }
  return go('confirmed');
}
