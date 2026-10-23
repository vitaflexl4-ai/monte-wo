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
  env: { ...process.env, PORT: "8082", PREVIEW_ENTRY: "/mobile/" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });
let browser;
const contexts = [];
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
async function newAppPage() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  contexts.push(context);
  // A local guest-preview preference skips onboarding for repeatable captures.
  // No account or athlete data is created; sound and haptics stay off.
  await context.addInitScript(() => {
    localStorage.setItem("montewo.onboarding.completed.v1", "1");
    localStorage.setItem("montewo.onboarding.sound.v1", "0");
    localStorage.setItem("montewo.onboarding.haptics.v1", "0");
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(45_000);
  page.on("pageerror", error => pageErrors.push(error.message));
  // Block cross-origin browser requests. The local preview server has empty
  // account bindings and no production credentials.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" && url.port === "8082") return route.continue();
    return route.abort();
  });
  await page.goto(origin + "/mobile/", { waitUntil: "domcontentloaded" });
  await page.getByText("Welcome to the climb.").waitFor();
  return page;
}
async function save(page, name) {
  await page.screenshot({
    path: path.join(output, name + ".png"),
    animations: "disabled",
    caret: "hide",
  });
  console.log("Captured " + name);
}

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

  const home = await newAppPage();
  await save(home, "01-home");

  const workout = await newAppPage();
  await workout.getByRole("tab", { name: "Train" }).click();
  await workout.getByText("Every set counts.").waitFor();
  await save(workout, "02-workout");

  const nutrition = await newAppPage();
  await nutrition.getByText("Fuel your training").click();
  await nutrition.getByText("Make room for recovery.").waitFor();
  await save(nutrition, "03-nutrition");

  const rank = await newAppPage();
  await rank.getByLabel("Squat discipline").click();
  await rank.getByText("DRAFT — NOT OFFICIAL. No approved thresholds are available for this discipline. No official MONTE Climb Scale percentage is shown.").waitFor();
  await rank.getByText("Assessment pending", { exact: true }).waitFor();
  await save(rank, "04-rank");

  if (pageErrors.length) throw new Error("App preview browser errors: " + pageErrors.join(" | "));
  await writeFile(path.join(output, "README.txt"),
    "MONTE WO actual app screen captures\n" +
    "Rendered from the Expo / React Native app web export (React Native Web), not a native Android device capture.\n" +
    "Viewport: 390 × 844 CSS pixels; device scale factor: 2; reduced motion enabled.\n" +
    "No signed-in account or athlete records were used. API bindings are local and empty; sound and haptics are off.\n" +
    "Rank screen intentionally shows Assessment pending because approved thresholds are not present.\n" +
    "Screens: 01-home.png, 02-workout.png, 03-nutrition.png, 04-rank.png.\n");
  console.log("All four actual app screens captured.");
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
