"""Add an honest distribution page using the existing website shell. No release is inferred."""
from pathlib import Path
import json,re,html
R=Path(__file__).resolve().parent.parent;P=R/'public'
manifest=json.loads((R/'content/mobile-release.json').read_text())
assert manifest['android']['status']=='unreleased' and manifest['ios']['status']=='unreleased','A release needs the explicit artifact/installation verification workflow, not automatic links.'
source=(P/'app/index.html').read_text()
body='''<section class="wrap foundation-page-hero"><span class="eyebrow">MONTE WO / OFFICIAL DOWNLOADS</span><h1>Built for the work.<br><em>Released when it’s ready.</em></h1><p>MEASURE. PROVE. RANK. CLIMB.</p><div class="foundation-notice">HERO_NOTICE</div></section>
<section class="wrap foundation-section"><div class="foundation-feature-grid"><article class="foundation-feature"><span class="eyebrow">ANDROID / DIRECT INSTALL</span><h2>Official APK</h2><p>A download will appear only after release signing, installation testing and integrity checks are complete.</p>ANDROID_CARD<button class="button" disabled aria-disabled="true">Official APK · Not released</button><dl><dt>Version / release date</dt><dd>Not published</dd><dt>File size / SHA-256</dt><dd>Available with the tested artifact</dd><dt>Minimum Android version</dt><dd>To be confirmed from the built APK</dd></dl></article>
<article class="foundation-feature"><span class="eyebrow">ANDROID / GOOGLE PLAY</span><h2>Google Play</h2><p>A signed Android App Bundle and store review are required. No listing is live.</p><button class="button" disabled aria-disabled="true">Google Play · Coming soon</button></article>
<article class="foundation-feature"><span class="eyebrow">iPHONE / APPLE</span><h2>iOS &amp; TestFlight</h2><p>Apple signing, a tested build and App Store Connect setup are still required. A source project is not a TestFlight release.</p><button class="button" disabled aria-disabled="true">iOS · Coming soon</button></article></div>
<div class="foundation-notice"><h2>When an official APK is available</h2><ol><li>Use the release link on this page and compare the published SHA-256 checksum.</li><li>Android may ask you to allow installation from the browser or file manager you used. Allow only that trusted source for this installation.</li><li>Keep Play Protect and other security protections enabled. Do not bypass a malware warning.</li><li>After installing, turn that source permission back off. Future updates must use the same trusted signing identity.</li></ol><p>TEST_BUILD_FOOTNOTE No official public release is available. Do not use unofficial mirrors.</p></div>
<div class="foundation-disclosure"><h2>What works now</h2><p>The existing website offers free educational calculators and 14 written exercise guides. Native pilot code supports account-connected training, but production account services have not been activated by this source delivery.</p><p>MONTE WO Strength Index™ standards are DRAFT — NOT OFFICIAL. Squat, Bench Press, Deadlift and Biceps Curl have independent Discipline Ranks. No overall rank or workout-based rank awards.</p><a class="button" href="/tools/">Use the Free Tools ↗</a> <a href="/exercises/">Browse exercise guides ↗</a></div>
<div class="foundation-bottom-cta"><div><h2>Stay in the loop.</h2><p>Managed by VitaFlex Business Group.</p><p><a href="/privacy/">Privacy Policy</a> · <a href="/delete-account/">Delete Account &amp; Data</a> · <a href="mailto:Montewo@vitaflexbusinessgroup.com">Contact support</a></p></div><a class="button" href="/waitlist/">Join the Waitlist ↗</a></div></section>'''
# Android test build (GitHub pre-release built by .github/workflows/app-android.yml) — rendered ONLY from explicit,
# verified manifest fields; never inferred. The official release stays "Not released" (status must remain unreleased).
android=manifest['android'];tb=android.get('testBuild');preview_url=android.get('previewUrl')
if preview_url and not preview_url.startswith('https://expo.dev/accounts/vitaflex/projects/monte-wo/builds/'):
 raise ValueError('Android preview URL must be the known MONTE WO EAS build page.')
expo_link='<a href="'+html.escape(preview_url,quote=True)+'" target="_blank" rel="noopener noreferrer">Expo preview page (0.1.0) ↗</a>' if preview_url else ''
if tb:
 if not re.fullmatch(r'https://github\.com/vitaflexl4-ai/monte-wo/releases/download/app-android-v[0-9]+\.[0-9]+\.[0-9]+-[0-9]+/monte-wo-[0-9]+\.[0-9]+\.[0-9]+-[0-9]+-[0-9a-f]{7}\.apk',tb['url']):
  raise ValueError('testBuild.url must be a direct asset of a MONTE WO GitHub pre-release.')
 if not re.fullmatch(r'[0-9a-f]{64}',tb['sha256']) or not isinstance(tb['bytes'],int) or tb['bytes']<=0 or tb['signing']!='debug-keystore' or tb['minSdk']!=24:
  raise ValueError('testBuild needs the verified sha256/bytes/signing/minSdk of the published APK.')
 mb=f"{tb['bytes']/1048576:.1f}"
 e=lambda v:html.escape(str(v),quote=True)
 hero_notice=f'<b>PRE-RELEASE · ANDROID TEST BUILD</b><p>An Android test build (APK {e(tb["version"])}, build {e(tb["versionCode"])}) from the project’s GitHub Actions is available below for early testing. It is not an official release. No Google Play listing or iOS build is available.</p>'
 card=(f'<div class="foundation-notice" id="android-test-build"><b>TEST BUILD (PRE-RELEASE)</b><p>MONTE WO {e(tb["version"])} · build {e(tb["versionCode"])} · {mb} MB · {e(tb["releasedAt"])} · commit <code>{e(tb["commit"])}</code></p>'
  f'<a class="button" href="{e(tb["url"])}" rel="noopener noreferrer">Download the Android test build (APK) ↗</a>'
  f'<p class="foundation-small">SHA-256 <code>{e(tb["sha256"])}</code></p>'
  f'<p class="foundation-small">Signed with the public Android debug key — a test build, not a release identity: when the official app arrives you must uninstall this build first. Google Play rejects debug-signed builds. Minimum Android 7.0 (API 24) · INTERNET permission only. <a href="{e(tb["releaseUrl"])}" target="_blank" rel="noopener noreferrer">Release notes, build-info &amp; SHA256SUMS ↗</a>'+(' · '+expo_link if expo_link else '')+'</p></div>')
 footnote='The Android test build is for early testing only; it is not an official release and not Google Play.'
 meta_desc='Official MONTE WO Android and iOS release status. An Android test build (pre-release APK) is available for early testing; no official APK or store listing is published yet.'
 app_tag,app_button,app_sentence,status_link='ANDROID TEST BUILD','Download the Android test build ↗','An Android test build (pre-release APK) is available from the <a href="/downloads/">downloads page</a> for early testing.','Android test build download &amp; release status ↗'
else:
 hero_notice='<b>PRE-RELEASE · ANDROID PREVIEW ONLY</b><p>An internal Android preview is available below through Expo. It is for early testing, not a public release. No Google Play listing or iOS build is available.</p>'
 card='<a class="button" href="'+html.escape(preview_url,quote=True)+'" target="_blank" rel="noopener noreferrer">Open Android preview install page ↗</a><p class="foundation-small">Preview build 0.1.0 · Internal testing only · Opens Expo’s build page; this is not a direct APK file URL.</p>' if preview_url else ''
 footnote='The Android preview is for early testing only.'
 meta_desc='Official MONTE WO Android and iOS release status. No APK or store listing is published yet. Use the working website tools today.'
 app_tag,app_button,app_sentence,status_link='ANDROID PREVIEW','Open Android Preview ↗','An internal Android preview is linked above for early testing.','Android preview download &amp; release status ↗'
body=body.replace('HERO_NOTICE',hero_notice).replace('ANDROID_CARD',card).replace('TEST_BUILD_FOOTNOTE',footnote)
doc=re.sub(r'(<main\b[^>]*>).*?(</main>)',lambda m:m[1]+body+m[2],source,count=1,flags=re.S)
doc=re.sub(r'<title>.*?</title>','<title>Official App Downloads &amp; Release Status | MONTE WO</title>',doc)
for attr in ['name="description"','property="og:description"','name="twitter:description"']:
 doc=re.sub('<meta '+attr+r'[^>]*>','<meta '+attr+' content="'+meta_desc+'">',doc)
for attr in ['property="og:title"','name="twitter:title"']:doc=re.sub('<meta '+attr+r'[^>]*>','<meta '+attr+' content="Official App Downloads | MONTE WO">',doc)
# SITE_ORIGIN remains unset; do not copy an app-specific canonical URL into a new route.
doc=re.sub(r'<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>','',doc)
(P/'downloads').mkdir(exist_ok=True);(P/'downloads/index.html').write_text(doc)
(P/'mobile-release.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Only additive links. Preserve the five established primary navigation items.
app=P/'app/index.html';text=app.read_text()
text=text.replace('<div class="foundation-tag">COMING SOON</div>','<div class="foundation-tag">'+app_tag+'</div>')
text=text.replace('<div class="foundation-actions"><a class="button" href="/waitlist/">Join the Waitlist ↗</a><a href="/tools/">Use the Free Tools ↗</a></div>','<div class="foundation-actions"><a class="button" href="/downloads/">'+app_button+'</a><a href="/tools/">Use the Free Tools ↗</a></div>')
text=text.replace('No public account or native app download is available.','No public athlete account or official public app release is available. '+app_sentence)
link='<p class="wrap foundation-small" id="native-release-status"><a href="/downloads/">'+status_link+'</a></p>'
text=re.sub(r'<p[^>]*id="native-release-status".*?</p>','',text,flags=re.S).replace('</main>',link+'</main>');app.write_text(text)
# Disclose the exact additional pilot behavior without claiming operational deployment.
pilot='''<section class="wrap foundation-section" id="native-pilot-data"><h2>Native training pilot · pre-release</h2><p>If an enrolled pilot account is activated, the native app sends profile revisions, dated workout sets, discipline performances and chosen MP4 evidence to the same application backend as the web pilot. Workout records do not award ranks. The separate waitlist database is not used for application records.</p><p>Sign-in uses Cloudflare Access in your system browser. An expiring opaque session is stored in the device’s secure storage; the server stores its hash and an encrypted provider token. Signing out removes the local session and attempts server revocation. No advertising, analytics, location, microphone, contacts or health-sensor SDK is used. Calories, active minutes and heart rate remain Not connected.</p><p>Chosen evidence is uploaded privately to the configured evidence store, not the public workout-media bucket. Authorized reviewers and operators can access submitted evidence. A temporary upload copy is removed after the native upload attempt where possible; your original file is not deleted. Unsaved workout inputs stay in current app memory, not a durable offline queue.</p><p>Delete Workout removes that training record, not separately submitted performance history. Account → Request account deletion creates a pending operator request; it does not claim completed erasure. You can also use the <a href="/delete-account/">public account and data request page</a> or contact <a href="mailto:Montewo@vitaflexbusinessgroup.com">Montewo@vitaflexbusinessgroup.com</a>. Secure identity verification is required before processing. Retention schedules, backup handling and a tested account-erasure procedure must be finalized before public release. No specific completion deadline is promised by this pre-release implementation.</p></section>'''
privacy=P/'privacy/index.html';text=privacy.read_text();text=re.sub(r'<section[^>]*id="native-pilot-data".*?</section>','',text,flags=re.S).replace('</main>',pilot+'</main>');privacy.write_text(text)
print('Built /downloads/ ('+('Android test build card' if tb else 'Expo preview link')+') with the official public-release status kept separate.')
