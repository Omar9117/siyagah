import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "../worker/worker.js";

const allowedOrigin = "https://writer.github.io";
const env = {
  GEMINI_API_KEY: "test-only-key",
  ALLOWED_ORIGINS: allowedOrigin,
};

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeRequest(payload, { origin = allowedOrigin, url = "https://worker.test/rewrite" } = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(payload),
  });
}

function validPayload(overrides = {}) {
  return {
    text: "النص الأصلي",
    dialect: "msa",
    style: "natural",
    intensity: 50,
    ...overrides,
  };
}

function geminiResponse(text = "النص بعد إعادة الصياغة") {
  return new Response(
    JSON.stringify({
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text }],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

test("rejects empty text without calling Gemini", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return geminiResponse();
  };

  const response = await worker.fetch(makeRequest(validPayload({ text: "  " })), env);
  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.match((await response.json()).error, /أدخل نصاً/);
});

test("rejects text over 12,000 Unicode characters", async () => {
  const response = await worker.fetch(
    makeRequest(validPayload({ text: "ع".repeat(12_001) })),
    env,
  );
  assert.equal(response.status, 400);
});

test("rejects unsupported dialects and styles", async () => {
  for (const payload of [
    validPayload({ dialect: "levantine" }),
    validPayload({ style: "casual" }),
  ]) {
    const response = await worker.fetch(makeRequest(payload), env);
    assert.equal(response.status, 400);
  }
});

test("rejects malformed JSON and unsupported content types", async () => {
  const malformed = await worker.fetch(
    new Request("https://worker.test/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: allowedOrigin },
      body: "{",
    }),
    env,
  );
  assert.equal(malformed.status, 400);

  const wrongType = await worker.fetch(
    new Request("https://worker.test/rewrite", {
      method: "POST",
      headers: { "Content-Type": "text/plain", Origin: allowedOrigin },
      body: "{}",
    }),
    env,
  );
  assert.equal(wrongType.status, 415);
});

test("rejects oversized request bodies before parsing", async () => {
  const response = await worker.fetch(
    new Request("https://worker.test/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: allowedOrigin },
      body: JSON.stringify({ padding: "x".repeat(70 * 1024) }),
    }),
    env,
  );
  assert.equal(response.status, 413);
});

test("clamps intensity, uses stateless Gemini Interactions, and returns text", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options, body: JSON.parse(options.body) };
    return geminiResponse("صياغة محسّنة");
  };

  const response = await worker.fetch(
    makeRequest(validPayload({ intensity: 125 })),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), allowedOrigin);
  assert.deepEqual(await response.json(), { rewritten_text: "صياغة محسّنة" });
  assert.equal(captured.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(captured.options.headers["x-goog-api-key"], env.GEMINI_API_KEY);
  assert.equal(captured.body.model, "gemini-3.8-flash");
  assert.equal(captured.body.store, false);
  assert.equal(captured.body.input, "النص الأصلي");
  assert.match(captured.body.system_instruction, /100 من 100/);
  assert.match(captured.body.system_instruction, /بيانات غير موثوقة/);
  assert.match(captured.body.system_instruction, /مكتوبة بشكل طبيعي وإنساني/);
  assert.match(captured.body.system_instruction, /لا تكتف باستبدال المرادفات/);
});

test("does not allow an unlisted browser origin", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return geminiResponse();
  };
  const response = await worker.fetch(
    makeRequest(validPayload(), { origin: "https://attacker.example" }),
    env,
  );
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(called, false);
});

test("answers valid CORS preflight requests", async () => {
  const response = await worker.fetch(
    new Request("https://worker.test/rewrite", {
      method: "OPTIONS",
      headers: { Origin: allowedOrigin },
    }),
    env,
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), allowedOrigin);
  assert.match(response.headers.get("access-control-allow-methods"), /POST/);
});

test("requires the Gemini secret and does not call the provider without it", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return geminiResponse();
  };
  const response = await worker.fetch(makeRequest(validPayload()), {
    ALLOWED_ORIGINS: allowedOrigin,
  });
  assert.equal(response.status, 500);
  assert.equal(called, false);
});

test("maps provider rate limits to a safe Arabic response", async () => {
  globalThis.fetch = async () =>
    new Response('{"details":"private provider error"}', { status: 429 });
  const response = await worker.fetch(makeRequest(validPayload()), env);
  const body = await response.json();
  assert.equal(response.status, 429);
  assert.match(body.error, /انتظر قليلاً/);
  assert.equal(JSON.stringify(body).includes("private provider error"), false);
});

test("rejects unsupported paths and methods", async () => {
  const missingPath = await worker.fetch(
    makeRequest(validPayload(), { url: "https://worker.test/other" }),
    env,
  );
  assert.equal(missingPath.status, 404);

  const wrongMethod = await worker.fetch(
    new Request("https://worker.test/rewrite", { method: "GET" }),
    env,
  );
  assert.equal(wrongMethod.status, 405);
});
