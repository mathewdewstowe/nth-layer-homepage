// /api/white-paper/confirm  (2026-10-20 11:24): double opt-in removed.
// Old confirmation links and any stray calls go to the homepage. Nothing is sent or changed.
export function onRequest({ env }) {
  const site = (env.SITE_URL || 'https://nthlayer.co.uk').replace(/\/$/, '');
  return Response.redirect(`${site}/`, 302);
}
