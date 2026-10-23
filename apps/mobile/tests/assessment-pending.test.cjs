const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'App.tsx'), 'utf8');

test('unapproved discipline standards display assessment pending, not an invented rank', () => {
  assert.match(app, /rank \? rankNames\[rank\.rankId\] : "ASSESSMENT PENDING"/);
  assert.match(app, /!approved\s*\? "Assessment pending · standards not approved"/);
  assert.match(app, /!card\?\.modelApproved \|\| !card\?\.ruleApproved\s*\? "Assessment pending"/);
  assert.match(app, /"No rank earned"/);
  assert.match(app, /\? "ASSESSMENT STATUS"/);
  assert.match(app, /DRAFT — NOT OFFICIAL\. No approved thresholds are available/);
});
