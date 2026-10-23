# صياغة (Siyagah)

An Arabic rewriting website for improving phrasing without changing the author's meaning. The site is plain HTML, CSS, and JavaScript; no frontend build step is required. In the workspace source, the static site is inside `site/`. In the downloadable ZIP, those files are at the project root for easier GitHub Pages upload.

## What is included

- `site/` — responsive Arabic RTL interface, served as static files.
- `worker/worker.js` — Cloudflare Worker API that validates requests and calls Google's Gemini Interactions API.
- `worker/wrangler.toml` — Wrangler deployment configuration and a GitHub Pages origin placeholder.
- `worker/.dev.vars.example` — safe local-development configuration example; it contains no real key.
- `tests/worker.test.js` — automated tests using Node's built-in test runner and a mocked Gemini response.

The app does not include a database, account system, browser model, analytics, or history storage. The Worker sends each request to Google with `store: false`; do not submit confidential or sensitive text to an external AI service.

## 1. Publish the static website on GitHub Pages

1. Create a GitHub repository.
2. If using the ZIP, upload its `index.html`, `favicon.svg`, `css/`, and `js/` to the repository root. If using the workspace source, upload the **contents of `site/`** instead. `index.html` should be at the repository root, alongside `css/` and `js/`.
3. In the repository, open **Settings → Pages**. Choose **Deploy from a branch**, select `main` and the `/ (root)` folder, then save.
4. Wait for GitHub Pages to publish the site. A project site may look like `https://OWNER.github.io/REPOSITORY/`; its origin for CORS is only `https://OWNER.github.io`.

The frontend is intentionally static. You can open `index.html` from the ZIP locally (or `site/index.html` in the workspace source), but AI requests will work only after the Worker URL is configured below.

## 2. Create and deploy the Cloudflare Worker

1. Create a Cloudflare account and install a current Node.js LTS release.
2. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). Keep it private.
3. In a terminal, enter the project's `worker/` directory:

   ```sh
   cd worker
   npx wrangler@latest login
   ```

4. Edit `wrangler.toml`. Replace `https://YOUR-USERNAME.github.io` with the exact origin of your GitHub Pages site. For local testing, you can include a comma-separated list, such as `https://OWNER.github.io,http://localhost:5173`. Do not use `*`.
5. Add your Gemini key as a Cloudflare secret. Wrangler prompts for it; do not put the value into a source file:

   ```sh
   npx wrangler@latest secret put GEMINI_API_KEY
   ```

6. Deploy from the `worker/` directory:

   ```sh
   npx wrangler@latest deploy
   ```

   Wrangler prints the deployed Worker URL. The API route is that URL followed by `/rewrite`.

## 3. Connect the site to the Worker

Edit `js/config.js` in the ZIP (or `site/js/config.js` in the workspace source) and set `API_URL` to your real Worker URL, including `/rewrite`:

```js
window.SIYAGAH_CONFIG = {
  API_URL: "https://YOUR-WORKER.workers.dev/rewrite",
};
```

Replace the placeholder with the URL Wrangler printed. Commit and push the updated `js/config.js` (or the updated contents of `site/` from the workspace source) to GitHub. **Do not put the Gemini key in this file**; the browser only needs the public Worker URL.

## 4. Test the project

From the project directory, run:

```sh
node --test tests/worker.test.js
```

These tests exercise Worker validation, CORS, and success/error handling with a mocked Gemini response; they do not contact Google or prove that a deployed key, model quota, or billing setup works.

After deployment, open the GitHub Pages site and try an ordinary Arabic sentence. Confirm that the selected dialect, style, and intensity are reflected in the response, then try copy, download, reuse, and clear.

You can also make a basic request from a terminal (replace the URL):

```sh
curl -X POST "https://YOUR-WORKER.workers.dev/rewrite" \
  -H "Content-Type: application/json" \
  -d '{"text":"أكتب هنا جملة قصيرة.","dialect":"msa","style":"natural","intensity":50}'
```

## Security and privacy notes

- `GEMINI_API_KEY` belongs only in Cloudflare Worker secrets. It is never returned to the browser or included in API error messages.
- The Worker accepts only the configured exact site origins for browser CORS. CORS is **not authentication**: command-line clients and other servers can still call a public Worker.
- Before sharing the public Worker, configure a Cloudflare WAF rate-limiting rule for `/rewrite` (for example, a per-IP request limit) and review it as usage changes. This project does not include a globally reliable in-memory limiter; Worker instances can scale independently.
- Request text is not written to an app database or intentionally logged by the Worker. It is sent to Google for processing. `store: false` disables Interactions API conversation storage, but this is not a promise that Google or Cloudflare retain no operational data; review their current privacy terms.
- A missing/invalid key, exhausted quota, unsupported model, or provider outage will prevent rewriting. The Worker returns generic Arabic messages and does not expose Google's raw error body.
- Gemini availability, quota, and pricing can change; free-tier access is not guaranteed.

## Gemini API choice

This Worker uses the **Interactions API** (`POST /v1beta/interactions`) and the stable `gemini-3.8-flash` model listed by Google's documentation when this project was prepared. The request has a separate system instruction and user text, and uses `store: false` for stateless requests.

- [Interactions API](https://ai.google.dev/gemini-api/docs/interactions)
- [Available Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare WAF rate-limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
