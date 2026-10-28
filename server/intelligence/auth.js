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

// Bounded 5-minute JWK cache for production edge verification (avoids subrequest latency on
// every dashboard poll while auto-refreshing immediately if a rotated kid arrives).
const jwkCache = new Map();
const JWK_TTL_MS = 5 * 60 * 1000;

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

// Privacy-preserving per-client rate-limit bucket: hashes CF-Connecting-IP with a daily
// epoch + secret salt so raw IPs are NEVER stored in D1 or logs.
export async function hashClientBucket(request, env, scope = 'ingest') {
  const ip = request.headers.get('CF-Connecting-IP') || 'edge-anon';
  const day = new Date().toISOString().slice(0, 10);
  const salt = String(env.RATE_LIMIT_SALT || env.INTELLIGENCE_INGEST_KEY || 'mw-intel-ephemeral-salt');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${scope}:${day}:${salt}:${ip}`));
  const hex = [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${scope}:client:${hex}`;
}

// Private PREVIEW access for development environments only (e.g. ephemeral preview hosts).
// Honored ONLY when LOCAL_DEVELOPMENT=true AND PREVIEW_TOKEN is set; production uses Cloudflare
// Access. A preview host without the bearer token is refused exactly like any public hostname.
export function previewTokenAllowed(env, url, request) {
  if (env.LOCAL_DEVELOPMENT !== 'true' || typeof env.PREVIEW_TOKEN !== 'string' || env.PREVIEW_TOKEN.length < 16) return false;
  const match = /^Bearer ([A-Za-z0-9_-]{16,128})$/.exec(request.headers.get('Authorization') || '');
  return !!match && timingSafeEqual(match[1], env.PREVIEW_TOKEN);
}

async function fetchIssuerKeys(issuer, fetcher, setStage) {
  setStage('idp-certs-fetch');
  let res;
  try {
    res = await fetcher(issuer + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
  } catch {
    setStage('idp-certs-fetch-follow');
    res = await fetcher(issuer + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000), redirect: 'follow' });
  }
  requireThat(res.ok, 'identity-provider-unavailable', 503);
  setStage('idp-certs-parse');
  const keys = await res.json();
  return Array.isArray(keys?.keys) ? keys.keys : [];
}

export async function verifyAccessJwt(request, env, fetcher = fetch) {
  if (!intelligenceConfigured(env)) {
    const err = new IntelError('intelligence-not-configured', 503);
    err.hint = 'Fail-closed: the Access login (INTELLIGENCE_ACCESS_ISSUER / INTELLIGENCE_ACCESS_AUD) is not configured, so no data is served even though the backend may be deployed. Live component status: GET /api/intelligence/status';
    throw err;
  }
  const cookieJwt = (() => {
    for (const part of (request.headers.get('Cookie') || '').split(';')) {
      const c = part.trim();
      if (!c.startsWith('CF_Authorization=')) continue;
      let v = c.slice('CF_Authorization='.length).trim();
      if (v.length > 1 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      try { v = decodeURIComponent(v); } catch { /* keep the raw value */ }
      return v || null;
    }
    return null;
  })();
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookieJwt;
  requireThat(token && token.length < 12000, 'authentication-required', 401);
  let stage = 'token-parse';
  const setStage = s => { stage = s; };
  try {
    const parts = token.split('.');
    requireThat(parts.length === 3, 'invalid-token', 401);
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claim = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    requireThat(header.alg === 'RS256' && typeof header.kid === 'string' && !header.jku && !header.jwk && !header.x5u, 'invalid-token', 401);
    const now = Math.floor(Date.now() / 1000);
    requireThat(claim.iss === env.INTELLIGENCE_ACCESS_ISSUER
      && (Array.isArray(claim.aud) ? claim.aud : [claim.aud]).includes(env.INTELLIGENCE_ACCESS_AUD)
      && Number.isInteger(claim.exp) && claim.exp > now
      && Number.isInteger(claim.iat) && claim.iat <= now + 30
      && (!claim.nbf || claim.nbf <= now)
      && typeof claim.sub === 'string' && claim.sub.length <= 200, 'invalid-token', 401);

    const useCache = fetcher === fetch;
    const cached = useCache ? jwkCache.get(env.INTELLIGENCE_ACCESS_ISSUER) : null;
    let keyList = (cached && cached.expiresAt > Date.now()) ? cached.keys : null;
    const matchJwk = list => list?.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256'));
    let jwk = matchJwk(keyList);
    if (!jwk) {
      keyList = await fetchIssuerKeys(env.INTELLIGENCE_ACCESS_ISSUER, fetcher, setStage);
      if (useCache) jwkCache.set(env.INTELLIGENCE_ACCESS_ISSUER, { keys: keyList, expiresAt: Date.now() + JWK_TTL_MS });
      jwk = matchJwk(keyList);
    }
    requireThat(jwk, 'invalid-token', 401);
    stage = 'signature-verify';
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    requireThat(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])), 'invalid-token', 401);
    return claim;
  } catch (e) {
    if (e instanceof IntelError) throw e;
    const err = new IntelError('authentication-failed', 401);
    err.hint = 'Verification failed at stage "' + stage + '" (' + (e && e.name ? e.name : 'unknown error') + ')';
    throw err;
  }
}

// Returns {id, subject, role} or throws. Mutations require role 'admin'.
export async function authenticateOperator(request, env, url, deps = {}) {
  requireThat(!!env.INTEL_DB, 'intelligence-not-configured', 503);
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
    // Safe to reveal only the caller's own authenticated subject so the owner can provision it.
    const err = new IntelError('operator-not-provisioned', 403);
    err.hint = 'Authenticated as ' + claim.sub + '. Ask the deployment owner to run: node scripts/deploy-intelligence.mjs --grant-operator "' + claim.sub + '"';
    throw err;
  }
  return { id: row.subject, subject: row.subject, role: row.role, via: 'cloudflare-access' };
}

export function requireAdmin(operator) {
  requireThat(operator?.role === 'admin', 'admin-required', 403);
}
