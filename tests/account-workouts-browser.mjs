import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || '/var/tmp/montewo-account-qa/node_modules/playwright/index.mjs');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8086';
const catalog = JSON.parse(readFileSync('content/exercises.json', 'utf8'));
const browser = await chromium.launch({headless: true});
const report = {kind: 'Local browser checks with synthetic account API, not live sign-in or cross-device verification', viewports: [], checks: []};
async function waitText(page, selector, pattern) {
  await page.waitForFunction(([s, re]) => new RegExp(re).test(document.querySelector(s)?.textContent || ''), [selector, pattern.source]);
}
async function log(page, exercise = 'bench-press', weight = '185') {
  await page.selectOption('#set-exercise', exercise); await page.fill('#set-weight', weight); await page.fill('#set-reps', '5'); await page.click('#log-set');
  await waitText(page, '#set-count', /^1$/);
}
const fixtureWorkout = (id, title) => ({id, title, performedOn: '2026-10-11', exercises: [{exerciseId: 'bench-press', sets: [{reps: 5, load: '40', unit: 'kg'}]}], createdAt: '2026-10-11'});
async function mockedContext(width) {
  const context = await browser.newContext({viewport: {width, height: 940}, serviceWorkers: 'block'});
  const state = {ready: true, posts: [], tokenCalls: 0, failFirstSave: true, historyFailure: false, expired: false, authHold: false, authURL: null, workouts: new Map(), errors: []};
  const older = fixtureWorkout('00000000-0000-4000-8000-000000000002', 'Older native fixture');
  const newer = fixtureWorkout('00000000-0000-4000-8000-000000000003', 'Native history fixture');
  await context.route('**/api/mobile/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/mobile', '');
    const reply = (data, status = 200) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify(data)});
    if (path === '/config') return reply({apiVersion: 1, available: state.ready, workoutSync: state.ready, authentication: 'synthetic pilot', registration: 'fixture only'});
    if (path === '/exercises') return reply(catalog);
    if (path === '/auth/authorize') {
      state.authURL = url;
      if (state.authHold) return route.fulfill({contentType: 'text/html', body: '<p>Synthetic sign-in window: deliberately waiting.</p>'});
      const target = new URL(url.searchParams.get('redirect_uri')); target.searchParams.set('code', 'c'.repeat(43)); target.searchParams.set('state', url.searchParams.get('state'));
      return route.fulfill({status: 302, headers: {location: target.href}, body: ''});
    }
    if (path === '/auth/token') { state.tokenCalls++; return reply({token: 'mw1_' + 't'.repeat(43), expiresAt: Date.now() + 60000}); }
    assert.equal(request.headers().authorization, 'Bearer mw1_' + 't'.repeat(43));
    if (state.expired) return reply({error: 'session-expired'}, 401);
    if (path === '/strength/me') return reply({actor: {id: 'synthetic-athlete'}});
    if (path === '/auth/logout') return reply({signedOut: true});
    if (path === '/workouts' && request.method() === 'GET') {
      if (state.historyFailure) return route.abort('failed');
      if (url.searchParams.has('before')) return reply({workouts: [older], nextCursor: null});
      return reply({workouts: [...state.workouts.values(), newer], nextCursor: '2026-10-11~cursor'});
    }
    if (path === '/workouts' && request.method() === 'POST') {
      const workout = request.postDataJSON(); state.posts.push(workout);
      const exists = state.workouts.has(workout.id); state.workouts.set(workout.id, {...workout, createdAt: '2026-10-11'});
      if (state.failFirstSave) { state.failFirstSave = false; return route.abort('failed'); }
      return reply({id: workout.id, ...(exists ? {alreadySaved: true} : {})}, exists ? 200 : 201);
    }
    throw Error('Unexpected mocked API path ' + path);
  });
  const page = await context.newPage(); page.on('pageerror', error => state.errors.push(error.message));
  await page.goto(base + '/exercises/#account-workouts');
  await waitText(page, '#account-status', /Backend ready/);
  return {context, page, state};
}
async function signIn(page) {
  await page.click('#account-sign-in');
  await waitText(page, '#account-identity', /synthetic-athlete/);
  await waitText(page, '#account-history', /Native history fixture/);
}
try {
  {
  const actual = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  const page = await actual.newPage();
  await page.goto(base + '/exercises/#account-workouts');
  await waitText(page, '#account-status', /Account services are disabled/);
  assert.equal(await page.isDisabled('#account-sign-in'), true);
  await log(page); await waitText(page, '#total-volume', /^925$/);
  assert.equal(await page.isDisabled('#account-prepare'), true);
  await actual.close(); report.checks.push('Real local API stays disabled; logger still computes 185 × 5 = 925; no save offered.');
  }
  for (const width of [390, 820, 1440]) {
    const {context, page, state} = await mockedContext(width);
    await log(page); await signIn(page);
    assert.equal(state.posts.length, 0);
    await page.click('#account-history-more'); await waitText(page, '#account-history', /Older native fixture/);
    assert.equal(await page.isDisabled('#account-history-more'), true);
    await page.fill('#account-title', 'Reviewed website session');
    await page.click('#account-prepare'); await waitText(page, '#account-review-details', /185 lb × 5/);
    assert.equal(state.posts.length, 0); assert.equal(await page.isDisabled('#log-set'), true);
    await page.click('#account-save-confirm'); await waitText(page, '#account-status', /network request failed/);
    assert.equal(await page.textContent('#set-count'), '1');
    assert.equal(await page.isVisible('#account-save-review'), true);
    await page.click('#account-save-confirm'); await waitText(page, '#account-status', /Account save confirmed/);
    assert.equal(state.posts.length, 2); assert.deepEqual(state.posts[0], state.posts[1]);
    assert.equal(state.workouts.size, 1);
    assert.equal(await page.textContent('#set-count'), '0');
    assert.equal(await page.isDisabled('#log-set'), false);
    await waitText(page, '#account-history', /Reviewed website session/);
    await log(page, 'barbell-row');
    await page.click('#account-prepare'); await waitText(page, '#account-status', /browse-only/);
    assert.equal(state.posts.length, 2); assert.equal(await page.textContent('#set-count'), '1');
    state.historyFailure = true;
    await page.click('#account-history-refresh'); await waitText(page, '#account-history-status', /could not be loaded/);
    assert.equal(await page.locator('#account-history article').count(), 0);
    state.historyFailure = false;
    await page.click('#account-history-refresh'); await waitText(page, '#account-history', /Reviewed website session/);
    await page.click('#account-sign-out'); await waitText(page, '#account-status', /API session was revoked/);
    assert.equal(await page.locator('#account-history article').count(), 0);
    assert.equal(await page.textContent('#set-count'), '1');
    assert.equal(await page.isDisabled('#account-prepare'), true);
    const storage = await page.evaluate(() => ({local: Object.keys(localStorage), session: Object.keys(sessionStorage)}));
    assert.equal(storage.local.some(key => /token|account|workout|session/i.test(key)), false); assert.deepEqual(storage.session, []);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false);
    assert.deepEqual(state.errors, []);
    report.viewports.push({width, passed: true, noOverflow: true, pageErrors: state.errors});
    await context.close();
  }
  report.checks.push('Popup callback; explicit review; no automatic upload; same-ID retry after lost response; history pagination; unsupported movement rejection; private history cleared on error and sign-out; local sets retained; no stored session token.');
  const {context, page, state} = await mockedContext(390);
  state.authHold = true;
  let popupPromise = page.waitForEvent('popup'); await page.click('#account-sign-in'); let popup = await popupPromise;
  await popup.waitForURL('**/api/mobile/auth/authorize?**');
  await page.evaluate(() => window.postMessage({type: 'montewo-account-code', code: 'c'.repeat(43), state: 'x'.repeat(43)}, location.origin));
  assert.equal(state.tokenCalls, 0);
  await popup.evaluate(() => window.opener.postMessage({type: 'montewo-account-code', code: 'c'.repeat(43), state: 'x'.repeat(43)}, location.origin));
  await waitText(page, '#account-status', /verification failed/); assert.equal(state.tokenCalls, 0);
  popupPromise = page.waitForEvent('popup'); await page.click('#account-sign-in'); popup = await popupPromise; await popup.close();
  await waitText(page, '#account-status', /window closed/);
  state.authHold = false; await signIn(page);
  state.expired = true; await page.click('#account-history-refresh');
  await waitText(page, '#account-status', /session expired/);
  assert.equal(await page.locator('#account-history article').count(), 0);
  assert.equal(await page.textContent('#account-identity'), 'No account connected');
  await context.close(); report.checks.push('Wrong-source messages ignored; incorrect state rejected; popup cancellation recovers; expired session clears private records.');
  mkdirSync('docs/website/account-workouts', {recursive: true});
  writeFileSync('docs/website/account-workouts/browser-checks.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
