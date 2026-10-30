import {createAccountClient, accountErrorMessage} from './account-client.js';
import {sessionToWorkout} from './workout-transfer.js';
import {workoutVolume} from './workouts.js';
const $ = selector => document.querySelector(selector);
export function bindAccountWorkouts(logger) {
  const panel = $('#account-workouts');
  if (!panel) return;
  let ready = false, busy = false, prepared = null, attempted = false, catalog = new Map(), cursor = null, popup = null, popupTimer = null, authTimer = null;
  const status = text => { $('#account-status').textContent = text; };
  const historyStatus = text => { $('#account-history-status').textContent = text; };
  const client = createAccountClient({origin: location.origin, onClear: () => {
    prepared = null; attempted = false; cursor = null; logger.lock(false);
    $('#account-save-review').hidden = true;
    $('#account-history').replaceChildren();
    $('#account-identity').textContent = 'No account connected';
    historyStatus('Account history is hidden until you sign in. Local sets are unchanged.');
  }});
  function paint() {
    const signed = client.signedIn();
    $('#account-sign-in').disabled = busy || !ready || signed;
    $('#account-sign-out').disabled = busy || !signed;
    $('#account-check').disabled = busy;
    $('#account-history-refresh').disabled = busy || !signed;
    $('#account-history-more').disabled = busy || !signed || !cursor;
    $('#account-prepare').disabled = busy || !signed || !ready || !logger.snapshot().length || !!prepared;
    $('#account-save-confirm').disabled = busy || !signed || !ready || !prepared;
    $('#account-save-cancel').disabled = busy;
    $('#account-title').disabled = busy || !!prepared;
    $('#account-date').disabled = busy || !!prepared;
    panel.setAttribute('aria-busy', String(busy));
  }
  async function operate(action) {
    if (busy) return;
    busy = true; paint();
    try { await action(); }
    catch (error) { status(accountErrorMessage(error)); }
    finally { busy = false; paint(); }
  }
  function stopPopup() {
    clearInterval(popupTimer); clearTimeout(authTimer);
    if (popup && !popup.closed) popup.close();
    popup = null;
  }
  function cancelLogin(message) {
    stopPopup(); client.cancelAuthorization(); busy = false; status(message); paint();
  }
  function renderWorkout(workout) {
    const article = document.createElement('article'); article.className = 'account-history-card';
    const heading = document.createElement('h4'); heading.textContent = workout.title;
    const date = document.createElement('p'); date.textContent = workout.performedOn + ' · Training only · no rank awarded';
    const id = document.createElement('small'); id.textContent = 'Workout ID: ' + workout.id;
    const list = document.createElement('ul');
    for (const exercise of workout.exercises) {
      const li = document.createElement('li');
      li.textContent = (catalog.get(exercise.exerciseId)?.name || exercise.exerciseId) + ': ' + exercise.sets.map(set => set.load + ' ' + set.unit + ' × ' + set.reps).join('; ');
      list.append(li);
    }
    const volumes = workoutVolume(workout), total = document.createElement('p');
    total.textContent = 'Volume: ' + volumes.lb + ' lb·reps / ' + volumes.kg + ' kg·reps (units kept separate)';
    article.append(heading, date, list, total, id); return article;
  }
  async function loadHistory(older = false) {
    if (!older) { $('#account-history').replaceChildren(); cursor = null; }
    historyStatus('Reading private account history…');
    try {
      const page = await client.history(new Set(catalog.keys()), older ? cursor : null);
      for (const workout of page.workouts) $('#account-history').append(renderWorkout(workout));
      cursor = page.nextCursor;
      historyStatus($('#account-history').children.length ? 'Account records read from this server. Refresh the native app while signed into this same account to compare. Cross-device sync is not verified by this screen.' : 'No workouts were returned for this account. Device-only history is separate.');
    } catch (error) {
      $('#account-history').replaceChildren(); cursor = null;
      historyStatus('Account history could not be loaded. No stale records are shown.');
      throw error;
    }
  }
  $('#account-title').value = 'Training session';
  $('#account-date').value = new Date().toISOString().slice(0, 10);
  $('#account-date').max = new Date().toISOString().slice(0, 10);
  $('#account-origin').textContent = location.origin;
  $('#account-check').addEventListener('click', () => operate(async () => {
    ready = false;
    $('#account-history').replaceChildren(); cursor = null;
    historyStatus('Checking account service. Refresh private history after the check.');
    await client.check();
    catalog = new Map((await client.catalog()).map(exercise => [exercise.id, exercise])); ready = true;
    status('Backend ready. ' + catalog.size + ' canonical exercises can be saved. Sign-in is required; public signup is not available. Readiness is not proof of sync.');
  }));
  $('#account-sign-in').addEventListener('click', () => {
    if (busy || !ready || client.signedIn()) return;
    // Open directly in the click handler, before awaits, so popup blockers can be reported.
    popup = window.open('about:blank', '_blank', 'popup,width=520,height=720');
    if (!popup) { status('Your browser blocked the sign-in window. Allow popups for this site and try again. Local sets are unchanged.'); return; }
    busy = true; paint(); status('Complete the enrolled-pilot sign-in in the new window. No workout will be uploaded by signing in.');
    popupTimer = setInterval(() => { if (popup?.closed) cancelLogin('Sign-in window closed. No account connection is assumed.'); }, 500);
    authTimer = setTimeout(() => cancelLogin('Sign-in timed out. Try again; local sets are unchanged.'), 300000);
    client.authorize().then(url => { if (popup && !popup.closed) popup.location.replace(url); }).catch(error => cancelLogin(accountErrorMessage(error)));
  });
  window.addEventListener('message', async event => {
    if (event.origin !== location.origin || !popup || event.source !== popup || event.data?.type !== 'montewo-account-code') return;
    stopPopup();
    try {
      await client.completeAuthorization({code: event.data.code, state: event.data.state});
      const actor = await client.identity();
      $('#account-identity').textContent = 'Signed in · account ' + actor.id;
      catalog = new Map((await client.catalog()).map(exercise => [exercise.id, exercise]));
      status('Signed in to the pilot. Review a session before saving it. Nothing has been uploaded automatically.');
      await loadHistory();
    } catch (error) { client.clear(); status(accountErrorMessage(error)); }
    finally { busy = false; paint(); }
  });
  $('#account-sign-out').addEventListener('click', () => operate(async () => {
    await client.signOut(); status('Signed out on this page and the API session was revoked. Local sets are unchanged. Cloudflare Access may still remember your identity; this is not an identity-provider logout.');
  }));
  $('#account-history-refresh').addEventListener('click', () => operate(() => loadHistory()));
  $('#account-history-more').addEventListener('click', () => operate(() => loadHistory(true)));
  $('#account-prepare').addEventListener('click', () => {
    if (busy || prepared || !client.signedIn() || !ready) return;
    try {
      prepared = sessionToWorkout(logger.snapshot(), {id: crypto.randomUUID(), title: $('#account-title').value, performedOn: $('#account-date').value}, new Set(catalog.keys()));
      attempted = false; logger.lock(true);
      $('#account-review-details').replaceChildren(renderWorkout(prepared));
      $('#account-save-review').hidden = false;
      status('Review the exact workout below. Only Confirm account save sends it to your signed-in account. The local logger is paused while this copy is prepared.');
      $('#account-save-confirm').textContent = 'Confirm account save'; paint(); $('#account-save-confirm').focus();
    } catch (error) { prepared = null; status(accountErrorMessage(error)); }
  });
  $('#account-save-cancel').addEventListener('click', () => {
    if (busy || !prepared) return;
    if (attempted && !window.confirm('A save may already exist on the server. Cancel this retry? Check account history before preparing another copy. Local sets will remain.')) return;
    prepared = null; attempted = false; logger.lock(false); $('#account-save-review').hidden = true;
    status('Prepared copy discarded. Local sets remain. This does not delete any record already saved to an account.'); paint();
  });
  $('#account-save-confirm').addEventListener('click', () => operate(async () => {
    if (!prepared || !ready) return;
    attempted = true; $('#account-save-confirm').textContent = 'Retry this same workout';
    const snapshot = prepared;
    await client.save(snapshot, new Set(catalog.keys()));
    prepared = null; attempted = false; logger.lock(false);
    logger.clear('Server confirmed workout ' + snapshot.id + '. Local session cleared; no rank was awarded.');
    $('#account-save-review').hidden = true;
    status('Account save confirmed for ' + snapshot.id + '. Device-only history was not imported or changed.');
    try { await loadHistory(); }
    catch { status('Workout save was confirmed, but history refresh failed. Use Refresh account history; do not submit a new copy.'); }
  }));
  logger.subscribe(paint);
  let expiryTimer = setInterval(paint, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
  window.addEventListener('pagehide', () => { stopPopup(); clearInterval(expiryTimer); client.clear(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { clearInterval(expiryTimer); expiryTimer = setInterval(paint, 5000); client.clear(); busy = false; status('This page was restored. Sign in again to read account records.'); paint(); } });
  window.addEventListener('beforeunload', event => { if (prepared) { event.preventDefault(); event.returnValue = ''; } });
  paint();
  // Public checks only; never sign in, upload, retry or read private records automatically.
  $('#account-check').click();
}
