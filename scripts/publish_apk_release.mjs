// One-command publisher: finds or downloads the built Android .apk, hashes it, uploads it to
// GitHub Releases on vitaflexl4-ai/monte-wo (avoiding Cloudflare Pages' 25 MiB static file cap),
// updates content/mobile-release.json, rebuilds public/, runs tests, and deploys to Cloudflare Pages.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawArg = process.argv[2];
const tag = process.argv[3] || "v2.0.0";
const version = tag.replace(/^v/, "");
const assetName = `monte-wo-${tag}-android.apk`;
const tempDir = fs.mkdtempSync(path.join(root, ".apk-stage-"));
const stagedApk = path.join(tempDir, assetName);

function findNewestDownloadedApk() {
  const downloadsDir = path.join(os.homedir(), "Downloads");
  if (!fs.existsSync(downloadsDir)) return null;
  const candidates = fs
    .readdirSync(downloadsDir)
    .filter((f) => f.toLowerCase().endsWith(".apk"))
    .map((f) => {
      const full = path.join(downloadsDir, f);
      const stat = fs.statSync(full);
      return { full, name: f, mtimeMs: stat.mtimeMs, size: stat.size };
    })
    .filter((c) => c.size > 1_000_000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.full || null;
}

try {
  if (rawArg && /^https:\/\/(expo\.dev|.*amazonaws\.com|github\.com)\//i.test(rawArg)) {
    console.log(`Downloading APK from ${rawArg}...`);
    execFileSync("curl", ["-fL", rawArg, "-o", stagedApk], {
      cwd: root,
      stdio: "inherit",
    });
  } else {
    let apkPath =
      rawArg && !rawArg.includes("YOUR-DOWNLOADED-BUILD")
        ? path.resolve(rawArg)
        : findNewestDownloadedApk();

    if (!apkPath || !fs.existsSync(apkPath)) {
      console.error(
        "\n❌ No .apk file found yet!\n" +
          "1. First build your APK:  npm run build:apk\n" +
          "2. Download the finished .apk from the Expo link into ~/Downloads/\n" +
          "3. Then run:              npm run publish:apk\n",
      );
      process.exit(1);
    }
    console.log(`Using local APK: ${apkPath}`);
    fs.copyFileSync(apkPath, stagedApk);
  }

  const stat = fs.statSync(stagedApk);
  if (stat.size < 1_000_000) {
    console.error("Error: File looks too small to be a valid Android APK:", stat.size);
    process.exit(1);
  }

  const header = Buffer.alloc(4);
  const fd = fs.openSync(stagedApk, "r");
  fs.readSync(fd, header, 0, 4, 0);
  fs.closeSync(fd);
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    console.error("Error: File does not have ZIP/APK magic header (PK).");
    process.exit(1);
  }

  const sha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(stagedApk))
    .digest("hex");

  console.log(`APK verified locally: ${assetName}`);
  console.log(`  Size:   ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
  console.log(`  SHA256: ${sha256}`);

  const repo = "vitaflexl4-ai/monte-wo";
  let releaseExists = false;
  try {
    execFileSync("gh", ["release", "view", tag, "--repo", repo], {
      cwd: root,
      stdio: "ignore",
    });
    releaseExists = true;
  } catch {
    releaseExists = false;
  }

  if (releaseExists) {
    console.log(`Uploading ${assetName} to existing GitHub Release ${tag}...`);
    execFileSync(
      "gh",
      ["release", "upload", tag, stagedApk, "--clobber", "--repo", repo],
      { cwd: root, stdio: "inherit" },
    );
  } else {
    console.log(`Creating GitHub Release ${tag} and uploading ${assetName}...`);
    execFileSync(
      "gh",
      [
        "release",
        "create",
        tag,
        stagedApk,
        "--repo",
        repo,
        "--title",
        `MONTE WO ${tag} — Android APK`,
        "--notes",
        `Direct Android APK for MONTE WO ${tag} (5-Tab Obsidian App, Haitian Rank Hall of Pride, AI Muscle Definition Camera & 9:16 Story Exporter, World Foods 3,000 kcal Macro Scanner).\n\n- **SHA-256:** \`${sha256}\`\n- **Bytes:** ${stat.size}`,
      ],
      { cwd: root, stdio: "inherit" },
    );
  }

  const apkUrl = `https://github.com/${repo}/releases/download/${tag}/${assetName}`;
  const releaseFile = path.join(root, "content/mobile-release.json");
  const manifest = JSON.parse(fs.readFileSync(releaseFile, "utf8"));
  manifest.sourceVersion = version;
  manifest.android = {
    ...manifest.android,
    status: "apk-available",
    apkUrl,
    version,
    releasedAt: new Date().toISOString().slice(0, 10),
    bytes: stat.size,
    sha256,
    minSdk: "8.0+ (API 26+)",
  };
  fs.writeFileSync(releaseFile, JSON.stringify(manifest, null, 2) + "\n");
  console.log("Updated content/mobile-release.json ->", apkUrl);

  const cleanEnv = { ...process.env };
  delete cleanEnv.SITE_ORIGIN;
  execFileSync("npm", ["run", "build"], { cwd: root, env: cleanEnv, stdio: "inherit" });
  execFileSync("npm", ["test"], { cwd: root, env: cleanEnv, stdio: "inherit" });
  execFileSync(
    "npx",
    [
      "wrangler",
      "pages",
      "deploy",
      "public",
      "--project-name",
      "vitaflex-monte-wo",
      "--branch",
      "main",
      "--commit-dirty=true",
    ],
    { cwd: root, stdio: "inherit" },
  );

  console.log("\n✅ MONTE WO Android APK is now live at:");
  console.log("   Direct APK:", apkUrl);
  console.log("   Downloads page: https://vitaflex-monte-wo.pages.dev/downloads/");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
