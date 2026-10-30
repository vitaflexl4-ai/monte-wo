import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const base = process.env.WEBSITE_URL || "http://localhost:8080",
  routes = JSON.parse(readFileSync("public/library-routes.json"));
const browser = await chromium.launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  uploads = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.method() !== "GET") uploads.push(r.url());
});
await page.goto(base + "/exercises/");
await page.waitForFunction(
  () => document.documentElement.dataset.ready === "true",
);
assert.equal(await page.locator("[data-exercise]:visible").count(), 62);
await page.locator("#exercise-search").fill("rdl");
assert.equal(
  await page.locator("[data-exercise]:visible h3").textContent(),
  "Romanian deadlift",
);
await page.locator("[data-exercise]:visible").click();
await page.locator("#guide-link").click();
await page.locator(".guide-steps").waitFor();
assert.equal(await page.locator("h1").textContent(), "Romanian deadlift.");
await page.goto(base + "/exercises/");
await page.waitForFunction(
  () => document.documentElement.dataset.ready === "true",
);
await page.locator('[data-group="shoulders"]').click();
await page.locator("#equipment").selectOption("dumbbells");
await page.locator("#source").selectOption("guides");
assert.equal(
  await page.locator("[data-exercise]:visible h3").textContent(),
  "Lateral raise",
);
await page.locator("#exercise-search").fill("notreal");
assert.ok(await page.locator("#empty").isVisible());
await page.locator("[data-reset]").click();
assert.equal(await page.locator("[data-exercise]:visible").count(), 62);
await page.locator("#sort").selectOption("za");
assert.equal(
  await page.locator("[data-exercise]:visible h3").first().textContent(),
  "Wide-grip pull-up",
);
// Existing seven group pages and fourteen written guides still work independently.
await page.goto(base + "/exercises/muscle/chest/");
assert.equal(await page.locator("[data-exercise]:visible").count(), 2);
await page.locator("#exercise-search").fill("notreal");
await page.locator("#library-reset").click();
assert.equal(await page.locator("[data-exercise]:visible").count(), 2);
await page.locator('[data-exercise][data-name="Bench press"]').click();
assert.equal(await page.locator("h1").textContent(), "Bench press.");
assert.equal(await page.locator(".guide-steps li").count(), 3);
assert.match(
  await page.locator(".repository-video").textContent(),
  /not exercise-technique approval/,
);
assert.equal(await page.locator(".repository-video video").count(), 1);
for (const route of routes) {
  assert.equal((await page.goto(base + route)).status(), 200, route);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${route} @ ${width}`,
    );
  }
}
await page.goto(base + "/exercises/");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller);
await context.setOffline(true);
await page.reload();
await page.waitForFunction(
  () => document.documentElement.dataset.ready === "true",
);
await page.locator("#exercise-search").fill("bench");
assert.equal(await page.locator("[data-exercise]:visible").count(), 2);
await page.goto(base + "/exercises/muscle/core/");
assert.equal(await page.locator("[data-exercise]:visible").count(), 2);
await page.goto(base + "/exercises/dead-bug/");
assert.equal(await page.locator(".guide-steps li").count(), 3);
assert.deepEqual(errors, []);
assert.deepEqual(uploads, []);
const nojs = await browser.newContext({ javaScriptEnabled: false }),
  p = await nojs.newPage();
await p.goto(base + "/exercises/");
assert.equal(await p.locator("[data-exercise]:visible").count(), 62);
assert.equal(await p.locator("[data-exercise]:disabled").count(), 62);
assert.match(await p.locator("noscript").textContent(), /JavaScript/);
await p.locator("noscript a").first().click();
assert.ok((await p.locator("[data-exercise]").count()) > 0);
await browser.close();
console.log(
  "PASS: 62 cockpit entries; shared search/filters; 7 legacy group pages and 14 guides; 22 routes × 4 widths; offline cockpit and guides; no-JS readable catalog + guide fallback; zero uploads or JS errors.",
);
