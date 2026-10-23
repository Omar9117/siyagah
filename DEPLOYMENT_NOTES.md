# Before deploying Siyagah

1. Replace `API_URL` in `js/app.js` with your deployed Cloudflare Worker URL.
2. Set `GEMINI_API_KEY` as a Cloudflare Worker Secret; never put it in frontend files or commit it to GitHub.
3. Set `ALLOWED_ORIGIN` to the exact origin of your GitHub Pages site. For a project site this is typically `https://YOUR-USERNAME.github.io`; confirm your actual Pages origin and use that exact origin.
4. The Worker defaults to the `gemini-2.5-flash` model. If Google changes model availability for your account, set `GEMINI_MODEL` to a currently supported model in Worker variables.
5. Deploy and test the Worker before enabling the frontend. Check `tests/manual_test_checklist.md`.

This package contains source code and a deployment guide; it is not pre-deployed and has not been verified against live API credentials.
