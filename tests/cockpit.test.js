import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { nutritionState } from "../public/cockpit-nutrition.js";
import { indexLibrary, filterLibrary } from "../public/cockpit-library.js";
const data = JSON.parse(fs.readFileSync("public/cockpit-catalog.json")),
  foods = JSON.parse(fs.readFileSync("content/nutrition/foods.json"));
test("cockpit uses current shared catalog and mobile filter inputs without a second merge engine", () => {
  for (const [path, hash] of Object.entries(data.inputs))
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex"),
      hash,
    );
  assert.equal(data.catalog.exercises.length, 62);
  assert.equal(data.catalog.exercises.filter((e) => e.pack).length, 57);
  assert.equal(data.catalog.exercises.filter((e) => e.steps.length).length, 14);
  assert.equal(data.catalog.groups.length, 8);
});
test("source filters retain original guide and animation boundaries", () => {
  const index = indexLibrary(data.catalog.exercises),
    f = {
      query: "",
      group: "all",
      source: "all",
      equipment: "all",
      sort: "az",
    };
  assert.equal(filterLibrary(index, { ...f, group: "back" }).length, 8);
  assert.equal(filterLibrary(index, { ...f, source: "guides" }).length, 14);
  assert.equal(filterLibrary(index, { ...f, source: "pack" }).length, 57);
  assert.equal(
    filterLibrary(index, { ...f, query: "dumbbell bench" }).length,
    1,
  );
});
test("user-provided serving macros are exact; no targets are invented",()=>{
 const expected={griot:[290,24,0,21],"diri-djon-djon":[360,8,72,4],"bannann-peze":[210,1,32,9]};
 assert.equal(foods.targets,null);
 for(const f of foods.foods){assert.deepEqual(Object.values(f.macros),expected[f.id]);assert.match(f.source,/User-provided/);for(const v of Object.values(nutritionState(f))){assert.notEqual(v.value,null);assert.equal(v.percent,null)}}
});
test("ring renderer supports verified records but never substitutes zero or default targets", () => {
  const fixture = {
    status: "verified",
    serving: "TEST FIXTURE ONLY",
    source: "TEST FIXTURE ONLY",
    macros: { calories: 100, protein: 10, carbs: 0, fats: 2 },
  };
  assert.equal(nutritionState(fixture).calories.percent, null);
  assert.equal(nutritionState(fixture, { calories: 50 }).calories.percent, 200);
  assert.equal(nutritionState(fixture, { calories: 50 }).calories.fill, 100);
  assert.equal(nutritionState(fixture, { carbs: 20 }).carbs.fill, 0);
  assert.equal(
    nutritionState({ ...fixture, source: null }).calories.value,
    null,
  );
  assert.equal(
    nutritionState({ ...fixture, status: "unavailable" }).calories.value,
    null,
  );
  assert.equal(nutritionState(fixture, { calories: 0 }).calories.percent, null);
});
test("nonfinite, negative and numeric strings cannot become food facts or goals", () => {
  for (const value of [NaN, Infinity, -1, "100", undefined, null]) {
    const f = {
      status: "verified",
      serving: "fixture",
      source: "fixture",
      macros: { calories: value },
    };
    assert.equal(nutritionState(f, { calories: 200 }).calories.value, null);
  }
});
test("source SVG and approved tier names survive website publication", () => {
  const map = JSON.parse(fs.readFileSync("public/cockpit-map.json"));
  assert.equal(map.source.commit, "3f60741742db3db0c92d6d316e81b3e4e430d7da");
  assert.equal(
    map.regions.reduce((n, r) => n + Object.values(r.paths).flat().length, 0),
    54,
  );
  assert.deepEqual(
    Object.fromEntries(map.regions.map((r) => [r.id, r.tierId])),
    {
      arms: "chanpyon",
      legs: "bati",
      chest: "fo",
      back: "avanse",
      core: "met",
    },
  );
  const html = fs.readFileSync("public/exercises/index.html", "utf8");
  assert.match(html, /4 ranked disciplines/);
  assert.match(html, /Fò/);
  assert.doesNotMatch(
    fs.readFileSync("public/cockpit.js", "utf8"),
    /postMessage|localStorage|rankScore/,
  );
});

import {assertProtectedSource} from './fixtures/protected-source.js';
test('license guard accepts only the original or exact whitespace-only snapshot, never changed license text',()=>{const original='5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57';assertProtectedSource('public/assets/INTER-LICENSE.txt',original,original);assertProtectedSource('public/assets/INTER-LICENSE.txt',original,'5dd548d31a85f756e01d63e00d7faf1e324103ed3e9102fcbbabf2cc2db6dd39');assert.throws(()=>assertProtectedSource('public/assets/INTER-LICENSE.txt',original,'tampered'));});
