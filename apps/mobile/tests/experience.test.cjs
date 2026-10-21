const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const app = readFileSync(path.join(__dirname, "..", "App.tsx"), "utf8");
const config = readFileSync(path.join(__dirname, "..", "app.config.ts"), "utf8");
const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

test("onboarding is multi-stage, persists completion, and bundles a local audio cue", () => {
  assert.match(app, /useAudioPlayer\(require\("\.\/assets\/onboarding-sting\.wav"\)\)/);
  assert.match(app, /montewo\.onboarding\.completed\.v1/);
  assert.match(app, /montewo\.onboarding\.sound\.v1/);
  assert.match(app, /montewo\.onboarding\.haptics\.v1/);
  assert.match(app, /WELCOME TO THE CLIMB/);
  assert.match(app, /TRAIN WITH INTENTION/);
  assert.match(app, /RANKS ARE EARNED/);
  assert.equal(pkg.dependencies["expo-audio"], "~57.0.5");
});

test("onboarding audio does not request Android microphone access", () => {
  assert.match(config, /\["expo-audio", \{ recordAudioAndroid: false \}\]/);
});

test("new workout saves locally before attempting account sync", () => {
  const localSave = app.indexOf("await a.saveLocal(workout)");
  const remoteSave = app.indexOf("await saveAccountWorkout(workout");
  assert.ok(localSave >= 0, "local save must exist");
  assert.ok(remoteSave > localSave, "account sync must only follow the local save");
  assert.match(app, /if \(a\.me && a\.available\)/);
  assert.match(app, /Your local copy is preserved/);
  assert.match(app, /Existing device-only records are never uploaded automatically/);
});

test("general app controls do not redirect to website pages", () => {
  assert.doesNotMatch(app, /const legal =/);
  assert.doesNotMatch(app, /Website connection status/);
  assert.doesNotMatch(app, /Open the existing website calculator/);
  assert.doesNotMatch(app, /legal\("\/privacy\/"\)/);
  assert.doesNotMatch(app, /legal\("\/terms\/"\)/);
  assert.match(app, /function Privacy\(\)/);
  assert.match(app, /function Terms\(\)/);
  assert.match(app, /navigation\.navigate\("Privacy"\)/);
  assert.match(app, /navigation\.navigate\("Terms"\)/);
  assert.doesNotMatch(app, /Native calculator planned/);});

test("nutrition estimates are calculated on-device without website redirects", () => {
  assert.match(app, /Mifflin–St Jeor/);
  assert.match(app, /1\.6–2\.2 g per kg/);
  assert.match(app, /Private, on-device estimates/);
  assert.doesNotMatch(app, /legal\("\/tools\//);
});

test("workout history and rank awards remain separate", () => {
  assert.match(app, /workout volume alone never awards a rank/);
  assert.match(app, /Submit a discipline performance/);
  assert.match(app, /rank\.progress/);
  assert.match(app, /Progress toward /);
  assert.match(app, /DRAFT STANDARDS/);
});
