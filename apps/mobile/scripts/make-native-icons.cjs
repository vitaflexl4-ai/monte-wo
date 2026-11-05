#!/usr/bin/env node
// Derives the native launcher artwork from the approved MONTE WO brand icon (assets/brand-icon.png,
// 512x512, background #090C13). Nothing is redrawn: the emblem is only re-padded so that it sits
// inside the Android adaptive-icon safe zone (central 66% of the canvas), which circular launcher
// masks would otherwise clip. Output: assets/native/adaptive-icon-foreground.png (1024x1024).
//
//   node scripts/make-native-icons.cjs           # (re)generate
//   node scripts/make-native-icons.cjs --check   # exit 1 when the committed file is stale
const fs = require("node:fs");
const path = require("node:path");
const Jimp = require("jimp-compact");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "assets", "brand-icon.png");
const OUTPUT = path.join(ROOT, "assets", "native", "adaptive-icon-foreground.png");
const BACKGROUND = 0x090c13ff; // identical to the brand icon background
const CANVAS = 1024;
const EMBLEM_WIDTH_RATIO = 0.58; // emblem width / canvas, keeps it inside the 66% safe zone

async function render() {
  const source = await Jimp.read(SOURCE);
  if (source.bitmap.width !== 512 || source.bitmap.height !== 512) {
    throw new Error(`expected assets/brand-icon.png to be 512x512, got ${source.bitmap.width}x${source.bitmap.height}`);
  }
  // Measured emblem bounding box inside the 512px source (x 75..436) -> 362px wide.
  const emblemWidthInSource = 362;
  const scale = (CANVAS * EMBLEM_WIDTH_RATIO) / emblemWidthInSource;
  const scaledSize = Math.round(512 * scale);
  const scaled = source.clone().resize(scaledSize, scaledSize, Jimp.RESIZE_BICUBIC);
  const canvas = new Jimp(CANVAS, CANVAS, BACKGROUND);
  const offset = Math.round((CANVAS - scaledSize) / 2);
  canvas.composite(scaled, offset, offset);
  canvas.deflateLevel(9);
  return canvas.getBufferAsync(Jimp.MIME_PNG);
}

(async () => {
  const check = process.argv.includes("--check");
  const buffer = await render();
  if (check) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT) : null;
    if (!current || !current.equals(buffer)) {
      console.error(`::error title=Native icon out of date::${path.relative(ROOT, OUTPUT)} differs from the output of scripts/make-native-icons.cjs — run "node scripts/make-native-icons.cjs" in apps/mobile and commit.`);
      process.exit(1);
    }
    console.log(`OK ${path.relative(ROOT, OUTPUT)} is up to date (${buffer.length} bytes)`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`wrote ${path.relative(ROOT, OUTPUT)} (${CANVAS}x${CANVAS}, ${buffer.length} bytes)`);
})().catch((error) => {
  console.error(`::error title=make-native-icons failed::${error.message}`);
  process.exit(1);
});
