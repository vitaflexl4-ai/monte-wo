// ULTRON Privacy-First Aggregate Pulse — zero cookies, zero user IDs, zero raw IPs.
// Honors Global Privacy Control (navigator.globalPrivacyControl), Do Not Track (navigator.doNotTrack),
// and explicit local opt-out (localStorage['mw_analytics_optout'] === '1').
(() => {
  'use strict';
  try {
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    try { if (localStorage.getItem('mw_analytics_optout') === '1') return; } catch { /* storage blocked */ }
    if (typeof navigator.sendBeacon !== 'function') return;

    const send = (metric, dimension) => {
      try {
        const cleanDim = String(dimension || location.pathname || '/').replace(/[^a-z0-9/_\-.]/gi, '').slice(0, 60) || '/';
        const blob = new Blob([JSON.stringify({ metric, dimension: cleanDim })], { type: 'application/json' });
        navigator.sendBeacon('/api/intelligence/pulse', blob);
      } catch { /* best-effort aggregate counter only */ }
    };

    send('pageviews', location.pathname || '/');

    document.addEventListener('click', e => {
      const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (/\.apk(\?|$)/i.test(href) || link.hasAttribute('data-apk-download')) {
        send('apk_download', 'android-apk');
      }
    }, { passive: true });

    const waitlistForm = document.getElementById('waitlist-form');
    if (waitlistForm) {
      let focused = false;
      waitlistForm.addEventListener('focusin', () => {
        if (!focused) { focused = true; send('waitlist_focus', '/waitlist/'); }
      }, { passive: true });
      const statusNode = document.getElementById('waitlist-status');
      if (statusNode && typeof MutationObserver === 'function') {
        let lastSent = '';
        new MutationObserver(() => {
          const txt = (statusNode.textContent || '').toLowerCase();
          if (!txt || txt === lastSent) return;
          if (/you.?re on the list|enrolled|confirmed|recorded/i.test(txt)) {
            lastSent = txt; send('waitlist_submit_ok', '/waitlist/');
          } else if (/error|unavailable|could not|invalid|failed/i.test(txt)) {
            lastSent = txt; send('waitlist_submit_err', '/waitlist/');
          }
        }).observe(statusNode, { childList: true, characterData: true, subtree: true });
      }
    }
  } catch { /* silent fail-safe */ }
})();
