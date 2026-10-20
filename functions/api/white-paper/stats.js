// GET /api/white-paper/stats  with header  Authorization: Bearer <WP_ADMIN_KEY>  (2026-10-19)
// Returns totals so the confirmed count is easy to see. Optional ?list=1 adds the latest 200 rows.
export async function onRequestGet({ request, env }) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.WP_ADMIN_KEY || auth !== `Bearer ${env.WP_ADMIN_KEY}`) return new Response('Not found', { status: 404 });
  const t = await env.WP_DB.prepare(`SELECT COUNT(*) AS requests, COUNT(DISTINCT email) AS people,
    COUNT(DISTINCT CASE WHEN confirmed_at IS NOT NULL THEN email END) AS confirmed_people,
    SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END) AS confirmed_requests,
    SUM(CASE WHEN delivered_at IS NOT NULL THEN 1 ELSE 0 END) AS delivered, COUNT(DISTINCT CASE WHEN delivered_at IS NOT NULL THEN email END) AS delivered_people FROM wp_requests`).first();
  const out = { ...t };
  if (new URL(request.url).searchParams.get('list') === '1') {
    out.rows = (await env.WP_DB.prepare('SELECT name,email,company,job_title,source,created_at,consent_at,delivered_at,delivery_method FROM wp_requests ORDER BY created_at DESC LIMIT 200').all()).results;
  }
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
