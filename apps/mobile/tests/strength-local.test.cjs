// The device-local strength records must use the ONE shared engine and, with the shipped DRAFT methodology,
// never award a rank. (strength-local.ts itself needs the React Native runtime; the engine + bundled catalog
// are exercised here exactly as the app calls them.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const standards = require('../src/generated/standards.json');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'strength-local.ts'), 'utf8');
const engine = () => import('../../../server/strength/engine.js');

const perf = (discipline, over = {}) => {
  const rule = standards.rulebooks.find(r => r.discipline === discipline);
  return {
    discipline, load: '140', unit: 'kg', reps: 1, resultType: 'tested', performedOn: '2026-11-05',
    bodyweight: '82.5', bodyweightUnit: 'kg', sexCategory: 'male', ageYears: 34,
    variation: rule.variation, equipment: rule.equipment[0],
    checks: Object.fromEntries(rule.checks.map(c => [c.id, true])), ...over,
  };
};

test('the app imports the canonical engine and contains no rank mathematics of its own', () => {
  assert.match(source, /from "\.\.\/\.\.\/\.\.\/server\/strength\/engine\.js"/);
  assert.doesNotMatch(source, /thresholdsUg|epley|\(30\s*\+|RANK_IDS\s*\[/);
  assert.match(source, /methodologyStatus/);
  const metro = fs.readFileSync(path.join(__dirname, '..', 'metro.config.cjs'), 'utf8');
  assert.match(metro, /server\/strength/);
});

test('with the shipped DRAFT methodology every valid performance is assessed as draft — no rank awarded', async () => {
  const {evaluate, validatePerformance} = await engine();
  for (const d of ['squat', 'bench', 'deadlift', 'curl']) {
    const rule = standards.rulebooks.find(r => r.discipline === d);
    const model = standards.models.find(m => m.discipline === d);
    assert.equal(rule.status, 'draft');
    assert.equal(model.status, 'draft');
    const p = perf(d);
    validatePerformance(p, rule, '2026-11-05');
    const approved = model.status === 'approved' && rule.status === 'approved';
    const out = evaluate(p, {model, rule, modelApproved: approved, ruleApproved: approved});
    assert.equal(out.status, 'draft');
    assert.equal(out.rankId, null);
    assert.equal(out.eligibleRankId, null);
    assert.match(out.explanation, /DRAFT — NOT OFFICIAL/);
  }
});

test('the engine rejects what the device form must reject (codes mapped to messages in strength-local.ts)', async () => {
  const {validatePerformance, validateProfile} = await engine();
  const rule = standards.rulebooks.find(r => r.discipline === 'squat');
  const expect = (p, code) => assert.throws(() => validatePerformance(p, rule, '2026-11-05'), e => e.code === code, code);
  expect(perf('squat', {load: 'abc'}), 'decimal-string-required');
  expect(perf('squat', {reps: 3}), 'result-type-repetition-mismatch');
  expect(perf('squat', {resultType: 'estimated', reps: 1}), 'result-type-repetition-mismatch');
  expect(perf('squat', {performedOn: '2026-11-06'}), 'invalid-date');
  const unchecked = perf('squat'); unchecked.checks[rule.checks[0].id] = false;
  expect(unchecked, 'monte-standard-not-attested');
  assert.throws(() => validateProfile({bodyweight: '20', unit: 'kg', sexCategory: 'male', ageYears: 30}), e => e.code === 'bodyweight-outside-software-support');
  assert.throws(() => validateProfile({bodyweight: '80', unit: 'kg', sexCategory: 'male', ageYears: 17}), e => e.code === 'adult-age-outside-software-support');
  for (const code of ['decimal-string-required', 'result-type-repetition-mismatch', 'invalid-date', 'monte-standard-not-attested', 'bodyweight-outside-software-support', 'adult-age-outside-software-support'])
    assert.ok(source.includes(`"${code}"`), 'message for ' + code);
});

test('heaviest() compares by mass across units (kg vs lb)', async () => {
  const {mass} = await engine();
  assert.ok(mass('100', 'kg') > mass('200', 'lb'));
  assert.ok(mass('230', 'lb') > mass('100', 'kg'));
});
