# White paper demand test: backend (built 19 Oct 2026, not deployed)

Copy into the repo root of mathewdewstowe/nth-layer-homepage:
  functions/api/white-paper/index.js    POST: validate, log in D1, send opt-in email, notify Matthew
  functions/api/white-paper/confirm.js  POST: verify signed one-time link, set confirmed_at, notify Matthew
  functions/api/white-paper/stats.js    GET: counts (Authorization: Bearer WP_ADMIN_KEY)
  white-paper/confirm/index.html        page the email link opens (button confirms; noindex)
  images/nthlayer-email-logo.png        logo used in the email (300x132, shown at 150x66)
  migrations/0001_wp_requests.sql       D1 schema

Cloudflare setup (free tier):
  1. npx wrangler d1 create nthlayer-wp
  2. npx wrangler d1 execute nthlayer-wp --remote --file=migrations/0001_wp_requests.sql
  3. Pages project > Settings > Bindings: D1 database, variable name WP_DB -> nthlayer-wp (Production and Preview)
  4. Secrets: WP_SIGNING_SECRET (openssl rand -base64 32), WP_ADMIN_KEY (openssl rand -hex 24). RESEND_API_KEY already exists.
  5. Variables: WP_NOTIFY_TO=matthew@nthlayer.co.uk, SITE_URL=https://nthlayer.co.uk,
     WP_TEST_ONLY=1 while testing (only matthewdewstowe@gmail.com accepted), then remove it.

Confirmed count:
  D1 console:  SELECT COUNT(DISTINCT email) FROM wp_requests WHERE confirmed_at IS NOT NULL;
  or curl -H "Authorization: Bearer $WP_ADMIN_KEY" https://nthlayer.co.uk/api/white-paper/stats   (?list=1 for rows)
