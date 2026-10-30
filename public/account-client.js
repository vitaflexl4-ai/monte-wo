import {mobileConfigSupported} from './service-readiness.js';
import {validateWorkout} from './workouts.js';
import {saveWorkoutCopy} from './workout-transfer.js';
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
export class AccountError extends Error {
  constructor(code) { super(code); this.code = code; }
}
// Same-origin API, opaque bearer in memory only, no cookie/token forwarding on redirects.
export function createAccountClient({origin, fetcher = fetch, cryptoProvider = crypto, clock = Date.now, onClear = () => {}}) {
  const base = new URL(origin);
  const localHTTP = base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname);
  if (base.origin !== origin || (base.protocol !== 'https:' && !localHTTP)) throw Error('A secure, same-origin API is required.');
  let session = null, pending = null, generation = 0;
  function clear() { session = null; pending = null; generation++; onClear(); }
  function signedIn() {
    if (session && session.expiresAt <= clock()) clear();
    return !!session;
  }
  async function request(path, {body, authenticated = false} = {}) {
    if (authenticated && !signedIn()) throw new AccountError('authentication-required');
    const epoch = generation, controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = {'Accept': 'application/json'};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (authenticated) headers.Authorization = 'Bearer ' + session.token;
      const response = await fetcher(origin + '/api/mobile' + path, {
        method: body === undefined ? 'GET' : 'POST', headers,
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
        credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal,
      });
      if (!response.headers.get('Content-Type')?.includes('application/json')) throw new AccountError('mobile-api-incompatible');
      const data = await response.json();
      if (authenticated && !signedIn()) throw new AccountError('session-expired');
      if (epoch !== generation) throw new AccountError('session-changed');
      if (!response.ok) {
        if (response.status === 401 || ['mobile-backend-unavailable', 'application-database-not-isolated-or-migrated'].includes(data?.error)) clear();
        throw new AccountError(data?.error || 'request-failed');
      }
      return data;
    } catch (error) {
      if (error instanceof AccountError) throw error;
      throw new AccountError(error.name === 'AbortError' ? 'request-timed-out' : 'network-unavailable');
    } finally { clearTimeout(timer); }
  }
  async function check() {
    const config = await request('/config');
    if (!mobileConfigSupported(config)) { clear(); throw new AccountError('mobile-api-incompatible'); }
    if (!config.available || !config.workoutSync) { clear(); throw new AccountError('mobile-backend-unavailable'); }
    return config;
  }
  return {
    signedIn, clear, check,
    async authorize() {
      if (signedIn()) throw new AccountError('sign-out-first');
      await check();
      const epoch = generation;
      const verifier = b64(cryptoProvider.getRandomValues(new Uint8Array(32)));
      const challenge = b64(await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      if (epoch !== generation) throw new AccountError('session-changed');
      const state = b64(cryptoProvider.getRandomValues(new Uint8Array(32)));
      const redirectUri = origin + '/account/callback/';
      pending = {verifier, state, redirectUri, expires: clock() + 300000};
      return origin + '/api/mobile/auth/authorize?' + new URLSearchParams({code_challenge: challenge, code_challenge_method: 'S256', state, redirect_uri: redirectUri});
    },
    cancelAuthorization() { pending = null; generation++; },
    async completeAuthorization({code, state}) {
      const grant = pending; pending = null;
      if (!grant || grant.expires <= clock() || state !== grant.state || !/^[A-Za-z0-9_-]{43}$/.test(code || '')) throw new AccountError('invalid-auth-state');
      const epoch = generation;
      const result = await request('/auth/token', {body: {code, codeVerifier: grant.verifier, redirectUri: grant.redirectUri}});
      if (epoch !== generation) throw new AccountError('session-changed');
      if (!/^mw1_[A-Za-z0-9_-]{43}$/.test(result?.token || '') || !Number.isFinite(result.expiresAt) || result.expiresAt <= clock()) throw new AccountError('invalid-session-response');
      session = {token: result.token, expiresAt: result.expiresAt}; generation++;
    },
    async identity() {
      const data = await request('/strength/me', {authenticated: true});
      if (typeof data?.actor?.id !== 'string' || !data.actor.id || data.actor.id.length > 200) throw new AccountError('invalid-identity-response');
      return {id: data.actor.id};
    },
    async catalog() {
      const data = await request('/exercises');
      if (!Array.isArray(data?.exercises) || !data.exercises.length || data.exercises.some(e => typeof e.id !== 'string' || typeof e.name !== 'string')) throw new AccountError('invalid-catalog-response');
      return data.exercises;
    },
    async history(exerciseIds, cursor = null) {
      const data = await request('/workouts' + (cursor ? '?before=' + encodeURIComponent(cursor) : ''), {authenticated: true});
      if (!Array.isArray(data?.workouts) || data.workouts.length > 50 || !(data.nextCursor === null || (typeof data.nextCursor === 'string' && data.nextCursor.length <= 100))) throw new AccountError('invalid-history-response');
      try {
        data.workouts.forEach(({createdAt, ...workout}) => validateWorkout(workout, exerciseIds));
      } catch { throw new AccountError('invalid-history-response'); }
      return data;
    },
    async save(workout, exerciseIds) {
      const epoch = generation;
      return saveWorkoutCopy(workout, exerciseIds,
        snapshot => request('/workouts', {body: snapshot, authenticated: true}),
        () => signedIn() && epoch === generation);
    },
    async signOut() {
      // Clear UI immediately, even when revocation cannot reach the server.
      const token = session?.token;
      clear();
      if (!token) return;
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetcher(origin + '/api/mobile/auth/logout', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, body: '{}', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal});
        if (!response.ok) throw Error('revocation-failed');
        const data = await response.json();
        if (data.signedOut !== true) throw Error('revocation-failed');
      } catch { throw new AccountError('revocation-unconfirmed'); }
      finally { clearTimeout(timer); }
    },
  };
}
export function accountErrorMessage(error) {
  const messages = {
    'mobile-backend-unavailable': 'Account services are disabled on this deployment. Local training still works; nothing was uploaded.',
    'mobile-api-incompatible': 'This deployment does not provide the supported mobile API. No connection is assumed.',
    'authentication-required': 'Sign in to your enrolled pilot account first.',
    'session-expired': 'Your account session expired. Sign in again. Local sets are unchanged.',
    'account-not-provisioned': 'This identity is not enrolled in the restricted pilot. Public signup is not available.',
    'network-unavailable': 'The network request failed. A save may have reached the server. Keep this page open and retry the same prepared workout, or check account history.',
    'request-timed-out': 'The request timed out. A save may have reached the server. Retry the same prepared workout, not a new copy.',
    'save-not-confirmed': 'The server did not confirm this workout ID. Keep the prepared workout and check history before retrying.',
    'workout-id-conflict': 'This workout ID already has different contents or ownership. Nothing was overwritten. Check account history.',
    'invalid-auth-state': 'Sign-in verification failed or expired. Start sign-in again.',
    'session-changed': 'The account session changed. The old response was ignored.',
    'revocation-unconfirmed': 'Signed out on this page. Server revocation could not be confirmed; the remote session may remain valid until expiry. This does not sign out of Cloudflare Access.',
  };
  return messages[error.code] || (error instanceof AccountError ? 'Account request failed (' + error.code + '). No success is assumed.' : error.message || 'Unable to complete this action.');
}
