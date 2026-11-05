const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {decision, channelOf, loadReviewed} = require('../scripts/check-build-security.cjs');

// Fixture reviewed set (same shape as security/reviewed-advisories.json) so the tests do not depend on the live file.
const reviewed = () => ({
  reviewedAt: '2026-11-04', publicReleaseAuthorized: false, allowedChannels: ['eas-preview-android', 'internal-ci'],
  installedVersions: {'node-forge': ['1.4.0'], zod: ['3.25.76']},
  advisories: [
    {name: 'node-forge', url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv', range: '<=1.4.0', severity: 'high'},
    {name: 'zod', url: 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5', range: '<4.6.6', severity: 'high'},
  ],
});
const easEnv = {EAS_BUILD_PROFILE: 'preview', EAS_BUILD_PLATFORM: 'android', MONTEWO_INTERNAL_APK_RISK_ACCEPTED: 'true'};
const ciEnv = {MONTEWO_BUILD_CHANNEL: 'internal-ci', MONTEWO_INTERNAL_APK_RISK_ACCEPTED: 'true'};
const lock = () => ({packages: {'node_modules/node-forge': {version: '1.4.0'}, 'node_modules/zod': {version: '3.25.76'}}});
const sample = () => ({
  metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 3, critical: 0, total: 3}},
  vulnerabilities: {
    'node-forge': {severity: 'high', via: [{name: 'node-forge', url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv', range: '<=1.4.0', severity: 'high'}]},
    zod: {severity: 'high', via: [{name: 'zod', url: 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5', range: '<4.6.6', severity: 'high'}]},
    '@expo/cli': {severity: 'high', via: ['node-forge', 'zod']},
  },
});

test('reviewed exception allows EAS preview/Android and internal CI, never public release', () => {
  for (const env of [easEnv, ciEnv]) {
    const r = decision(sample(), lock(), env, reviewed());
    assert.equal(r.allowed, true);
    assert.equal(r.publicReleaseAuthorized, false);
    assert.equal(r.remaining.high, 3);
    assert.deepEqual(r.advisoryRoots, ['node-forge', 'zod']);
    assert.match(r.exception, /not public-release approval/);
  }
  assert.equal(channelOf(easEnv), 'eas-preview-android');
  assert.equal(channelOf(ciEnv), 'internal-ci');
});

test('production, store, iOS-EAS and missing risk approval are denied', () => {
  const denied = [
    {...easEnv, EAS_BUILD_PROFILE: 'production'},
    {...easEnv, EAS_BUILD_PLATFORM: 'ios'},
    {...easEnv, MONTEWO_INTERNAL_APK_RISK_ACCEPTED: 'false'},
    {...ciEnv, MONTEWO_INTERNAL_APK_RISK_ACCEPTED: undefined},
    {...ciEnv, MONTEWO_BUILD_CHANNEL: 'store'},
    {...ciEnv, EAS_BUILD_PROFILE: 'production'},
    {},
  ];
  for (const env of denied) assert.throws(() => decision(sample(), lock(), env, reviewed()), /only the reviewed internal channels/);
  const narrowed = reviewed(); narrowed.allowedChannels = ['eas-preview-android'];
  assert.throws(() => decision(sample(), lock(), ciEnv, narrowed), /not in the reviewed exception/);
});

test('unknown, renamed, widened or re-rated advisories fail closed', () => {
  const mutate = (fn) => { const a = sample(); fn(a.vulnerabilities.zod.via[0]); return a; };
  for (const a of [
    mutate(v => { v.url = 'https://github.com/advisories/GHSA-new0-0000-0000'; }),
    mutate(v => { v.name = 'zod-mini'; }),
    mutate(v => { v.range = '<5.0.0'; }),
    mutate(v => { v.severity = 'moderate'; }),
  ]) assert.throws(() => decision(a, lock(), ciEnv, reviewed()), /New or changed advisory/);
  const extra = sample();
  extra.vulnerabilities.glob = {severity: 'moderate', via: [{name: 'glob', url: 'https://github.com/advisories/GHSA-3g3m-2fjr-6pw4', range: '>=9.0.0 <=14.0.1', severity: 'moderate'}]};
  extra.metadata.vulnerabilities.moderate = 1; extra.metadata.vulnerabilities.total = 4;
  assert.throws(() => decision(extra, lock(), ciEnv, reviewed()), /New or changed advisory/);
});

test('installed version drift of a reviewed package fails closed', () => {
  const drift = lock(); drift.packages['node_modules/node-forge'].version = '1.3.1';
  assert.throws(() => decision(sample(), drift, ciEnv, reviewed()), /version changed: node-forge/);
  const extraCopy = lock(); extraCopy.packages['node_modules/expo/node_modules/zod'] = {version: '3.22.0'};
  assert.throws(() => decision(sample(), extraCopy, ciEnv, reviewed()), /version changed: zod/);
  const missing = lock(); delete missing.packages['node_modules/zod'];
  assert.throws(() => decision(sample(), missing, ciEnv, reviewed()), /version changed: zod/);
});

test('critical advisories can never use the exception', () => {
  const a = sample(); a.metadata.vulnerabilities.critical = 1; a.metadata.vulnerabilities.high = 2; a.vulnerabilities.zod.severity = 'critical'; a.vulnerabilities.zod.via[0].severity = 'critical';
  assert.throws(() => decision(a, lock(), ciEnv, reviewed()), /Critical advisories/);
});

test('network/malformed/inconsistent audit cannot masquerade as clean', () => {
  const broken = [
    {}, {error: 'network'},
    {metadata: {vulnerabilities: {total: 0}}, vulnerabilities: sample().vulnerabilities},
    {metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1}}, vulnerabilities: {}},
    {metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 2, critical: 0, total: 3}}, vulnerabilities: sample().vulnerabilities},
  ];
  for (const a of broken) assert.throws(() => decision(a, lock(), ciEnv, reviewed()));
  const dangling = sample(); dangling.vulnerabilities['@expo/cli'].via = ['something-else'];
  assert.throws(() => decision(dangling, lock(), ciEnv, reviewed()), /Incomplete dependency chain/);
});

test('zero findings is allowed anywhere but still does not authorize publication', () => {
  const r = decision({metadata: {vulnerabilities: {total: 0, info: 0, low: 0, moderate: 0, high: 0, critical: 0}}, vulnerabilities: {}}, lock(), {}, reviewed());
  assert.equal(r.allowed, true);
  assert.equal(r.exception, false);
  assert.equal(r.publicReleaseAuthorized, false);
});

test('the committed reviewed set is internally consistent with package-lock.json and never authorizes release', () => {
  const live = loadReviewed();
  assert.equal(live.publicReleaseAuthorized, false);
  assert.equal(live.reviewedAt, '2026-11-04');
  assert.deepEqual(live.allowedChannels, ['eas-preview-android', 'internal-ci']);
  assert.ok(live.advisories.length >= 5);
  const pkgLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  for (const a of live.advisories) {
    assert.match(a.url, /^https:\/\/github\.com\/advisories\/GHSA-[a-z0-9-]+$/);
    assert.ok(['low', 'moderate', 'high'].includes(a.severity), `${a.url}: critical advisories must not be in the reviewed set`);
    assert.ok(live.installedVersions[a.name], `${a.name} must have pinned installed versions`);
    assert.ok(a.usedBy && a.remediation, `${a.url} must explain where it is used and how it will be fixed`);
  }
  for (const [name, versions] of Object.entries(live.installedVersions)) {
    const installed = [...new Set(Object.entries(pkgLock.packages).filter(([k]) => k.endsWith('node_modules/' + name)).map(([, p]) => p.version))].sort();
    assert.deepEqual(installed, [...versions].sort(), `${name}: reviewed-advisories.json pins must match package-lock.json (re-review after dependency changes)`);
  }
});

test('xcode uses patched CommonJS uuid v4 with valid project IDs', () => {
  const {createRequire} = require('node:module');
  const xcodeRequire = createRequire(require.resolve('xcode'));
  assert.equal(xcodeRequire('uuid/package.json').version, '11.1.1');
  const p = require('xcode').project('/not-read.pbxproj');
  p.hash = {project: {objects: {}}};
  const ids = Array.from({length: 100}, () => p.generateUuid());
  for (const id of ids) assert.match(id, /^[A-F0-9]{24}$/);
  assert.equal(new Set(ids).size, 100);
});

test('preview profile is APK/internal/remote-signing with no auto submission', () => {
  const j = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  assert.equal(j.build.preview.android.buildType, 'apk');
  assert.equal(j.build.preview.distribution, 'internal');
  assert.equal(j.build.preview.credentialsSource, 'remote');
  assert.equal(j.build.preview.env.MONTEWO_INTERNAL_APK_RISK_ACCEPTED, 'true');
  assert.equal(j.build.production.env?.MONTEWO_INTERNAL_APK_RISK_ACCEPTED, undefined);
});
