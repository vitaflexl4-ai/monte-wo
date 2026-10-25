// Server-side authorization for every /api/intelligence route.
// Identity: cryptographically verified Cloudflare Access JWT (RS256 against the Access CDN keys).
// Authorization: the authenticated subject must hold an active row in intel_operators.
// Local development only: LOCAL_DEVELOPMENT=true on a localhost hostname yields a local admin,
// exactly like the waitlist preview bypass; it can never run on a public hostname.
import { IntelError, requireThat } from './errors.js';

const decode = s => {
  requireThat(typeof s === 'string' && /^[A-Za-z0-9_-]+$/.test(s), 'invalid-token', 401);
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
};

export function intelligenceConfigured(env) {
  return !!env.INTEL_DB
    && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.INTELLIGENCE_ACCESS_ISSUER || '')
    && typeof env.INTELLIGENCE_ACCESS_AUD === 'string' && env.INTELLIGENCE_ACCESS_AUD.length > 0;
}

export function localOperatorAllowed(env, url) {
  return env.LOCAL_DEVELOPMENT === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

const timingSafeEqual = (a, b) => {
  const ea = new TextEncoder().encode(String(a)), eb = new TextEncoder().encode(String(b));
  if (ea.length !== eb.length) return false;
  let diff = 0; for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
};
// Private PREVIEW access for development environments only (e.g. ephemeral preview hosts).
// Honored ONLY when LOCAL_DEVELOPMENT=true AND PREVIEW_TOKEN is set; production uses Cloudflare
// Access. A preview host without the bearer token is refused exactly like any public hostname.
export function previewTokenAllowed(env, url, request) {
  if (env.LOCAL_DEVELOPMENT !== 'true' || typeof env.PREVIEW_TOKEN !== 'string' || env.PREVIEW_TOKEN.length < 16) return false;
  const match = /^Bearer ([A-Za-z0-9_-]{16,128})$/.exec(request.headers.get('Authorization') || '');
  return !!match && timingSafeEqual(match[1], env.PREVIEW_TOKEN);
}

export async function verifyAccessJwt(request, env, fetcher = fetch) {
  if (!intelligenceConfigured(env)) {
    const err = new IntelError('intelligence-not-configured', 503);
    err.hint = 'Fail-closed: the Access login (INTELLIGENCE_ACCESS_ISSUER / INTELLIGENCE_ACCESS_AUD) is not configured, so no data is served even though the backend may be deployed. Live component status: GET /api/intelligence/status';
    throw err;
  }
  // The Access JWT normally arrives as the Cf-Access-Jwt-Assertion header, injected by the
  // Cloudflare edge for Access-protected paths. As a second source, the CF_Authorization
  // cookie set on the hostname after login carries the same JWT (same-origin fetches send
  // it automatically); it is accepted here and verified with identical cryptographic checks.
  const cookieJwt = (() => {
    for (const part of (request.headers.get('Cookie') || '').split(';')) {
      const c = part.trim();
      if (c.startsWith('CF_Authorization=')) return c.slice('CF_Authorization='.length);
    }
    return null;
  })();
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookieJwt;
  requireThat(token && token.length < 12000, 'authentication-required', 401);
  try {
    const parts = token.split('.');
    requireThat(parts.length === 3, 'invalid-token', 401);
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claim = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    requireThat(header.alg === 'RS256' && typeof header.kid === 'string' && !header.jku && !header.jwk, 'invalid-token', 401);
    const now = Math.floor(Date.now() / 1000);
    requireThat(claim.iss === env.INTELLIGENCE_ACCESS_ISSUER
      && (Array.isArray(claim.aud) ? claim.aud : [claim.aud]).includes(env.INTELLIGENCE_ACCESS_AUD)
      && Number.isInteger(claim.exp) && claim.exp > now
      && Number.isInteger(claim.iat) && claim.iat <= now + 30
      && (!claim.nbf || claim.nbf <= now)
      && typeof claim.sub === 'string' && claim.sub.length <= 200, 'invalid-token', 401);
    const res = await fetcher(env.INTELLIGENCE_ACCESS_ISSUER + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
    requireThat(res.ok, 'identity-provider-unavailable', 503);
    const keys = await res.json();
    const jwk = keys.keys?.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256'));
    requireThat(jwk, 'invalid-token', 401);
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    requireThat(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])), 'invalid-token', 401);
    return claim;
  } catch (e) {
    if (e instanceof IntelError) throw e;
    throw new IntelError('authentication-failed', 401);
  }
}

// Returns {id, subject, role} or throws. Mutations require role 'admin'.
export async function authenticateOperator(request, env, url, deps = {}) {
  requireThat(!!env.INTEL_DB, 'intelligence-not-configured', 503);
  // Setting PREVIEW_TOKEN HARDENS the preview: the token becomes mandatory for every host,
  // including localhost. Without it, the classic localhost bypass applies in local development.
  if (previewTokenAllowed(env, url, request)) {
    return { id: 'preview-operator', subject: 'preview-token', role: 'admin', via: 'preview-token' };
  }
  if (env.LOCAL_DEVELOPMENT === 'true' && typeof env.PREVIEW_TOKEN === 'string' && env.PREVIEW_TOKEN.length >= 16) {
    throw new IntelError('authentication-required', 401);
  }
  if (localOperatorAllowed(env, url)) {
    return { id: 'local-operator', subject: 'local-development', role: 'admin', via: 'local-development' };
  }
  const claim = await verifyAccessJwt(request, env, deps.fetcher || fetch);
  const row = await env.INTEL_DB.prepare('SELECT subject, role FROM intel_operators WHERE subject=? AND active=1').bind(claim.sub).first();
  if (!row) {
    // Actionable refusal: reveal only the caller's own authenticated subject (never anyone
    // else's) with the exact command that grants it. Granting stays a deliberate owner action.
    const err = new IntelError('operator-not-provisioned', 403);
    err.hint = 'Authenticated as ' + claim.sub + '. Ask the deployment owner to run: node scripts/deploy-intelligence.mjs --grant-operator "' + claim.sub + '"';
    throw err;
  }
  return { id: row.subject, subject: row.subject, role: row.role, via: 'cloudflare-access' };
}

export function requireAdmin(operator) {
  requireThat(operator?.role === 'admin', 'admin-required', 403);
}
