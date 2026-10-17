import { chromium, webkit, devices } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.COCKPIT_URL || "http://127.0.0.1:8084",
  dir = "docs/website/cockpit/qa";
await fs.mkdir(dir, { recursive: true });
const results = [];
for (const [name, engine, options, columns] of [
  ["phone", chromium, { viewport: { width: 390, height: 844 } }, 2],
  ["ipad", webkit, { ...devices["iPad (gen 7)"] }, 3],
  ["desktop", chromium, { viewport: { width: 1440, height: 1000 } }, 4],
]) {
  let b;
  try {
    b = await engine.launch();
    const p = await b.newPage(options);
    p.setDefaultTimeout(12000);
    const errors = [],
      failed = [],
      media = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("response", (r) => {
      if (r.status() >= 400) failed.push(r.url());
    });
    p.on("request", (r) => {
      if (r.url().endsWith(".mp4")) media.push(r.url());
    });
    await p.goto(base + "/exercises/");
    await p.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    const count = () => p.locator("[data-exercise]:visible").count();
    assert.equal(await count(), 62);
    assert.equal(
      await p.locator("#avatar [data-muscle]:visible path").count(),
      28,
    );
    assert.equal(media.length, 0);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.equal(
      await p
        .locator("#exercise-grid")
        .evaluate(
          (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
        ),
      columns,
    );
    await p.mouse.move(0, 0);
    await p.screenshot({
      path: dir + "/" + name + "-cockpit.png",
      fullPage: false,
    });
    await p
      .locator("#nutrition")
      .screenshot({ path: dir + "/" + name + "-nutrition.png" });
    await p
      .locator('#avatar [data-muscle="arms"][data-v="f"] path')
      .nth(2)
      .hover();
    assert.equal(await count(), 7);
    const filterMs = Number(
      await p.locator("html").getAttribute("data-filter-ms"),
    );
    await p.mouse.move(0, 0);
    assert.equal(await count(), 62);
    await p.locator('[data-region="arms"]').click();
    await p.mouse.move(0, 0);
    assert.equal(await count(), 7);
    assert.equal(
      await p.locator('[data-region="arms"]').getAttribute("aria-pressed"),
      "true",
    );
    await p.locator('[data-region="arms"]').click();
    await p.mouse.move(0, 0);
    assert.equal(await count(), 62);
    await p.locator('[data-region="legs"]').focus();
    await p.keyboard.press("Enter");
    await p.mouse.move(0, 0);
    assert.equal(
      await p.locator('[data-region="legs"]').getAttribute("aria-pressed"),
      "true",
    );
    assert.ok((await count()) >= 16);
    await p.getByRole("button", { name: "Back", exact: true }).first().click();
    assert.equal(await count(), 62);
    assert.equal(
      await p.locator("#avatar [data-muscle]:visible path").count(),
      26,
    );
    await p.locator('#avatar [data-muscle="back"] path').first().click();
    await p.mouse.move(0, 0);
    assert.equal(await count(), 8);
    for (const [food, label] of [
      ["griot", "Griot (Fried Pork)"],
      ["diri-djon-djon", "Diri ak Djon Djon"],
      ["bannann-peze", "Bannann Peze"],
    ]) {
      await p.locator('[data-food="' + food + '"]').click();
      assert.equal(await p.locator("#food-name").textContent(), label);
      assert.equal(
        await p
          .locator(".macro-value>span")
          .allTextContents()
          .then((a) => a.every((x) => Number.isFinite(Number(x)))),
        true,
      );
      assert.equal(await p.locator(".ring[data-state=unavailable]").count(), 4);
      assert.equal(
        await p.locator("[data-food][aria-pressed=true]").count(),
        1,
      );
    }
    await p.getByRole("button", { name: "Reset", exact: true }).click();
    await p
      .getByRole("searchbox", { name: "Search exercises" })
      .fill("dumbbell bench");
    assert.equal(await count(), 1);
    await p.locator('[data-exercise="dumbbell-bench-press"]').click();
    await p.getByRole("dialog").waitFor();
    assert.equal(media.length, 0);
    await p.keyboard.press("Escape");
    assert.equal(await p.getByRole("dialog").count(), 0);
    await p
      .getByRole("searchbox", { name: "Search exercises" })
      .fill("no-such-exercise");
    await p.locator("#empty").waitFor();
    await p.getByRole("button", { name: "Show all movements ↗" }).click();
    assert.equal(await count(), 62);
    await p.locator("#source").selectOption("guides");
    assert.equal(await count(), 14);
    await p.locator("#sort").selectOption("za");
    assert.match(
      await p
        .locator("[data-exercise]:visible")
        .first()
        .getAttribute("data-exercise"),
      /triceps/,
    );
    await p.locator("#reset").click();
    if (name === "desktop") {
      await p.setViewportSize({ width: 375, height: 812 });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await p.setViewportSize({ width: 1440, height: 1000 });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    results.push({
      name,
      passed: true,
      columns,
      hoverFilterMs: filterMs,
      hoverPreviewReverts: true,
      clickPins: true,
      keyboard: true,
      viewSwitchClears: true,
      foodValuesHonest: true,
      noAutoplay: true,
      filters: true,
      errors,
    });
  } catch (e) {
    results.push({ name, passed: false, error: e.stack });
  } finally {
    await b?.close();
  }
}
await fs.writeFile(dir + "/results.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
