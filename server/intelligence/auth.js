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

export async function verifyAccessJwt(request, env, fetcher = fetch) {
  requireThat(intelligenceConfigured(env), 'intelligence-not-configured', 503);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
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
  if (localOperatorAllowed(env, url)) {
    return { id: 'local-operator', subject: 'local-development', role: 'admin', via: 'local-development' };
  }
  const claim = await verifyAccessJwt(request, env, deps.fetcher || fetch);
  const row = await env.INTEL_DB.prepare('SELECT subject, role FROM intel_operators WHERE subject=? AND active=1').bind(claim.sub).first();
  requireThat(row, 'operator-not-provisioned', 403);
  return { id: row.subject, subject: row.subject, role: row.role, via: 'cloudflare-access' };
}

export function requireAdmin(operator) {
  requireThat(operator?.role === 'admin', 'admin-required', 403);
}
