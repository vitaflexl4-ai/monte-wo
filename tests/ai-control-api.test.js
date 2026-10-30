import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/assistant/v1/[[path]].js";

const TOKEN = "test-only-token-that-is-at-least-32-characters-long";
const env = { AI_CONTROL_ENABLED: "true", AI_CONTROL_TOKEN: TOKEN };

function context(path, { method = "GET", token = TOKEN, vars = env, headers = {} } = {}) {
  const requestHeaders = new Headers(headers);
  if (token !== null) requestHeaders.set("authorization", `Bearer ${token}`);
  return {
    request: new Request(`https://example.test/api/assistant/v1/${path}`, {
      method,
      headers: requestHeaders,
    }),
    env: vars,
  };
}

test("disabled or missing configuration fails closed", async () => {
  const response = await onRequest(context("status", { vars: {} }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "service_unavailable",
    message: "AI control API is not enabled or configured.",
  });
});

test("rejects missing bearer token", async () => {
  const response = await onRequest(context("status", { token: null }));
  assert.equal(response.status, 401);
});

test("rejects invalid bearer token", async () => {
  const response = await onRequest(context("status", { token: "wrong-token-that-is-long-enough-to-pass-length" }));
  assert.equal(response.status, 401);
});

test("rejects an unexpectedly short configured secret", async () => {
  const response = await onRequest(context("status", {
    token: "short",
    vars: { AI_CONTROL_ENABLED: "true", AI_CONTROL_TOKEN: "short" },
  }));
  assert.equal(response.status, 503);
});

test("status endpoint returns only non-sensitive project metadata", async () => {
  const response = await onRequest(context("status"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    apiVersion: "v1",
    mode: "read-only",
    project: "monte-wo",
    website: "Cloudflare Pages",
    mobile: "Expo/EAS",
  });
});

test("capabilities endpoint does not claim unimplemented tools are available", async () => {
  const response = await onRequest(context("capabilities"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.allowed, ["status.read", "capabilities.read"]);
  assert.ok(body.unavailable.includes("repository.write"));
  assert.ok(body.approvalRequired.includes("production.deploy"));
});

test("rejects methods other than GET", async () => {
  const response = await onRequest(context("status", { method: "POST" }));
  assert.equal(response.status, 405);
});

test("unknown routes return 404", async () => {
  const response = await onRequest(context("unlisted-action"));
  assert.equal(response.status, 404);
});

test("does not echo or expose the configured token", async () => {
  const response = await onRequest(context("status"));
  const body = await response.text();
  assert.equal(body.includes(TOKEN), false);
  assert.equal(body.includes("AI_CONTROL_TOKEN"), false);
});
