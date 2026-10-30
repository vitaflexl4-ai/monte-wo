import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {sessionToWorkout, savedWorkoutAcknowledged, saveWorkoutCopy} from '../shared/workout-transfer.js';
import {createAccountClient} from '../public/account-client.js';
const ids = new Set(['bench-press']);
const row = {exerciseId: 'bench-press', name: 'Bench press', weight: 185, reps: 5};
const details = {id: '00000000-0000-4000-8000-000000000001', title: ' My session ', performedOn: '2026-10-11'};
const ready = {available: true, workoutSync: true, apiVersion: 1, authentication: 'pilot', registration: 'enrolled'};
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json'}});
function fixture(handler = () => json({}), now = {value: Date.now()}) {
  const calls = [], cleared = [];
  const client = createAccountClient({origin: 'https://monte.test', cryptoProvider: webcrypto, clock: () => now.value, onClear: () => cleared.push(true), fetcher: async (url, options) => {
    calls.push({url, ...options});
    if (url.endsWith('/config')) return json(ready);
    if (url.endsWith('/auth/token')) return json({token: 'mw1_' + 't'.repeat(43), expiresAt: now.value + 10000});
    return handler(url, options);
  }});
  async function signIn() {
    const authorize = new URL(await client.authorize());
    await client.completeAuthorization({code: 'c'.repeat(43), state: authorize.searchParams.get('state')});
  }
  return {client, calls, cleared, signIn, now};
}
test('account transfer preserves every set, explicit lb units and exact stable workout ID', () => {
  const input = [row, {...row, weight: 40.25, reps: 8}], snapshot = structuredClone(input);
  const result = sessionToWorkout(input, details, ids);
  assert.equal(result.id, details.id); assert.equal(result.title, 'My session');
  assert.deepEqual(result.exercises, [{exerciseId: 'bench-press', sets: [{load: '185', reps: 5, unit: 'lb'}, {load: '40.25', reps: 8, unit: 'lb'}]}]);
  assert.deepEqual(input, snapshot);
});
test('account transfer refuses unknown movements and unsupported bounds without truncation', () => {
  assert.throws(() => sessionToWorkout([], details, ids), /at least one set/);
  assert.throws(() => sessionToWorkout([{...row, exerciseId: 'browse-only'}], details, ids), /browse-only/);
  assert.throws(() => sessionToWorkout([{...row, weight: 3000}], details, ids), /2,204.622/);
  assert.throws(() => sessionToWorkout(Array.from({length: 21}, () => row), details, ids), /20 sets/);
  assert.throws(() => sessionToWorkout([row], {...details, title: ' '}, ids), /invalid text/);
});
test('acknowledgment must match the submitted ID; already-saved confirmation is accepted', () => {
  assert.equal(savedWorkoutAcknowledged({id: details.id}, details.id), true);
  assert.equal(savedWorkoutAcknowledged({id: details.id, alreadySaved: true}, details.id), true);
  for (const receipt of [null, {}, {id: 'different'}, {id: details.id, alreadySaved: 'yes'}]) assert.equal(savedWorkoutAcknowledged(receipt, details.id), false);
});
test('public readiness and PKCE are same-origin, credential-free, and do not post a workout', async () => {
  const f = fixture(); const url = new URL(await f.client.authorize());
  assert.equal(url.origin, 'https://monte.test');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://monte.test/account/callback/');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(url.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert.equal(f.client.signedIn(), false);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].method, 'GET');
  assert.equal(f.calls[0].credentials, 'omit'); assert.equal(f.calls[0].redirect, 'error');
  assert.equal(f.calls[0].headers.Authorization, undefined);
  await assert.rejects(f.client.history(ids), /authentication-required/);
});
test('PKCE rejects wrong state, replays, expired grants and malformed token responses', async () => {
  const f = fixture(); const url = new URL(await f.client.authorize());
  await assert.rejects(f.client.completeAuthorization({code: 'c'.repeat(43), state: 'wrong'}), /invalid-auth-state/);
  assert.equal(f.calls.length, 1);
  await assert.rejects(f.client.completeAuthorization({code: 'c'.repeat(43), state: url.searchParams.get('state')}), /invalid-auth-state/);
  const expired = new URL(await f.client.authorize()); f.now.value += 300001;
  await assert.rejects(f.client.completeAuthorization({code: 'c'.repeat(43), state: expired.searchParams.get('state')}), /invalid-auth-state/);
  const invalid = createAccountClient({origin: 'https://monte.test', fetcher: async url => json(url.endsWith('/config') ? ready : {token: 'bad', expiresAt: Date.now() + 10000})});
  const u = new URL(await invalid.authorize());
  await assert.rejects(invalid.completeAuthorization({code: 'c'.repeat(43), state: u.searchParams.get('state')}), /invalid-session-response/);
});
test('successful login uses S256 verifier binding and bearer only on private reads', async () => {
  const f = fixture(() => json({workouts: [], nextCursor: null}));
  const auth = new URL(await f.client.authorize());
  await f.client.completeAuthorization({code: 'c'.repeat(43), state: auth.searchParams.get('state')});
  const exchange = f.calls.find(c => c.url.endsWith('/auth/token'));
  const body = JSON.parse(exchange.body);
  const challenge = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(body.codeVerifier))).toString('base64url');
  assert.equal(challenge, auth.searchParams.get('code_challenge'));
  assert.equal(exchange.headers.Authorization, undefined);
  await f.client.history(ids);
  assert.equal(f.calls.at(-1).headers.Authorization, 'Bearer mw1_' + 't'.repeat(43));
  assert.equal(f.calls.at(-1).cache, 'no-store');
});
test('retry after an ambiguous write sends identical ID and payload, not a new record', async () => {
  let writes = 0;
  const f = fixture((url, options) => {
    if (options.method === 'POST') {
      if (++writes === 1) throw Error('connection lost after server write');
      return json({id: details.id, alreadySaved: true});
    }
  });
  await f.signIn(); const payload = sessionToWorkout([row], details, ids);
  await assert.rejects(f.client.save(payload, ids), /network-unavailable/);
  const receipt = await f.client.save(payload, ids);
  assert.equal(receipt.alreadySaved, true);
  const requests = f.calls.filter(c => c.url.endsWith('/workouts'));
  assert.equal(requests.length, 2); assert.equal(requests[0].body, requests[1].body);
});
test('an unrelated receipt cannot clear a local workout as saved', async () => {
  const f = fixture(() => json({id: 'wrong'})); await f.signIn();
  await assert.rejects(f.client.save(sessionToWorkout([row], details, ids), ids), error => error.code === 'save-not-confirmed');
});
test('expired or rejected sessions are cleared; stale async responses cannot restore private history', async () => {
  const f = fixture(() => json({error: 'session-expired'}, 401)); await f.signIn();
  await assert.rejects(f.client.history(ids), /session-expired/);
  assert.equal(f.client.signedIn(), false); assert.equal(f.cleared.length, 1);
  await f.signIn(); f.now.value += 10001;
  assert.equal(f.client.signedIn(), false);
  let resolve;
  const late = fixture(() => new Promise(r => { resolve = r; })); await late.signIn();
  const history = late.client.history(ids); late.client.clear();
  resolve(json({workouts: [], nextCursor: null}));
  await assert.rejects(history, /session-expired|session-changed/);
});
test('sign out clears memory before revocation and fails honestly if server is unreachable', async () => {
  const f = fixture(() => { throw Error('offline'); }); await f.signIn();
  const logout = f.client.signOut(); assert.equal(f.client.signedIn(), false);
  await assert.rejects(logout, /revocation-unconfirmed/);
  await assert.rejects(f.client.history(ids), /authentication-required/);
});
test('history validates records and supports opaque cursor pagination', async () => {
  const payload = sessionToWorkout([row], details, ids);
  const f = fixture(() => json({workouts: [{...payload, createdAt: '2026-10-11'}], nextCursor: '2026-10-11~id'})); await f.signIn();
  assert.equal((await f.client.history(ids, '2026-10-11~id')).workouts[0].id, details.id);
  assert.match(f.calls.at(-1).url, /\?before=/);
  const bad = fixture(() => json({workouts: [{title: 'not a workout'}], nextCursor: null})); await bad.signIn();
  await assert.rejects(bad.client.history(ids), /invalid-history-response/);
});
test('disabled/incompatible config never permits authentication', async () => {
  for (const data of [{...ready, available: false}, {...ready, workoutSync: false}, {...ready, apiVersion: 2}, {error: 'Not implemented in this build'}]) {
    let calls = 0;
    const client = createAccountClient({origin: 'https://monte.test', fetcher: async () => { calls++; return json(data); }});
    await assert.rejects(client.authorize()); assert.equal(client.signedIn(), false); assert.equal(calls, 1);
  }
  for (const origin of ['http://untrusted.example', 'ftp://localhost', 'https://user:pass@monte.test']) assert.throws(() => createAccountClient({origin}), /secure/);
});
test('publication mirrors shared contracts and excludes auth callbacks/private APIs from caching', () => {
  const read = path => readFileSync(path, 'utf8');
  for (const name of ['workouts.js', 'workout-transfer.js']) assert.equal(read('public/' + name), read('shared/' + name));
  const client = read('public/account-client.js'); assert.doesNotMatch(client, /localStorage|sessionStorage|document\.cookie/);
  const ui = read('public/account-workouts.js'); assert.match(ui, /event.origin !== location.origin/); assert.match(ui, /event.source !== popup/); assert.doesNotMatch(ui, /innerHTML/);
  const sw = read('public/sw.js'); assert.match(sw, /if\(url.pathname.startsWith\('\/account\/'\)\)return/); assert.match(sw, /if\(url.pathname.startsWith\('\/api\/'\)&&!isMedia\)return/);
  assert.doesNotMatch(sw.split('self.addEventListener')[0], /account\/callback/);
  assert.match(read('public/_headers'), /\/account\/callback\/\*[\s\S]*Cache-Control: no-store[\s\S]*Referrer-Policy: no-referrer/);
});

test('explicit device copy keeps source immutable, validates receipt, and refuses changed accounts', async () => {
  const workout = sessionToWorkout([row], details, ids), original = structuredClone(workout);
  let current = true, sends = 0;
  await assert.rejects(saveWorkoutCopy(workout, ids, async () => { sends++; }, () => false), error => error.code === 'account-session-changed');
  assert.equal(sends, 0);
  await assert.rejects(saveWorkoutCopy(workout, ids, async snapshot => {
    sends++; assert.deepEqual(snapshot, original); current = false; return {id: snapshot.id};
  }, () => current), error => error.code === 'account-session-changed');
  assert.equal(sends, 1); assert.deepEqual(workout, original);
  current = true;
  assert.equal((await saveWorkoutCopy(workout, ids, async snapshot => ({id: snapshot.id, alreadySaved: true}), () => current)).alreadySaved, true);
  assert.deepEqual(workout, original);
});
test('native device-to-account copy requires confirmation and uses the shared session-bound save guard', () => {
  const app = readFileSync('apps/mobile/App.tsx', 'utf8'), api = readFileSync('apps/mobile/src/api.ts', 'utf8');
  assert.match(app, /Save a copy to account/); assert.match(app, /confirm\("Save this workout to your account/);
  assert.match(app, /saveAccountWorkout\(w,[^;]+revision\)/);
  assert.match(api, /sessionRevision === expectedRevision/); assert.match(api, /saveWorkoutCopy/);
  assert.doesNotMatch(app, /await post\("\/workouts", payload\(\)\)/);
});
