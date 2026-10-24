// Browser test for the private Intelligence Command Center.
// Prerequisites: the local preview must be running with a migrated, seeded INTEL_DB:
//   npx wrangler pages dev public --d1 INTEL_DB --binding LOCAL_DEVELOPMENT=true \
//     --binding SITE_URL=http://localhost:8080 --binding INTELLIGENCE_INGEST_KEY=local-preview-key --ip 0.0.0.0 --port 8080
//   (apply migrations/0003 + 0004 to the local D1, then seed via the API — see docs)
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:8080/intelligence/', { waitUntil: 'networkidle' });
assert.equal(await page.title(), 'MONTE WO · Intelligence Command Center');
// Overview renders with live backend data (no fabrication, real API values)
await page.waitForSelector('.kpi', { timeout: 15000 });
assert.ok((await page.locator('.kpi').count()) >= 4);
assert.match(await page.locator('#system-status').textContent(), /LIVE/);
assert.ok((await page.locator('.agent-card').count()) === 3);
assert.ok((await page.locator('#view .tl-item').count()) > 0, 'timeline items present');
// Views navigate
for (const [hash, probe] of [
  ['#/incidents', '.incident-table tbody tr'],
  ['#/agents', '.target-row'],
  ['#/analysis', '.panel'],
  ['#/briefings', '.brief-item, .empty'],
  ['#/automation', '.rule-card'],
  ['#/audit', '.incident-table tbody tr']
]) {
  await page.goto('http://localhost:8080/intelligence/' + hash);
  await page.waitForSelector(probe, { timeout: 15000 });
}
// Incidents drawer opens with evidence and audit controls
await page.goto('http://localhost:8080/intelligence/#/incidents');
await page.waitForSelector('.incident-table tbody tr');
await page.locator('.incident-table tbody tr').first().click();
await page.waitForSelector('#drawer:not([hidden])');
assert.ok((await page.locator('#drawer .evidence-block').textContent()).length > 10);
assert.ok(await page.locator('#drawer textarea').count() === 1);
await page.keyboard.press('Escape');
assert.ok(await page.locator('#drawer').isHidden());
// Briefings render with recommendations when a daily briefing exists
await page.goto('http://localhost:8080/intelligence/#/briefings');
const hasBriefing = await page.locator('.brief-item').count();
if (hasBriefing) {
  await page.locator('.brief-item').first().click();
  await page.waitForSelector('.brief-body', { timeout: 15000 });
  assert.match(await page.locator('.brief-body').textContent(), /AU/);
}
// Automation rules render with governance states
await page.goto('http://localhost:8080/intelligence/#/automation');
await page.waitForSelector('.rule-card');
assert.equal(await page.locator('.rule-card').count(), 3);
assert.ok((await page.locator('.rule-card .status-pill').allTextContents()).includes('DISABLED'));
// Responsive layouts do not overflow
for (const width of [1500, 1120, 900, 640, 390]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://localhost:8080/intelligence/#/overview');
  await page.waitForSelector('.kpi', { timeout: 15000 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
}
// Security headers on the private page
const response = await page.request.get('http://localhost:8080/intelligence/');
assert.match(response.headers()['x-robots-tag'] || '', /noindex/);
assert.match(response.headers()['content-security-policy'] || '', /default-src 'self'/);
// API requires authentication on non-localhost origins (server-side, not just UI)
const denied = await page.request.get('https://monte.invalid/api/intelligence/overview');
assert.equal(denied.status(), 401);
// No client errors anywhere
assert.deepEqual(errors, []);
console.log('PASS: intelligence dashboard — overview KPIs, 7 views, incident drawer with evidence, briefings, automation governance, 5 responsive layouts, security headers, no JS errors.');
await browser.close();
