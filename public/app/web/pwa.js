/* MONTE WO web app — browser chrome around the React Native (web) bundle: loading state, offline
   service worker and the install flow (Android/desktop install prompt, iOS "Add to Home Screen" hint).
   Plain script outside the React tree; no analytics, no network calls of its own. */
(function () {
  'use strict';
  var root = document.getElementById('root');
  var splash = document.getElementById('mw-splash');

  // 1. Loading state: removed as soon as the app mounts; honest hint if nothing mounts in time.
  if (root && splash) {
    var observer = new MutationObserver(function () {
      if (root.childElementCount) {
        splash.remove();
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });
    setTimeout(function () {
      var note = splash.isConnected && splash.querySelector('.mw-splash-note');
      if (note && !root.childElementCount) note.textContent = 'Still loading — check your connection, then reload.';
    }, 12000);
  }

  // 2. Offline shell for this directory only (sw.js next to this file → scope = the app directory).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__MW_NATIVE) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
    });
  }

  // 3. Install flow. Nothing is shown when already installed (standalone) or after "Not now".
  var DISMISS_KEY = 'mw.webapp.install.dismissed';
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) return;
  try { if (localStorage.getItem(DISMISS_KEY) === '1') return; } catch (e) { /* storage blocked: banner is simply not persisted */ }

  var banner = null;
  function removeBanner() {
    if (banner) { banner.remove(); banner = null; }
  }
  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* ignore */ }
    removeBanner();
  }
  function showBanner(text, actionLabel, onAction) {
    removeBanner();
    banner = document.createElement('div');
    banner.id = 'mw-install';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Install MONTE WO');
    var message = document.createElement('p');
    message.textContent = text;
    banner.appendChild(message);
    if (actionLabel) {
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'mw-install-action';
      action.textContent = actionLabel;
      action.addEventListener('click', onAction);
      banner.appendChild(action);
    }
    var later = document.createElement('button');
    later.type = 'button';
    later.textContent = 'Not now';
    later.addEventListener('click', dismiss);
    banner.appendChild(later);
    document.body.appendChild(banner);
  }

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showBanner('Install MONTE WO on this device — full screen, on your home screen.', 'Install', function () {
      if (!deferredPrompt) return;
      var prompt = deferredPrompt;
      deferredPrompt = null;
      prompt.prompt();
      prompt.userChoice.then(removeBanner, removeBanner);
    });
  });
  window.addEventListener('appinstalled', removeBanner);

  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  if (ios && safari) showBanner('Install MONTE WO: tap Share, then “Add to Home Screen”.', null, null);
})();
