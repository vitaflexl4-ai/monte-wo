// Native (Capacitor) release configuration and bundle checks.
// Runs anywhere Node + python3 exist; it does NOT compile Android/iOS (that needs the SDKs,
// see docs/release/ANDROID_RELEASE.md and IOS_RELEASE.md). It verifies what can be verified
// statically: identifiers agree across platforms, the native bundle is deterministic and
// routes correctly inside Capacitor's local server, no secret is tracked, and the CI
// workflows are manual-only with no embedded credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const config=JSON.parse(read('capacitor.config.json'));
const bundle=path.join(root,config.webDir);

function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);e.isDirectory()?walk(p,out):out.push(p)}return out.sort()}
function treeHash(dir){const h=crypto.createHash('sha256');for(const f of walk(dir)){h.update(path.relative(dir,f));h.update(fs.readFileSync(f))}return h.digest('hex')}
function buildNative(){execFileSync('python3',['scripts/build_native.py'],{cwd:root,stdio:'pipe'})}

test('capacitor config: reverse-domain app id, product name and derived webDir',()=>{
 assert.match(config.appId,/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*){2,}$/,'appId must be a reverse-domain identifier');
 assert.equal(config.appName,'MONTE WO');
 assert.equal(config.webDir,'build/native');
 assert.ok(read('.gitignore').split('\n').includes('/build/'),'derived bundle must not be committed');
});

test('android and ios projects use the same application identifier and product name',()=>{
 const gradle=read('android/app/build.gradle');
 assert.ok(gradle.includes(`applicationId "${config.appId}"`));
 assert.ok(gradle.includes(`namespace = "${config.appId}"`));
 assert.ok(read('android/app/src/main/res/values/strings.xml').includes(`<string name="package_name">${config.appId}</string>`));
 assert.ok(read('android/app/src/main/res/values/strings.xml').includes('<string name="app_name">MONTE WO</string>'));
 const pbx=read('ios/App/App.xcodeproj/project.pbxproj');
 const ids=[...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map(m=>m[1]);
 assert.ok(ids.length>=2&&ids.every(id=>id===config.appId),'every iOS configuration must use '+config.appId);
 assert.ok(read('ios/App/App/Info.plist').includes('<string>MONTE WO</string>'));
 assert.ok(exists('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme'),'shared scheme required for CI xcodebuild');
 assert.ok(read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme').includes('BlueprintIdentifier = "504EC3031FED79650016851F"'));
 assert.ok(pbx.includes('504EC3031FED79650016851F /* App */ = {'),'scheme must reference the App target');
});

test('android manifest requests only INTERNET (no undisclosed permissions)',()=>{
 const manifest=read('android/app/src/main/AndroidManifest.xml');
 const perms=[...manifest.matchAll(/uses-permission android:name="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(perms,['android.permission.INTERNET']);
 assert.ok(!/android:usesCleartextTraffic="true"/.test(manifest));
});

test('android release build: version and signing come from the environment, nothing hard-coded',()=>{
 const gradle=read('android/app/build.gradle');
 assert.ok(gradle.includes('versionCode mwVersionCode')&&gradle.includes('versionName mwVersionName'));
 for(const v of ['MONTE_WO_VERSION_CODE','MONTE_WO_VERSION_NAME','ANDROID_KEYSTORE_PATH','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'])assert.ok(gradle.includes(`System.getenv('${v}')`),v);
 assert.ok(!/storePassword\s+["']/.test(gradle)&&!/keyPassword\s+["']/.test(gradle),'no literal passwords');
 assert.ok(!/storeFile\s+file\(["']/.test(gradle),'no literal keystore path');
 assert.ok(gradle.includes('minifyEnabled false'));
});

test('no signing material, env file or keystore is tracked by git',()=>{
 const tracked=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split('\n');
 const forbidden=tracked.filter(f=>/\.(jks|keystore|p12|mobileprovision|cer|pem|key)$/i.test(f)||/^\.env($|\.(?!example$))/.test(f)||/google-services\.json$|GoogleService-Info\.plist$/.test(f));
 assert.deepEqual(forbidden,[]);
 const ignore=read('.gitignore');
 for(const line of ['*.jks','*.keystore','*.p12','*.mobileprovision','.env','android/app/src/main/assets/public/'])assert.ok(ignore.split('\n').includes(line),line);
});

test('.env.example documents every variable the code reads, with placeholders only',()=>{
 const example=read('.env.example');
 const used=new Set();
 for(const dir of ['functions','server']){for(const f of walk(path.join(root,dir)))for(const m of fs.readFileSync(f,'utf8').matchAll(/env\.([A-Z_]{3,})/g))used.add(m[1])}
 for(const name of used){if(['DB','WORKOUT_GIFS_BUCKET','RANKING_EVIDENCE'].includes(name))assert.ok(example.includes(name+' '),name+' binding documented');else assert.match(example,new RegExp('^'+name+'=','m'),name)}
 for(const line of example.split('\n')){const m=line.match(/^([A-Z_]+)=([^#]*)/);if(!m)continue;const value=m[2].trim();
  const ok=value===''||/PLACEHOLDER|YOUR-TEAM|PASTE_/.test(value)||['false','true','1','upload'].includes(value)||/^\d+\.\d+\.\d+$/.test(value)||/^https:\/\/YOUR-TEAM/.test(value)||value.startsWith('/absolute/path/');
  assert.ok(ok,`suspicious non-placeholder value for ${m[1]}: ${value}`)}
});

test('native bundle is deterministic, opens in the app shell and keeps all pages reachable',()=>{
 buildNative();const first=treeHash(bundle);buildNative();assert.equal(treeHash(bundle),first,'two builds must be byte-identical');
 const index=fs.readFileSync(path.join(bundle,'index.html'),'utf8');
 assert.ok(index.includes('class="app-brand"')&&index.includes('MONTE WO'),'root document must be the app shell');
 assert.equal(index,fs.readFileSync(path.join(bundle,'dashboard','index.html'),'utf8'),'root shell is the same document as /dashboard/');
 for(const f of ['sw.js','_headers','_redirects','robots.txt','strength/admin/index.html'])assert.ok(!fs.existsSync(path.join(bundle,f)),f+' must be excluded');
 const files=walk(bundle);const html=files.filter(f=>f.endsWith('.html'));
 assert.ok(html.length>=50,'all website pages are packaged');
 const manifest=JSON.parse(fs.readFileSync(path.join(bundle,'native-build.json'),'utf8'));
 assert.equal(manifest.appId,config.appId);assert.equal(manifest.pages,html.filter(f=>path.basename(f)==='index.html').length);
 // Capacitor serves the ROOT index for every extension-less path, so no in-bundle page may
 // still be linked directory-style; links to deliberately excluded pages are reported.
 for(const f of html){const text=fs.readFileSync(f,'utf8');
  for(const m of text.matchAll(/(?:href|content)="\/([a-z0-9][a-z0-9/_-]*)\/(?=["#?])/g)){const dir=m[1];const packaged=fs.existsSync(path.join(bundle,dir,'index.html'));
   assert.ok(!packaged,`${path.relative(bundle,f)} still links to /${dir}/ without index.html`);
   assert.ok(manifest.pagesLinkingToExcludedContent.includes(path.relative(bundle,f)),`link to excluded /${dir}/ must be reported`)}
  assert.ok(!/href="\/["#?]/.test(text),path.relative(bundle,f)+' still links to the bare root');
 }
 assert.ok(fs.readFileSync(path.join(bundle,'site.js'),'utf8').includes("location.href='/delete-account/index.html#clear-device'"));
 const marker='<head><script>window.__MW_NATIVE={"apiOrigin":"","appId":"'+config.appId+'","platform":"capacitor","scheme":"'+config.appId+'"}</script>';
 for(const f of html)assert.ok(fs.readFileSync(f,'utf8').startsWith('<!doctype html>')&&fs.readFileSync(f,'utf8').includes(marker),path.relative(bundle,f)+' must carry the native marker first in <head>');
 assert.equal(manifest.apiOrigin,null,'default build has no API origin (honest offline shell)');
 for(const js of ['dashboard.js','app.js','site.js'])assert.ok(/'serviceWorker' in navigator&&!window\.__MW_NATIVE/.test(fs.readFileSync(path.join(bundle,js),'utf8')),js+' must skip service-worker registration natively');
 assert.ok(!read('public/index.html').includes('__MW_NATIVE')&&!read('public/dashboard/index.html').includes('__MW_NATIVE'),'web pages stay untouched');
 for(const js of ['site.js','strength.js']){const t=fs.readFileSync(path.join(bundle,js),'utf8');assert.ok(/'\/api\/(waitlist|strength)/.test(t)&&!/\/api\/[a-z]+\/index\.html/.test(t),js+': API routes must not be rewritten')}
});

test('native bundle: API origin is injected only from NATIVE_API_ORIGIN and must be a bare https origin',()=>{
 execFileSync('python3',['scripts/build_native.py'],{cwd:root,stdio:'pipe',env:{...process.env,NATIVE_API_ORIGIN:'https://api.example.test/'}});
 const index=fs.readFileSync(path.join(bundle,'index.html'),'utf8');assert.ok(index.includes('"apiOrigin":"https://api.example.test"'),'origin baked in without trailing slash');
 assert.equal(JSON.parse(fs.readFileSync(path.join(bundle,'native-build.json'),'utf8')).apiOrigin,'https://api.example.test');
 for(const bad of ['http://api.example.test','https://api.example.test/api','https://user:pw@api.example.test','https://api.example.test:8443','not-a-url'])assert.throws(()=>execFileSync('python3',['scripts/build_native.py'],{cwd:root,stdio:'pipe',env:{...process.env,NATIVE_API_ORIGIN:bad}}),bad+' must be rejected');
 buildNative();assert.ok(fs.readFileSync(path.join(bundle,'index.html'),'utf8').includes('"apiOrigin":""'),'default restored');
 const example=read('.env.example');for(const v of ['NATIVE_API_ORIGIN=','NATIVE_CLIENTS_ENABLED=false'])assert.ok(example.includes(v),v);
});

test('native sign-in return deep link is registered on both platforms and the App/Browser plugins are synced',()=>{
 const manifest=read('android/app/src/main/AndroidManifest.xml');
 assert.match(manifest,/<action android:name="android.intent.action.VIEW" \/>[\s\S]*?<category android:name="android.intent.category.BROWSABLE" \/>[\s\S]*?<data android:scheme="@string\/custom_url_scheme" android:host="auth" \/>/,'Android VIEW intent filter for <scheme>://auth');
 assert.ok(read('android/app/src/main/res/values/strings.xml').includes(`<string name="custom_url_scheme">${config.appId}</string>`));
 const plist=read('ios/App/App/Info.plist');assert.ok(plist.includes('<key>CFBundleURLSchemes</key>')&&plist.includes(`<string>${config.appId}</string>`),'iOS URL scheme');
 const plugins=JSON.parse(read('android/app/src/main/assets/capacitor.plugins.json')).map(p=>p.pkg).sort();assert.deepEqual(plugins,['@capacitor/app','@capacitor/browser']);
 const swift=read('ios/App/CapApp-SPM/Package.swift');assert.ok(swift.includes('CapacitorApp')&&swift.includes('CapacitorBrowser'));
 const pkg=JSON.parse(read('package.json'));for(const d of ['@capacitor/app','@capacitor/browser','@capacitor/core','@capacitor/android','@capacitor/ios'])assert.match(pkg.dependencies[d],/^\d+\.\d+\.\d+$/,d+' pinned exactly');
 const js=read('public/strength.js');assert.ok(js.includes("'cf-access-token'")&&js.includes('/native-login?state=')&&js.includes("'/native-token'")&&js.includes("appUrlOpen"),'native sign-in flow wired in strength.js');
 assert.ok(!/credentials:'include'/.test(js),'never cookie-based across origins');
});

test('native bundle preserves product rules: four disciplines, nine ranks, no combined rank',()=>{
 buildNative();const index=fs.readFileSync(path.join(bundle,'index.html'),'utf8');
 for(const d of ['Squat','Bench Press','Deadlift','Biceps Curl'])assert.ok(index.includes(d),d);
 for(const r of ['Debitan','Bati','Solid','Fò','Avanse','Mèt','Chanpyon','Titan','Lejand'])assert.ok(index.includes(r),r);
 assert.ok(!/overall rank|combined rank|total rank/i.test(index.replace(/no (overall|combined|total) rank[^.]*/gi,'')));
 assert.ok(/DRAFT — NOT OFFICIAL/.test(index),'draft standards stay labelled draft in the app');
});

test('release workflows are manual-only, reproducible and free of credentials',()=>{
 for(const wf of ['.github/workflows/android-release.yml','.github/workflows/ios-build.yml']){const text=read(wf);
  assert.ok(/^\s+workflow_dispatch:/m.test(text),wf+' must support manual dispatch');
  assert.ok(!/^\s+(pull_request|schedule):/m.test(text),wf+' must not run on PRs or schedules');
  if(/^\s+push:/m.test(text)){assert.ok(/branches: \["arena\/\*\*"\]/.test(text),wf+' push trigger must be limited to arena/** working branches');assert.ok(/contains\(github\.event\.head_commit\.message, '\[build-native\]'\)/.test(text),wf+' push runs must be opt-in per commit')}
  for(const m of text.matchAll(/^\s*-?\s*name: (.+)$/gm)){const v=m[1].trim();assert.ok(/^["']/.test(v)||!v.includes(': '),wf+' unquoted step name with ": " breaks YAML: '+v)}
  assert.ok(text.includes('npm ci')&&text.includes('npm run build')&&text.includes('npm run build:native'),wf+' must rebuild from source');
  assert.ok(!/-----BEGIN|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[bp]-/.test(text),wf+' must not embed credentials');
  assert.ok(!/upload-google-play|app-store-connect-upload|altool|fastlane (deliver|supply|pilot)/.test(text),wf+' must not submit to a store');
 }
 const android=read('.github/workflows/android-release.yml');
 assert.ok(android.includes('npx cap sync android')&&android.includes('bundleRelease')&&android.includes('app-release.aab'));
 for(const s of ['ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'])assert.ok(android.includes(`secrets.${s}`),s);
 const ios=read('.github/workflows/ios-build.yml');
 assert.ok(ios.includes('npx cap sync ios')&&ios.includes('-scheme App')&&ios.includes('CODE_SIGNING_ALLOWED=NO')&&!ios.includes('secrets.'));
});
