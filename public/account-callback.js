// One-time authorization code only. Never access tokens, credentials or athlete data.
const url = new URL(location.href);
const code = url.searchParams.get('code'), state = url.searchParams.get('state');
try { history.replaceState(null, '', location.pathname); } catch { /* No storage fallback. */ }
if (window.opener && /^[A-Za-z0-9_-]{43}$/.test(code || '') && /^[A-Za-z0-9_-]{43}$/.test(state || '')) {
  window.opener.postMessage({type: 'montewo-account-code', code, state}, location.origin);
  document.querySelector('#callback-status').textContent = 'Return sent to the original MONTE WO page. You can close this window. Sign-in is not confirmed until that page verifies it.';
  window.close();
} else {
  document.querySelector('#callback-status').textContent = 'This return could not be verified. Close this window and start sign-in again from the exercise logger. No workout was uploaded.';
}
