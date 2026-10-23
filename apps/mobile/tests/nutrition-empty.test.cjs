const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'App.tsx'), 'utf8');
const start = app.indexOf('function Nutrition()');
const end = app.indexOf('function SignIn(', start);
const nutrition = app.slice(start, end);

test('nutrition starts blank and does not present estimates from fabricated body measurements', () => {
  assert.match(nutrition, /const \[weight, setWeight\] = useState\(" "\)|const \[weight, setWeight\] = useState\("\)/);
  assert.match(nutrition, /const \[height, setHeight\] = useState\("\)/);
  assert.match(nutrition, /const \[age, setAge\] = useState\("\)/);
  assert.match(nutrition, /!validWeight\s*\?/);
  assert.match(nutrition, /!validBody\s*\?/);
  assert.match(nutrition, /Enter a bodyweight from 30 to 350 kg to calculate an estimate/);
});
