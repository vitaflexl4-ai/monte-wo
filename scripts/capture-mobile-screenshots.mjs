import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const origin = "http://127.0.0.1:8082";
const output = path.join(root, "artifacts", "mobile-screenshots");
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ["scripts/preview_mobile_app.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: "8082",
    PREVIEW_ENTRY: "/mobile/",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });
let browser;
const pageErrors = [];
async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin + "/mobile/");
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error("Local app preview did not start. " + serverOutput);
}
async function save(page, name) {
  await page.screenshot({
    path: path.join(output, name + ".png"),
    animations: "disabled",
    caret: "hide",
  });
}
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  // Keep screenshots disconnected from live services and prevent accidental
  // cross-origin requests. The local preview server has no production bindings.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" && url.port === "8082") return route.continue();
    return route.abort();
  });
  await page.goto(origin + "/mobile/", { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("button", { name: "Explore without setup" }).click();
  await page.getByText("Welcome to the climb.").waitFor({ timeout: 20_000 });
  await save(page, "01-home");

  await page.getByRole("tab", { name: "Train" }).click();
  await page.getByText("Every set counts.").waitFor();
  await save(page, "02-workout");

  await page.getByRole("tab", { name: "Home" }).click();
  await page.getByText("Fuel your training").click();
  await page.getByText("Make room for recovery.").waitFor();
  await save(page, "03-nutrition");

  await page.getByRole("tab", { name: "Home" }).click();
  await page.getByLabel("Squat discipline").click();
  await page.getByText("DRAFT — NOT OFFICIAL. No approved thresholds are available for this discipline. No official MONTE Climb Scale percentage is shown.").waitFor();
  await page.getByText("Assessment pending", { exact: true }).waitFor();
  await save(page, "04-rank");

  if (pageErrors.length) throw new Error("App preview browser errors: " + pageErrors.join(" | "));
  await writeFile(path.join(output, "README.txt"),
    "MONTE WO actual app screen captures\n" +
    "Rendered from the Expo / React Native app web export (React Native Web), not a native Android device capture.\n" +
    "Viewport: 390 × 844 CSS pixels; device scale factor: 2; reduced motion enabled.\n" +
    "No signed-in account or athlete records were used. API bindings are local and empty.\n" +
    "Rank screen intentionally shows assessment pending / no rank earned because approved thresholds are not present.\n" +
    "Screens: 01-home.png, 02-workout.png, 03-nutrition.png, 04-rank.png.\n");
  console.log("Captured Home, Workout, Nutrition and Rank from the actual Expo app.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
