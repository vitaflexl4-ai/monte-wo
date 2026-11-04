// Native builds of THE APP (apps/mobile, Expo): the GitHub Actions workflows that produce the Android
// APK/AAB and the iOS Simulator build must stay opt-in, reproducible from source, free of credentials and
// honest about signing; the app config must keep the approved identity, brand artwork and minimal permissions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {resolve} from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(ROOT, p), 'utf8');
const ANDROID = '.github/workflows/app-android.yml';
const IOS = '.github/workflows/app-ios.yml';
const CONFIG = 'apps/mobile/app.config.ts';

test('App workflows: opt-in triggers, source rebuild, no credentials, no store submission', () => {
  for (const wf of [ANDROID, IOS]) {
    const text = read(wf);
    assert.ok(/^\s+workflow_dispatch:/m.test(text), wf + ' must support manual dispatch');
    assert.ok(!/^\s+(pull_request|schedule):/m.test(text), wf + ' must not run on PRs or schedules');
    assert.ok(/branches: \["arena\/\*\*"\]/.test(text), wf + ' push trigger must be limited to arena/** working branches');
    assert.ok(/contains\(github\.event\.head_commit\.message, '\[build-app\]'\)/.test(text), wf + ' push runs must be opt-in per commit ([build-app])');
    assert.ok(/^permissions:\n  contents: read/m.test(text), wf + ' needs read-only repository permissions');
    for (const m of text.matchAll(/^\s*-?\s*name: (.+)$/gm)) {
      const v = m[1].trim();
      assert.ok(/^["']/.test(v) || !v.includes(': '), wf + ' unquoted step name with ": " breaks YAML: ' + v);
    }
    assert.ok(text.includes('npm ci') && text.includes('npx expo prebuild --platform'), wf + ' must regenerate the native project from source');
    assert.ok(text.includes('--clean'), wf + ' prebuild must start from a clean native directory');
    assert.ok(text.includes('npx tsc --noEmit') && text.includes('node --test tests/*.test.cjs'), wf + ' must run the app suites first');
    assert.ok(text.includes('make-native-icons.cjs --check'), wf + ' must verify the derived brand artwork');
    assert.ok(!/-----BEGIN|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[bp]-|eyJ[A-Za-z0-9_-]{20,}/.test(text), wf + ' must not embed credentials');
    assert.ok(!/upload-google-play|app-store-connect-upload|altool|eas submit|fastlane (deliver|supply|pilot)|xcrun notarytool/.test(text), wf + ' must not submit to a store');
    assert.ok(text.includes('::error title='), wf + ' must emit error annotations (job logs are not readable from the agent sandbox)');
  }
});

test('Android workflow: env-driven signing, both outputs, signature verification, honest labelling', () => {
  const text = read(ANDROID);
  for (const s of ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
    assert.ok(text.includes(`secrets.${s}`), s + ' must come from repository secrets');
  }
  assert.ok(text.includes('node scripts/configure-android-signing.cjs'), 'signing helper must run after prebuild');
  assert.ok(text.includes(':app:assembleRelease') && text.includes(':app:bundleRelease'), 'APK and AAB');
  assert.ok(text.includes('apksigner verify --print-certs') && text.includes('jarsigner -verify'), 'signatures must be verified');
  assert.ok(text.includes('CN=Android Debug'), 'debug-signed builds must be detected and labelled');
  assert.ok(text.includes('aapt2 dump permissions'), 'merged permissions must be reported for the store declaration');
  assert.ok(text.includes('java-version: 17') && text.includes('"ndk;27.1.12297006"') && text.includes('"platforms;android-36"'), 'toolchain pinned to React Native 0.86 requirements');
  assert.ok(text.includes('MONTEWO_ANDROID_VERSION_CODE: ${{ inputs.version_code || github.run_number }}'), 'versionCode must be monotonic by default');
  assert.ok(!text.includes('[deploy]') && !text.includes('wrangler'), 'the Android build never touches Cloudflare');
});

test('iOS workflow: unsigned Simulator build only, no secrets, embedded bundle check', () => {
  const text = read(IOS);
  assert.ok(text.includes('runs-on: macos-latest'));
  assert.ok(text.includes('pod install') && text.includes('-sdk iphonesimulator') && text.includes('-configuration Release'));
  assert.ok(text.includes('CODE_SIGNING_ALLOWED=NO') && text.includes('CODE_SIGNING_REQUIRED=NO'));
  assert.ok(!text.includes('secrets.'), 'the Simulator build must not reference any secret');
  assert.ok(text.includes('SCHEME: MONTEWO') && text.includes('-scheme "$SCHEME"'), 'scheme must match the prebuild output for name "MONTE WO"');
  assert.ok(text.includes('main.jsbundle'), 'must verify the JS bundle was embedded (Release)');
  assert.ok(text.includes('installableOnDevice: false'), 'must label the artifact as not installable on a device');
});

test('App config: identity, deep-link scheme, brand artwork, minimal permissions, env-driven versions', () => {
  const cfg = read(CONFIG);
  assert.ok(cfg.includes('name: "MONTE WO"'), 'brand name');
  assert.ok(cfg.includes('scheme: "montewo"'), 'sign-in redirect scheme (src/api.ts montewo://auth)');
  assert.ok(cfg.includes('package: "com.vitaflex.montewovitaflex"'), 'Android application id must not change (EAS project + installed previews)');
  assert.ok(cfg.includes('bundleIdentifier: "com.vitaflex.montewovitaflex"'), 'iOS bundle id');
  assert.ok(cfg.includes('icon: "./assets/brand-icon.png"'), 'approved brand icon');
  assert.ok(cfg.includes('foregroundImage: "./assets/native/adaptive-icon-foreground.png"'), 'adaptive icon derived from the brand icon');
  assert.ok(cfg.includes('semver(process.env.MONTEWO_APP_VERSION, "1.0.0")'), 'build_webapp.py reads the version from this expression');
  assert.ok(cfg.includes('positiveInteger(process.env.MONTEWO_ANDROID_VERSION_CODE, 1)') && cfg.includes('positiveInteger(process.env.MONTEWO_IOS_BUILD_NUMBER, 1)'));
  for (const p of ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.VIBRATE']) {
    assert.ok(cfg.includes(`"${p}"`), p + ' must be blocked (the app only needs INTERNET)');
  }
  assert.ok(cfg.includes('ITSAppUsesNonExemptEncryption: false'));
  // artwork files exist and have the expected geometry (PNG IHDR), without needing image libraries
  const png = p => {
    const b = readFileSync(resolve(ROOT, p));
    assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', p + ' must be a PNG');
    return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
  };
  assert.deepEqual(png('apps/mobile/assets/brand-icon.png'), {w: 512, h: 512});
  assert.deepEqual(png('apps/mobile/assets/native/adaptive-icon-foreground.png'), {w: 1024, h: 1024});
  assert.ok(existsSync(resolve(ROOT, 'apps/mobile/scripts/make-native-icons.cjs')) && existsSync(resolve(ROOT, 'apps/mobile/scripts/configure-android-signing.cjs')));
  // generated native projects are never committed
  const ignore = read('apps/mobile/.gitignore');
  assert.ok(/^\/?android\/?$/m.test(ignore) && /^\/?ios\/?$/m.test(ignore), 'apps/mobile/android and ios must stay gitignored');
  for (const p of ['apps/mobile/android', 'apps/mobile/ios']) {
    if (existsSync(resolve(ROOT, p))) assert.ok(statSync(resolve(ROOT, p)).isDirectory());
  }
});

test('EAS profiles: production builds a Play app bundle; preview stays the owner-approved internal APK', () => {
  const eas = JSON.parse(read('apps/mobile/eas.json'));
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.ok(!eas.submit, 'no automatic store submission configuration');
});
