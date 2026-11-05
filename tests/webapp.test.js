// The MONTE WO web app: apps/mobile (Expo / React Native — the same code as the Android and iOS builds)
// exported by scripts/build_webapp.py into public/app/web/ and linked from the website. These checks run
// without the Expo toolchain: they verify the committed export, its PWA files, the site wiring and the
// honest copy. CI additionally re-exports the app and diffs it (`python3 scripts/build_webapp.py --check`)
// and loads it in a browser (tests/webapp-browser.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';

const file=p=>new URL('../'+p,import.meta.url);
const read=p=>readFileSync(file(p),'utf8');
const exists=p=>existsSync(file(p));
const WEB='public/app/web/';
const html=read(WEB+'index.html');
const info=JSON.parse(read(WEB+'build-info.json'));
const manifest=JSON.parse(read(WEB+'manifest.webmanifest'));
const sw=read(WEB+'sw.js');
const site=JSON.parse(read('content/website/site.json'));
const routes=JSON.parse(read('public/website-routes.json'));
const page=route=>read('public'+(route==='/'?'/index.html':route+'index.html'));

test('Web app: the export is complete, self-consistent and served from /app/web/',()=>{
 for(const f of ['index.html','manifest.webmanifest','sw.js','pwa.js','build-info.json'])assert.ok(exists(WEB+f),f);
 assert.equal(info.baseUrl,'/app/web/');assert.match(info.build,/^[0-9a-f]{16}$/);assert.ok(info.appVersion,'app version read from apps/mobile/app.config.ts');
 assert.ok(Array.isArray(info.bundles)&&info.bundles.length>=1);
 for(const b of info.bundles){assert.match(b,/^_expo\/static\/js\/web\/[^/]+\.(js|css)$/);assert.ok(exists(WEB+b),b+' must exist');}
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(scripts,['pwa.js','/app/web/'+info.bundles.find(b=>b.endsWith('.js'))],'pwa.js (relative) + the hashed bundle under the site base path');
 const bundleFiles=readdirSync(file(WEB+'_expo/static/js/web')).filter(f=>/\.(js|css)$/.test(f));
 assert.deepEqual(bundleFiles.sort(),info.bundles.map(b=>b.split('/').pop()).sort(),'no stale bundles left in the export');
 assert.match(html,/<title>MONTE WO<\/title>/);assert.match(html,/<html lang="en">/);assert.match(html,/id="root"/);assert.match(html,/id="mw-splash"/);
 assert.match(html,/<link rel="manifest" href="manifest\.webmanifest"/);assert.match(html,/apple-mobile-web-app-capable" content="yes"/);assert.match(html,/apple-touch-icon" href="\/assets\/icon-180\.png"/);
 assert.match(html,/name="theme-color" content="#090c13"/);assert.match(html,/name="robots" content="noindex"/,'the landing page /app/ is the indexable page, the app itself is not');
 // The website post-build must never touch the app document (own chrome, no marketing header).
 assert.ok(!html.includes('id="main-nav"'));assert.ok(!html.includes('/website.css'));assert.ok(!html.includes('og:title'));
 for(const icon of ['/assets/icon.svg','/assets/icon-32.png','/assets/icon-180.png'])assert.ok(exists('public'+icon),icon);
});

test('Web app: installable manifest scoped to its own directory, with the approved brand icons',()=>{
 assert.equal(manifest.name,'MONTE WO');assert.equal(manifest.short_name,'MONTE WO');assert.equal(manifest.display,'standalone');
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');
 assert.equal(manifest.theme_color,'#090c13');assert.equal(manifest.background_color,'#090c13');
 assert.deepEqual(manifest.icons.map(i=>[i.src,i.sizes]),[['/assets/icon-192.png','192x192'],['/assets/icon-512.png','512x512']]);
 for(const i of manifest.icons)assert.ok(exists('public'+i.src),i.src);
 assert.match(manifest.description,/four independent Discipline Ranks/);assert.match(manifest.description,/Provisional/);assert.match(manifest.description,/MONTE Verified/);
 assert.doesNotMatch(manifest.description,/official rank|verified rank|guarantee/i);
});

test('Web app: service worker is filled from the export, isolated from the site worker and never touches /api/',()=>{
 assert.ok(!sw.includes('__MW_WEBAPP_'),'placeholders must be replaced by scripts/build_webapp.py');
 assert.ok(sw.includes(`const BUILD = '${info.build}';`));assert.ok(sw.includes(`const BUNDLES = ${JSON.stringify(info.bundles)};`));
 assert.ok(sw.includes("const CACHE = 'mw-webapp-' + BUILD;"));
 // /sw.js (site) deletes every cache starting with montewo- or vitaflex-: the app cache must not use those prefixes.
 assert.doesNotMatch(sw,/'montewo-|'vitaflex-/);
 assert.ok(sw.includes("!url.pathname.startsWith(SCOPE)) return;"),'requests outside the app directory (API, website, assets) are not handled');
 assert.ok(sw.includes("k.startsWith('mw-webapp-') && k !== CACHE"),'only its own older caches are deleted');
 assert.ok(sw.includes("request.method !== 'GET'"));
 const siteSw=read('public/sw.js');assert.ok(!siteSw.includes('/app/web/'),'the site worker does not precache or own the app directory');
});

test('Web app: committed PWA files equal their sources in apps/mobile/public/ (export not stale)',()=>{
 assert.equal(read(WEB+'pwa.js'),read('apps/mobile/public/pwa.js'));
 assert.equal(read(WEB+'manifest.webmanifest'),read('apps/mobile/public/manifest.webmanifest'));
 const expectedSw=read('apps/mobile/public/sw.js').replace('__MW_WEBAPP_BUILD__',info.build).replace('__MW_WEBAPP_BUNDLES__',JSON.stringify(info.bundles));
 assert.equal(sw,expectedSw);
 const template=read('apps/mobile/public/index.html');
 for(const line of template.split('\n')){const t=line.trim();if(!t||t.includes('%'))continue;assert.ok(html.includes(t),'template line missing from export: '+t.slice(0,80));}
});

test('Web app: the bundle talks to its own origin and carries no credentials or foreign API origins',()=>{
 const bundle=read(WEB+info.bundles.find(b=>b.endsWith('.js')));
 assert.ok(bundle.length>500000,'a real app bundle, not a stub');
 assert.ok(!bundle.includes('vitaflex-monte-wo.pages.dev'),'web build uses window.location.origin (same-origin /api/mobile), not a baked origin');
 assert.ok(bundle.includes('/app/web/assets/'),'asset URLs carry the site base path');
 assert.ok(!bundle.includes('assets/node_modules/'),'library images are relocated to assets/vendor/ (a node_modules segment is git-ignored and skipped by wrangler pages deploy)');
 assert.ok(bundle.includes('/app/web/assets/vendor/@react-navigation/')&&exists(WEB+'assets/vendor/@react-navigation/elements/lib/module/assets'),'React Navigation icons shipped under assets/vendor/');
 assert.ok(!existsSync(file(WEB+'assets/node_modules')),'no node_modules directory inside the export');assert.ok(!bundle.includes('"/assets/workout-posters'),'no root-relative asset URLs that would 404 under /app/web/');
 for(const shape of [/mwa_[0-9a-f]{16}_[A-Za-z0-9_-]{43}/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/\bAKIA[0-9A-Z]{16}\b/,/\bsk_(?:live|test)_[0-9A-Za-z]{10,}/,/\bgh[pousr]_[A-Za-z0-9]{30,}/])assert.doesNotMatch(bundle,shape);
 assert.ok(!bundle.includes('EXPO_PUBLIC_API_BASE_URL='),'no inlined env dump');
 assert.ok(bundle.includes('/api/mobile'),'same API contract as the native app');
});

test('Web app: apps/mobile sources are wired for the site base path and the web sign-in return URL',()=>{
 const config=read('apps/mobile/app.config.ts');
 assert.match(config,/MONTEWO_WEB_BASE_URL/);assert.match(config,/experiments: \{ baseUrl: webBaseUrl \}/);assert.match(config,/output: "single"/);assert.match(config,/name: "MONTE WO"/);
 assert.match(config,/package: "com\.vitaflex\.montewovitaflex"/,'native identifiers untouched');
 const api=read('apps/mobile/src/api.ts');
 assert.ok(api.includes('new URL("./", window.location.href).href'),'web redirect = the directory the app is served from');
 assert.ok(!api.includes('API_BASE + "/mobile/"'),'the old /mobile/ return URL no longer exists');
 assert.ok(api.includes('? window.location.origin'),'web API base stays same-origin');
 const build=read('scripts/build_webapp.py');assert.match(build,/BASE_URL = "\/app\/web"/);assert.match(build,/if not k\.startswith\("EXPO_PUBLIC_"\)/,'shell EXPO_PUBLIC_* never leak into the export');
 assert.match(build,/EXPO_OFFLINE/);assert.match(read('.gitignore'),/apps\/mobile\/web-build\//);
 assert.match(read('package.json'),/"build:webapp": "python3 scripts\/build_webapp\.py"/);assert.match(read('package.json'),/"check:webapp": "python3 scripts\/build_webapp\.py --check"/);
});

test('Web app: linked from the whole website, excluded from website routes, native bundle and sitemap',()=>{
 assert.deepEqual(site.webApp,{path:'/app/web/',label:'Open the App',key:'openApp'});
 assert.equal(routes.length,50);assert.ok(!routes.some(r=>r.startsWith('/app/web')),'the app is not a website route');
 for(const route of routes){const doc=page(route);const nav=doc.match(/<nav aria-label="Main navigation" id="main-nav">(.*?)<\/nav>/s)?.[1];assert.ok(nav,route);assert.ok(nav.includes('href="/app/web/"'),route+' header links to the web app');}
 assert.match(page('/'),/<a class="button button-app" href="\/app\/web\/"><span data-i18n="openApp">Open the App<\/span>/,'home hero button');
 const app=page('/app/');
 assert.match(app,/AVAILABLE NOW · WEB APP/);assert.match(app,/id="web-app"/);assert.match(app,/<a class="button" href="\/app\/web\/" data-i18n="openApp">Open the App ↗<\/a>/);
 assert.equal([...app.matchAll(/<article class="foundation-tool-card"><span class="eyebrow">(ANDROID|IPHONE &amp; IPAD|DESKTOP)<\/span>/g)].length,3,'install steps for Android, iPhone/iPad and desktop');
 assert.match(app,/Add to Home Screen/);assert.match(app,/HONEST STATE/);assert.match(app,/not connected yet/);assert.match(app,/nothing in the app awards an official Discipline Rank/);
 assert.match(app,/Google Play and App Store releases are still in preparation/);assert.doesNotMatch(app,/href="https:\/\/(?:apps\.apple\.com|play\.google\.com)/);
 assert.match(app,/<title>The MONTE WO App — Web App &amp; Android Test Build<\/title>/);
 assert.match(app,/<a href="\/dashboard\/">Preview the dashboard foundation \(demo\) ↗<\/a>/,'existing demo link kept');
 const messages=JSON.parse(read('content/website/home-messages.json'));
 assert.deepEqual([messages.en.openApp,messages.ht.openApp,messages.fr.openApp],['Open the App','Louvri aplikasyon an','Ouvrir l’application']);
 assert.ok(read('public/website-copy.js').includes('Louvri aplikasyon an'));
 assert.match(read('scripts/build_native.py'),/EXCLUDED_DIRS = \{"strength\/admin", "app\/web"\}/,'never packaged inside the Capacitor shell');
 assert.doesNotMatch(read('public/robots.txt'),/app\/web/);
 if(exists('public/sitemap.xml'))assert.ok(!read('public/sitemap.xml').includes('/app/web/'));
 const headers=read('public/_headers');
 assert.match(headers,/\/app\/web\/_expo\/\*\n  Cache-Control: public, max-age=31536000, immutable/);assert.match(headers,/\/app\/web\/sw\.js\n  Cache-Control: no-cache/);assert.match(headers,/\/app\/web\/index\.html\n  Cache-Control: no-cache/);
});
