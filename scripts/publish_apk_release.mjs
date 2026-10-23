// One-command publisher: hashes a built Android .apk, uploads it to GitHub Releases on
// vitaflexl4-ai/monte-wo (avoiding Cloudflare Pages' 25 MiB static file cap), updates
// content/mobile-release.json, rebuilds public/, runs tests, and deploys to Cloudflare Pages.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apkArg = process.argv[2];

if (!apkArg) {
  console.error(
    "Usage: npm run publish:apk -- /path/to/monte-wo.apk [versionTag]\nExample: npm run publish:apk -- ~/Downloads/monte-wo.apk v2.0.0",
  );
  process.exit(1);
}

const apkPath = path.resolve(apkArg);
if (!fs.existsSync(apkPath) || !apkPath.toLowerCase().endsWith(".apk")) {
  console.error("Error: Supply a real .apk file path:", apkPath);
  process.exit(1);
}

const stat = fs.statSync(apkPath);
if (stat.size < 1_000_000) {
  console.error("Error: File looks too small to be a valid Android APK:", stat.size);
  process.exit(1);
}

const header = Buffer.alloc(4);
const fd = fs.openSync(apkPath, "r");
fs.readSync(fd, header, 0, 4, 0);
fs.closeSync(fd);
if (header[0] !== 0x50 || header[1] !== 0x4b) {
  console.error("Error: File does not have ZIP/APK magic header (PK).");
  process.exit(1);
}

const tag = process.argv[3] || "v2.0.0";
const version = tag.replace(/^v/, "");
const assetName = `monte-wo-${tag}-android.apk`;
const tempDir = fs.mkdtempSync(path.join(root, ".apk-stage-"));
const stagedApk = path.join(tempDir, assetName);

try {
  fs.copyFileSync(apkPath, stagedApk);
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

  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  execFileSync("npm", ["test"], { cwd: root, stdio: "inherit" });
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
