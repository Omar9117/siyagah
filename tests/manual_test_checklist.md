# Siyagah manual test checklist

## Frontend

- [ ] Open the published site on desktop and phone-sized screens; confirm the Arabic layout reads right-to-left and controls remain legible.
- [ ] Type and paste Arabic text; confirm the counter updates and the 12,000-character limit is enforced.
- [ ] Change dialect, style, and intensity; confirm the intensity label shows light/medium/strong plus its percentage.
- [ ] Press Ctrl+Enter (or Cmd+Enter on Mac); confirm one rewrite request is sent and the submit button shows its loading state.
- [ ] Try an empty input; confirm no request is sent.
- [ ] After a successful request, confirm the result is selectable and is displayed as text, not interpreted as HTML.
- [ ] Try reuse, copy, UTF-8 TXT download, and clear.
- [ ] With `API_URL` still set to its placeholder, confirm the app explains that the Worker must be configured.

## Cloudflare Worker

- [ ] Run `node --test tests/worker.test.js`.
- [ ] Confirm `GEMINI_API_KEY` is configured as a Cloudflare secret, never as a plain variable or frontend value.
- [ ] Confirm `ALLOWED_ORIGINS` contains only the exact GitHub Pages origin(s).
- [ ] Send valid, empty, malformed, oversized, and invalid-enum requests; check their status and Arabic errors.
- [ ] Send an OPTIONS preflight from the allowed origin, then from an unlisted origin.
- [ ] Make one end-to-end request after both deployments; confirm the real Gemini response and check Cloudflare/Google quotas if it fails.
- [ ] Configure and test a Cloudflare rate-limit rule before sharing the public endpoint.
