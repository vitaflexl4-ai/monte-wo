/**
 * MONTE WO AI Control API — Phase 1, read-only foundation.
 *
 * Enable only after configuring encrypted Cloudflare Pages variables:
 *   AI_CONTROL_ENABLED=true
 *   AI_CONTROL_TOKEN=<high-entropy random secret, >= 32 bytes>
 *
 * Never expose this token to browser code or the mobile app.
 */
const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}

function bytesEqualConstantTime(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  // Iterate over the longer input so a content mismatch does not early-return.
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    difference |= (a[i] || 0) ^ (b[i] || 0);
  }
  return difference === 0;
}

function validBearer(request, expected) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer ([\x21-\x7E]+)$/.exec(header);
  if (!match || !expected || expected.length < 32) return false;
  return bytesEqualConstantTime(encoder.encode(match[1]), encoder.encode(expected));
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (env.AI_CONTROL_ENABLED !== "true" || typeof env.AI_CONTROL_TOKEN !== "string" || env.AI_CONTROL_TOKEN.length < 32) {
    return json({ error: "service_unavailable", message: "AI control API is not enabled or configured." }, 503);
  }

  if (!validBearer(request, env.AI_CONTROL_TOKEN)) {
    return json({ error: "unauthorized" }, 401);
  }

  if (request.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }

  if (request.headers.has("content-length") && Number(request.headers.get("content-length")) > 0) {
    return json({ error: "request_body_not_supported" }, 400);
  }

  if (path === "/api/assistant/v1/status") {
    return json({
      ok: true,
      apiVersion: "v1",
      mode: "read-only",
      project: "monte-wo",
      website: "Cloudflare Pages",
      mobile: "Expo/EAS",
    });
  }

  if (path === "/api/assistant/v1/capabilities") {
    return json({
      mode: "read-only",
      allowed: ["status.read", "capabilities.read"],
      approvalRequired: [
        "production.deploy",
        "mobile.release",
        "database.mutate",
        "permissions.change",
        "credentials.change",
      ],
      unavailable: [
        "repository.write",
        "tests.run",
        "website.deploy",
        "mobile.release",
        "database.admin",
      ],
    });
  }

  return json({ error: "not_found" }, 404);
}
