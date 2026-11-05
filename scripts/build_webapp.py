#!/usr/bin/env python3
"""Publish the MONTE WO app (apps/mobile, Expo / React Native) as the web app at public/app/web/.

One codebase, three targets: the Android and iOS builds (EAS) and this browser build are the SAME app.
`expo export --platform web` produces a static bundle; this script runs it with the site base path,
fills the service-worker placeholders, verifies the output and copies it into public/app/web/ (served by
Cloudflare Pages like every other file in public/). The result is committed like the other generated
pages, and CI re-exports and diffs it (`--check`) so the committed web app always matches apps/mobile.

Usage:
  python3 scripts/build_webapp.py            # export + publish into public/app/web/
  python3 scripts/build_webapp.py --check    # export to a temp dir and compare with public/app/web/
  python3 scripts/build_webapp.py --output DIR   # export somewhere else (local QA), nothing published

Requires apps/mobile dependencies: `npm --prefix apps/mobile ci` (lockfile). No network is needed for the
export itself (EXPO_OFFLINE=1). EXPO_PUBLIC_* variables of the calling shell are deliberately NOT passed
through, so no origin, key or flag can leak into the committed bundle: on the web the app talks to the
origin it is served from (same-origin /api/mobile/*), exactly like the website modules.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps" / "mobile"
TARGET = ROOT / "public" / "app" / "web"
BASE_URL = "/app/web"
BUNDLE_DIR = Path("_expo/static/js/web")
PLACEHOLDER_BUILD = "__MW_WEBAPP_BUILD__"
PLACEHOLDER_BUNDLES = "__MW_WEBAPP_BUNDLES__"
# Files the export must contain (template + PWA files come from apps/mobile/public/).
REQUIRED = ("index.html", "manifest.webmanifest", "sw.js", "pwa.js")
# Shapes of credentials that must never appear in a published bundle (fail closed).
SECRET_SHAPES = (
    re.compile(r"mwa_[0-9a-f]{16}_[A-Za-z0-9_-]{43}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bsk_(?:live|test)_[0-9A-Za-z]{10,}"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}"),
)


def fail(message: str) -> "NoReturn":  # type: ignore[name-defined]
    print("build_webapp: " + message, file=sys.stderr)
    sys.exit(1)


def export(out: Path) -> None:
    if not (APP / "node_modules" / "expo").exists():
        fail("apps/mobile dependencies are missing — run `npm --prefix apps/mobile ci` first")
    env = {k: v for k, v in os.environ.items() if not k.startswith("EXPO_PUBLIC_")}
    env.update({
        "MONTEWO_WEB_BASE_URL": BASE_URL,
        "CI": "1",
        "EXPO_OFFLINE": "1",
        "EXPO_NO_TELEMETRY": "1",
        "NODE_ENV": "production",
    })
    npx = "npx.cmd" if os.name == "nt" else "npx"
    cmd = [npx, "expo", "export", "--platform", "web", "--output-dir", str(out), "--max-workers", "1"]
    print("build_webapp: " + " ".join(cmd[1:]) + "  (cwd apps/mobile, base " + BASE_URL + ")")
    result = subprocess.run(cmd, cwd=APP, env=env)
    if result.returncode != 0:
        fail("expo export failed with exit code %d" % result.returncode)


def relocate_vendor_assets(out: Path, bundles: list) -> None:
    """Metro exports library images under assets/node_modules/… (e.g. the React Navigation header icons).
    A `node_modules` path segment is ignored by .gitignore and skipped by `wrangler pages deploy`, so those
    files would never reach the site. Move them to assets/vendor/ and point the bundle there (plain string
    URIs; byte-for-byte deterministic)."""
    src = out / "assets" / "node_modules"
    if not src.exists():
        return
    dst = out / "assets" / "vendor"
    if dst.exists():
        fail("assets/vendor already exists in the export; cannot relocate assets/node_modules")
    shutil.move(str(src), str(dst))
    before, after = BASE_URL + "/assets/node_modules/", BASE_URL + "/assets/vendor/"
    for rel in bundles:
        path = out / rel
        text = path.read_text(encoding="utf-8")
        if before in text:
            path.write_text(text.replace(before, after), encoding="utf-8")
    for path in out.rglob("*"):
        if path.is_file() and path.suffix in (".js", ".html", ".css", ".json") and "assets/node_modules/" in path.read_text(encoding="utf-8", errors="replace"):
            fail("a reference to assets/node_modules/ survived in " + path.relative_to(out).as_posix())
    if any(part == "node_modules" for p in out.rglob("*") for part in p.relative_to(out).parts):
        fail("a node_modules path segment survived in the export")


def finish(out: Path) -> dict:
    """Fill the service-worker placeholders, verify the export and return the build description."""
    for name in REQUIRED:
        if not (out / name).is_file():
            fail("export is missing " + name + " (apps/mobile/public/ must contain the template and PWA files)")
    bundles = sorted(p.relative_to(out).as_posix() for p in (out / BUNDLE_DIR).glob("*") if p.suffix in (".js", ".css"))
    if not bundles:
        fail("no web bundle found under " + BUNDLE_DIR.as_posix())
    relocate_vendor_assets(out, bundles)
    html = (out / "index.html").read_text(encoding="utf-8")
    scripts = re.findall(r'<script src="([^"]+)"', html)
    expected = BASE_URL + "/" + bundles[0] if len(bundles) == 1 else None
    if not any(s.startswith(BASE_URL + "/" + BUNDLE_DIR.as_posix() + "/") for s in scripts):
        fail("index.html does not reference the bundle under %s (baseUrl not applied?): %r" % (BASE_URL, scripts))
    if expected and expected not in scripts:
        fail("index.html script %r does not match the exported bundle %r" % (scripts, expected))
    for marker in ("manifest.webmanifest", "pwa.js", 'id="root"'):
        if marker not in html:
            fail("index.html lost the template marker " + marker)
    build = hashlib.sha256("\n".join(bundles).encode()).hexdigest()[:16]
    match = re.search(r"-([0-9a-f]{32})\.js$", bundles[0])
    if match and len(bundles) == 1:
        build = match.group(1)[:16]
    sw = (out / "sw.js").read_text(encoding="utf-8")
    if PLACEHOLDER_BUILD not in sw or PLACEHOLDER_BUNDLES not in sw:
        fail("sw.js template lost its placeholders")
    sw = sw.replace(PLACEHOLDER_BUILD, build).replace(PLACEHOLDER_BUNDLES, json.dumps(bundles))
    (out / "sw.js").write_text(sw, encoding="utf-8")
    for path in sorted(out.rglob("*")):
        if path.is_file() and path.suffix in (".js", ".html", ".json", ".webmanifest", ".css"):
            text = path.read_text(encoding="utf-8", errors="replace")
            for shape in SECRET_SHAPES:
                if shape.search(text):
                    fail("credential-like string in %s (%s) — refusing to publish" % (path.relative_to(out), shape.pattern))
    manifest = json.loads((out / "manifest.webmanifest").read_text(encoding="utf-8"))
    if manifest.get("display") != "standalone" or manifest.get("start_url") != "./" or manifest.get("scope") != "./":
        fail("manifest.webmanifest must stay a standalone app scoped to its own directory")
    app_config = (APP / "app.config.ts").read_text(encoding="utf-8")
    # The marketing version lives in app.config.ts as the fallback of semver(process.env.MONTEWO_APP_VERSION, "x.y.z")
    # (older revisions used a plain `version: "x.y.z"`); the web export never applies the CI env override.
    version = re.search(r'semver\(\s*process\.env\.MONTEWO_APP_VERSION\s*,\s*"(\d+\.\d+\.\d+)"\s*\)', app_config) or re.search(
        r'version:\s*"(\d+\.\d+\.\d+)"', app_config
    )
    if not version:
        fail("could not read the app version from apps/mobile/app.config.ts")
    expo = json.loads((APP / "package.json").read_text(encoding="utf-8")).get("dependencies", {}).get("expo", "")
    info = {
        "app": "MONTE WO",
        "source": "apps/mobile (Expo / React Native; same codebase as the Android and iOS builds)",
        "baseUrl": BASE_URL + "/",
        "appVersion": version.group(1) if version else None,
        "expo": expo,
        "build": build,
        "bundles": bundles,
        "generatedBy": "scripts/build_webapp.py — do not edit; rebuild with `npm run build:webapp`",
    }
    (out / "build-info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return info


def listing(root: Path) -> dict:
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob("*") if p.is_file()}


def publish(out: Path) -> None:
    if TARGET.exists():
        shutil.rmtree(TARGET)
    shutil.copytree(out, TARGET)


def compare(out: Path) -> bool:
    if not TARGET.is_dir():
        print("build_webapp --check: public/app/web/ is missing — run `npm run build:webapp` and commit it", file=sys.stderr)
        return False
    fresh, committed = listing(out), listing(TARGET)
    different = sorted({k for k in set(fresh) | set(committed) if fresh.get(k) != committed.get(k)})
    if different:
        print("build_webapp --check: public/app/web/ does not match a fresh export of apps/mobile:", file=sys.stderr)
        for k in different[:40]:
            state = "only in export" if k not in committed else "only in public/app/web" if k not in fresh else "content differs"
            print("  %s (%s)" % (k, state), file=sys.stderr)
        if len(different) > 40:
            print("  … %d more" % (len(different) - 40), file=sys.stderr)
        print("Run `npm run build:webapp` and commit the regenerated public/app/web/ (never edit it by hand).", file=sys.stderr)
        return False
    print("build_webapp --check: public/app/web/ matches the export (%d files)" % len(committed))
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="export and compare with public/app/web/ without publishing")
    parser.add_argument("--output", help="export into this directory instead of publishing to public/app/web/")
    args = parser.parse_args()
    if args.output:
        out = Path(args.output).resolve()
        if out.exists():
            shutil.rmtree(out)
        export(out)
        info = finish(out)
        print("build_webapp: exported build %s to %s (not published)" % (info["build"], out))
        return
    with tempfile.TemporaryDirectory(prefix="montewo-webapp-") as tmp:
        out = Path(tmp) / "web"
        export(out)
        info = finish(out)
        files = listing(out)
        size = sum((out / k).stat().st_size for k in files)
        print("build_webapp: build %s — %d files, %.1f MB, bundles %s" % (info["build"], len(files), size / 1e6, ", ".join(info["bundles"])))
        if args.check:
            sys.exit(0 if compare(out) else 1)
        publish(out)
        print("build_webapp: published to public/app/web/ — commit it together with the apps/mobile change")


if __name__ == "__main__":
    main()
