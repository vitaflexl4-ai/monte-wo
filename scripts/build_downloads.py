"""Build /downloads/ with instant Web App install, EAS preview, and verified direct Android APK download when published."""
from pathlib import Path
import json,re,html
R=Path(__file__).resolve().parent.parent;P=R/'public'
manifest=json.loads((R/'content/mobile-release.json').read_text())
android=manifest['android']
assert android['status'] in ('unreleased','apk-available') and manifest['ios']['status']=='unreleased','Unsupported release channel state.'

apk_url=android.get('apkUrl')
preview_url=android.get('previewUrl')
if preview_url and not preview_url.startswith('https://expo.dev/accounts/vitaflex/projects/monte-wo/builds/'):
 raise ValueError('Android preview URL must be the known MONTE WO EAS build page.')

if android['status']=='apk-available':
 if not apk_url or not re.fullmatch(r'https://github\.com/vitaflexl4-ai/monte-wo/releases/download/[^" <>]+\.apk',apk_url):
  raise ValueError('Published APK URL must be a GitHub Release .apk asset on vitaflexl4-ai/monte-wo.')
 if not re.fullmatch(r'[a-f0-9]{64}',str(android.get('sha256') or '')):
  raise ValueError('Published APK requires a 64-character SHA-256 checksum.')
 size_mb=f"{(int(android['bytes'])/(1024*1024)):.1f} MB ({int(android['bytes']):,} bytes)"
 ver_str=f"{html.escape(str(android.get('version') or '2.0.0'))} · {html.escape(str(android.get('releasedAt') or ''))}"
 sha_str=html.escape(str(android['sha256']))
 min_sdk_str=f"Android {html.escape(str(android.get('minSdk') or '8.0+ (API 26+)'))}"
 hero_badge='<b>ANDROID APK AVAILABLE · DIRECT DOWNLOAD</b><p>Download the signed MONTE WO v2 Android APK directly below and verify its SHA-256 checksum, or launch the 5-tab Web App instantly on any device.</p>'
 apk_card=f'''<article class="foundation-feature"><span class="eyebrow">ANDROID / DIRECT APK DOWNLOAD</span><h2>MONTE WO v2 APK</h2><p>Includes all 5 tabs: Home Command Center, Smart Workout Suite, Haitian Rank Evolution, AI Muscle Definition Camera &amp; 9:16 Story Exporter, and World Nutrition.</p><a class="button" href="{html.escape(apk_url,quote=True)}" rel="noopener noreferrer">Download Android APK (.apk) ↓</a> <a class="button" href="/mobile/">Open Web App (/mobile/) ↗</a><dl><dt>Version / release date</dt><dd>{ver_str}</dd><dt>File size</dt><dd>{size_mb}</dd><dt>SHA-256 checksum</dt><dd style="word-break:break-all;font-family:monospace;font-size:11px">{sha_str}</dd><dt>Minimum Android version</dt><dd>{min_sdk_str}</dd></dl></article>'''
else:
 hero_badge='<b>INSTANT WEB APP LIVE · ANDROID PREVIEW AVAILABLE</b><p>Use the full 5-tab MONTE WO v2 Web App immediately on iPhone or Android (Add to Home Screen), or open the Expo Android preview build below while the v2 direct APK artifact is being published.</p>'
 preview_btn=f'<a class="button" href="{html.escape(preview_url,quote=True)}" target="_blank" rel="noopener noreferrer">Open Android preview install page ↗</a>' if preview_url else ''
 apk_card=f'''<article class="foundation-feature"><span class="eyebrow">ANDROID / DIRECT INSTALL</span><h2>MONTE WO Android APK</h2><p>Direct one-tap website APK download activates automatically as soon as the v2 APK artifact is published via <code>npm run publish:apk</code>.</p>{preview_btn} <a class="button" href="/mobile/">Launch 5-Tab Web App Now ↗</a><p class="foundation-small">Preview build · Internal testing · Or add <code>/mobile/</code> to your phone Home Screen right now.</p><button class="button" disabled aria-disabled="true">Direct v2 APK · Build &amp; publish ready</button><dl><dt>Version / release date</dt><dd>v2.0.0 ready to build via EAS</dd><dt>File size / SHA-256</dt><dd>Published automatically with tested APK</dd><dt>Minimum Android version</dt><dd>Android 8.0+ (arm64 / universal)</dd></dl></article>'''

source=(P/'app/index.html').read_text()
body=f'''<section class="wrap foundation-page-hero"><span class="eyebrow">MONTE WO / OFFICIAL DOWNLOADS</span><h1>Built for the work.<br><em>Take MONTE WO anywhere.</em></h1><p>MEASURE. PROVE. RANK. CLIMB.</p><div class="foundation-notice">{hero_badge}</div></section>
<section class="wrap foundation-section"><div class="foundation-feature-grid">{apk_card}
<article class="foundation-feature"><span class="eyebrow">INSTANT PHONE INSTALL / PWA</span><h2>iPhone &amp; Android Web App</h2><p>Open <strong>/mobile/</strong> in Safari (iOS) or Chrome (Android) and tap <strong>Share → Add to Home Screen</strong> for a full-screen <code>#000000</code> app icon with zero store wait.</p><a class="button" href="/mobile/">Launch Full-Screen App (/mobile/) ↗</a></article>
<article class="foundation-feature"><span class="eyebrow">STORES / GOOGLE PLAY &amp; iOS</span><h2>App Store &amp; Google Play</h2><p>Signed store bundles and store review remain separate from direct APK and web-app access. No public store listing is live yet.</p><button class="button" disabled aria-disabled="true">Google Play · Coming soon</button> <button class="button" disabled aria-disabled="true">App Store · Coming soon</button></article></div>
<div class="foundation-notice"><h2>Installing the MONTE WO Android APK safely</h2><ol><li>Tap the direct APK download button on this page and compare the SHA-256 checksum if verifying manually.</li><li>Android may ask you to allow installation from your browser or Files app. Allow only that trusted browser for this install.</li><li>Keep Play Protect and standard Android security protections enabled. Do not bypass a malware warning.</li><li>After installing, turn unknown-source installation back off. Future updates use the same VitaFlex signing key.</li></ol><p>Do not install MONTE WO APKs from unofficial third-party mirrors.</p></div>
<div class="foundation-disclosure"><h2>What works right now</h2><p>Both the hosted 5-tab Web App (<code>/mobile/</code>) and the Movement Cockpit (<code>/exercises/</code>) are live today—including the 9-Rank Climb Scale, Smart Workout Generator, AI Muscle Definition Camera &amp; 9:16 Story Studio, and World Foods 3,000 kcal Scanner.</p><p>MONTE WO Strength Index™ standards are DRAFT — NOT OFFICIAL. Squat, Bench Press, Deadlift and Biceps Curl have independent Discipline Ranks.</p><a class="button" href="/mobile/">Open 5-Tab App ↗</a> <a class="button" href="/exercises/">Open Movement Cockpit ↗</a></div>
<div class="foundation-bottom-cta"><div><h2>Stay in the loop.</h2><p>Managed by VitaFlex Business Group.</p><p><a href="/privacy/">Privacy Policy</a> · <a href="/delete-account/">Delete Account &amp; Data</a> · <a href="mailto:Montewo@vitaflexbusinessgroup.com">Contact support</a></p></div><a class="button" href="/waitlist/">Join the Waitlist ↗</a></div></section>'''

doc=re.sub(r'(<main\b[^>]*>).*?(</main>)',lambda m:m[1]+body+m[2],source,count=1,flags=re.S)
doc=re.sub(r'<title>.*?</title>','<title>Download MONTE WO App &amp; Android APK | MONTE WO</title>',doc)
for attr in ['name="description"','property="og:description"','name="twitter:description"']:
 doc=re.sub('<meta '+attr+r'[^>]*>','<meta '+attr+' content="Download the MONTE WO Android APK or launch the 5-tab MONTE WO v2 Web App on iPhone and Android.">',doc)
for attr in ['property="og:title"','name="twitter:title"']:doc=re.sub('<meta '+attr+r'[^>]*>','<meta '+attr+' content="Download MONTE WO App &amp; Android APK | MONTE WO">',doc)
doc=re.sub(r'<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>','',doc)
(P/'downloads').mkdir(exist_ok=True);(P/'downloads/index.html').write_text(doc)
(P/'mobile-release.json').write_text(json.dumps(manifest,indent=2)+'\n')

app=P/'app/index.html';text=app.read_text()
tag_label='ANDROID APK READY' if android['status']=='apk-available' else 'ANDROID PREVIEW'
cta_label='Download Android APK ↗' if android['status']=='apk-available' else 'Android APK &amp; Downloads ↗'
text=text.replace('<div class="foundation-tag">COMING SOON</div>',f'<div class="foundation-tag">{tag_label}</div>')
text=text.replace('<div class="foundation-actions"><a class="button" href="/waitlist/">Join the Waitlist ↗</a><a href="/tools/">Use the Free Tools ↗</a></div>',f'<div class="foundation-actions"><a class="button" href="/downloads/">{cta_label}</a><a class="button" href="/mobile/">Open Live 5-Tab App ↗</a></div>')
text=text.replace('No public account or native app download is available.','Launch the 5-tab web app immediately or open the Android APK download page above.')
link='<p class="wrap foundation-small" id="native-release-status"><a href="/downloads/">Android APK download &amp; release status ↗</a></p>'
text=re.sub(r'<p[^>]*id="native-release-status".*?</p>','',text,flags=re.S).replace('</main>',link+'</main>');app.write_text(text)

pilot='''<section class="wrap foundation-section" id="native-pilot-data"><h2>Native training pilot · pre-release</h2><p>If an enrolled pilot account is activated, the native app sends profile revisions, dated workout sets, discipline performances and chosen MP4 evidence to the same application backend as the web pilot. Workout records do not award ranks. The separate waitlist database is not used for application records.</p><p>Sign-in uses Cloudflare Access in your system browser. An expiring opaque session is stored in the device’s secure storage; the server stores its hash and an encrypted provider token. Signing out removes the local session and attempts server revocation. No advertising, analytics, location, microphone, contacts or health-sensor SDK is used. Calories, active minutes and heart rate remain Not connected.</p><p>Chosen evidence is uploaded privately to the configured evidence store, not the public workout-media bucket. Authorized reviewers and operators can access submitted evidence. A temporary upload copy is removed after the native upload attempt where possible; your original file is not deleted. Unsaved workout inputs stay in current app memory, not a durable offline queue.</p><p>Delete Workout removes that training record, not separately submitted performance history. Account → Request account deletion creates a pending operator request; it does not claim completed erasure. You can also use the <a href="/delete-account/">public account and data request page</a> or contact <a href="mailto:Montewo@vitaflexbusinessgroup.com">Montewo@vitaflexbusinessgroup.com</a>. Secure identity verification is required before processing. Retention schedules, backup handling and a tested account-erasure procedure must be finalized before public release. No specific completion deadline is promised by this pre-release implementation.</p></section>'''
privacy=P/'privacy/index.html';text=privacy.read_text();text=re.sub(r'<section[^>]*id="native-pilot-data".*?</section>','',text,flags=re.S).replace('</main>',pilot+'</main>');privacy.write_text(text)
print('Built /downloads/ ('+android['status']+') with Web App + Android APK distribution.')
