# Diagnostic call toolkit (preview only)

Pages under `/diagnostic-call/` are for the preview site. They send `noindex` and are not part of the live homepage.

## What stays in the browser

Intake answers, scores, notes, the transcript, and the scorecard are stored in `localStorage` and in a session code on the URL. The toolkit does not send email.

## AI transcript analysis

`POST /api/analyse` reads the pasted transcript only when an API key is configured.

Set this in the Cloudflare Pages project (preview environment), not in the repo:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NTH_LLM_API_KEY` | Yes, to enable AI | Bearer token for an OpenAI-compatible chat API |
| `NTH_LLM_API_URL` | No | Defaults to `https://api.openai.com/v1/chat/completions` |
| `NTH_LLM_MODEL` | No | Defaults to `gpt-4o-mini` |

If `NTH_LLM_API_KEY` is missing, the function returns `configured: false` and the call tool shows **AI analysis not configured**, plus keyword highlighting. No secret belongs in this repository.

Do not put the key in a file, a wrangler var committed to git, or the page HTML.
