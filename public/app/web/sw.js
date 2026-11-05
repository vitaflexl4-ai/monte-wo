/* MONTE WO web app service worker — offline shell for the app directory (/app/web/) ONLY.
   Not a workout sync engine: it never touches /api/, the website or the site-wide /sw.js caches.
   The BUILD id and BUNDLES list below are filled in by scripts/build_webapp.py from the export
   (bundle hash → a new cache per build; older app caches are deleted on activate). */
const BUILD = '7493a1353067aa88';
const BUNDLES = ["_expo/static/js/web/index-7493a1353067aa889f52b842e77e2ae0.js"];
const CACHE = 'mw-webapp-' + BUILD;
const SCOPE = new URL('./', self.location.href).pathname;
const PRECACHE = ['./', 'manifest.webmanifest', 'pwa.js'].concat(BUNDLES).map((p) => new URL(p, self.location.href).pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mw-webapp-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only files of the app directory are handled; API calls and site assets go straight to the network.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  const immutable = url.pathname.startsWith(SCOPE + '_expo/') || url.pathname.startsWith(SCOPE + 'assets/');
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (immutable) {
      // Content-hashed file names: cache first, forever (a new build gets a new cache).
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }
    // Shell files (index, manifest, pwa.js): network first so updates land, cached copy when offline.
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const hit = (await cache.match(request)) || (request.mode === 'navigate' ? await cache.match(SCOPE) : null);
      return hit || new Response('MONTE WO is offline and this file has not been cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
