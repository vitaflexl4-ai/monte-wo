import { chromium, webkit, devices } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.COCKPIT_URL || "http://127.0.0.1:8084",
  results = [];
for (const [name, engine, options] of [
  ["phone", chromium, { viewport: { width: 390, height: 844 } }],
  ["ipad", webkit, { ...devices["iPad (gen 7)"] }],
  ["desktop", chromium, { viewport: { width: 1440, height: 1000 } }],
]) {
  let b;
  try {
    b = await engine.launch();
    const p = await b.newPage(options),
      errors = [];
    p.setDefaultTimeout(20000);
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/exercises/");
    await p.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    await p.locator("#exercise-search").fill("dumbbell bench");
    await p.locator('[data-exercise="dumbbell-bench-press"]').click();
    await p.locator('[data-play="demo"]').click();
    await p.waitForFunction(() => {
      const v = document.querySelector("#exercise-video");
      return v.readyState >= 2 && v.currentTime > 0.2;
    });
    assert.equal(await p.locator("#exercise-video").evaluate((v) => v.loop), false);
    await p.locator('[data-play="loop"]').click();
    await p.waitForFunction(() => {
      const v = document.querySelector("#exercise-video");
      return v.loop && v.readyState >= 2 && v.currentTime > 0.2;
    });
    await p.locator("#close-dialog").click();
    assert.equal(await p.locator("#exercise-video").getAttribute("src"), null);
    assert.deepEqual(errors, []);
    results.push({
      name,
      passed: true,
      realPinnedDemoAndLoopPlayback: true,
      closeStopsPlayback: true,
      errors,
    });
  } catch (e) {
    results.push({ name, passed: false, error: e.stack });
  } finally {
    await b?.close();
  }
}
// Values below are intercepted TEST FIXTURES ONLY, never written to the food catalog.
const b = await chromium.launch();
try {
  const c = await b.newContext({ serviceWorkers: "block" }),
    p = await c.newPage();
  await p.route("**/cockpit-nutrition.json", (r) =>
    r.fulfill({
      json: {
        targets: { calories: 200, protein: 20, carbs: 40, fats: 10 },
        foods: [
          {
            id: "griot",
            name: "Griot",
            status: "verified",
            serving: "TEST FIXTURE",
            source: "TEST FIXTURE ONLY",
            macros: { calories: 100, protein: 5, carbs: 8, fats: 3 },
          },
          {
            id: "diri-djon-djon",
            name: "Diri ak Djon Djon",
            status: "unavailable",
            serving: null,
            source: null,
            macros: null,
          },
        ],
      },
    }),
  );
  await p.goto(base + "/exercises/");
  await p.waitForFunction(
    () => document.documentElement.dataset.ready === "true",
  );
  await p.locator('.target-settings summary').click();
  for(const [key,value] of Object.entries({calories:'200',protein:'20',carbs:'40',fats:'10'}))await p.locator('#target-'+key).fill(value);
  await p.getByRole('button',{name:'Apply targets',exact:true}).click();
  assert.equal(
    await p.locator('[data-macro="calories"] .ring span').textContent(),
    "50%",
  );
  assert.equal(
    await p.locator('[data-macro="protein"] .macro-value>span').textContent(),
    "5",
  );
  await p.locator('[data-food="diri-djon-djon"]').click();
  assert.equal(
    await p.locator('[data-macro="calories"] .macro-value>span').textContent(),
    "—",
  );
  assert.equal(await p.locator('.ring[data-state="unavailable"]').count(), 4);
  await c.close();
  const fail = await b.newContext({ serviceWorkers: "block" }),
    fp = await fail.newPage();
  await fp.route("**/cockpit-catalog.json", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await fp.goto(base + "/exercises/");
  await fp.getByText("Browse written guides ↗", { exact: true }).waitFor();
  assert.equal(await fp.locator("[data-exercise]:disabled").count(), 62);
  await fp.getByText("Browse written guides ↗", { exact: true }).click();
  await fp.locator(".library-filters").waitFor();
  await fail.close();
  results.push({
    name: "explicit-test-fixtures-and-load-fallback",
    passed: true,
    verifiedRingRendering: true,
    unknownClearsStaleValues: true,
    failedContentFallback: true,
  });
} finally {
  await b.close();
}
await fs.writeFile(
  "docs/website/cockpit/qa/edge-results.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
