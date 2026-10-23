const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
const start = app.indexOf('function Nutrition()');
const end = app.indexOf('function SignIn(', start);
const nutrition = app.slice(start, end);

test('nutrition starts blank and does not present estimates from fabricated body measurements', () => {
  assert.ok(nutrition.includes('const [weight, setWeight] = useState("");'));
  assert.ok(nutrition.includes('const [height, setHeight] = useState("");'));
  assert.ok(nutrition.includes('const [age, setAge] = useState("");'));
  assert.ok(nutrition.includes('!validWeight ?'));
  assert.ok(nutrition.includes('!validBody ?'));
  assert.ok(nutrition.includes('Enter a bodyweight from 30 to 350 kg to calculate an estimate'));
});
