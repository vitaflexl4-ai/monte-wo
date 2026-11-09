# Review and deployment instructions

## Current status

This Sony profile revision is **local only**. No push or production deployment was performed. Review `/sony/` in the running port-8098 preview and the desktop/mobile gallery before approving a release.

Architecture is unchanged: Python static builders → `public/` → the existing Cloudflare Pages **vitaflex** project. Existing functions/bindings remain separate and unchanged. The fixed Git branch is `arena/beb13e2a-monte-wo`; do not switch to or push Git `main`.

## Local build and verification

```sh
npm ci
npm run build
node --test tests/seo.test.js tests/founder.test.js tests/group.test.js tests/master-execution.test.js tests/business.test.js tests/approved-restoration.test.js tests/sony-experiences.test.js tests/sony-profile.test.js
```

Serve `public/` on `0.0.0.0:8098`, not the repository root. Open `/sony/`. Install Playwright Chromium/dependencies in the testing environment if absent, then run:

```sh
TEST_ORIGIN=http://localhost:8098 node tests/sony-profile-browser.mjs
TEST_ORIGIN=http://localhost:8098 node tests/group-browser.mjs
TEST_ORIGIN=http://localhost:8098 node tests/approved-restoration-browser.mjs
TEST_ORIGIN=http://localhost:8098 node tests/sony-experiences-browser.mjs
VERIFY_ORIGIN=http://localhost:8098 node scripts/audit-public-seo.mjs
```

`localhost` above is for sandbox-side test runners, never browser-facing frontend API calls. No backend is required for the personal profile. The static preview does not verify real authenticated product integrations.

## Replacing a portrait

Edit `content/sony/profile-media.json` to select committed local image assets, alt text, responsive widths/heights and focal position. Keep actual dimensions accurate. Use a 1200 × 630 social image. The hero’s configured focal position is honored on mobile too.

Alternatively, with Pillow installed in an authoring Python environment:

```sh
python3 scripts/prepare_sony_photos.py --hero IMG_8620.jpeg --secondary IMG_7905.jpeg
npm run build
```

Pass real replacement filenames when changing the photographs. This optional tool does not retouch faces, invent imagery or modify the originals. It generates WebP variants, strips metadata, prepares a sharing image and updates the config. Generated assets are committed so the production build does not need Pillow or the original upload folder. Review new cropping and sharing images before publishing.

## Production — only after explicit approval

1. Freshly inspect the existing **vitaflex** Pages project and current canonical production revision through the existing authorized GitHub/Cloudflare connection. Do not assume an older recorded revision is still current.
2. Update `EXPECTED_PRODUCTION_REVISION` in `.github/workflows/deploy-group.yml` to that freshly verified baseline. Its existing precondition is intentionally fail-closed; **do not remove it**. Confirm project/domain ownership and retain a rollback deployment URL/revision.
3. Stage only approved website assets/source/tests/docs. Never stage private `blog-cms/`, credentials or cached browser dependencies.
4. Push only the fixed feature branch after approval. Existing Git-connected preview automation can run on a feature push; do not confuse it with the intended corporate production project.
5. Use the existing **Deploy VitaFlex Business Group** workflow, selecting this branch. Its checked-in publisher explicitly targets **vitaflex**, imports existing configuration, validates the hosted preview before publication, rechecks production has not changed, and compares existing bindings/domains afterward.
6. Review the actual new hosted preview and production evidence: profile desktop/mobile navigation/portraits/biography, all three personal destinations, original corporate bytes and venture journeys, HTTP/metadata audit, and protected API status. The publisher now includes the new profile browser test before production publication.
7. Verify **both** the Pages production URL and `https://vitaflexbusinessgroup.com/sony/` in normal desktop/mobile browsers. A previous preferred-domain Cloudflare challenge must not be presumed resolved by this visual redesign. If challenged, report it separately and investigate only with authorization; do not disable security or bypass the challenge.
8. Confirm actual social-image HTTP responses and refresh social-platform caches if necessary. No indexing/ranking or verified-crawler-access promise follows from local metadata checks.

**Do not use `npm run deploy` for this release**: that generic command targets a different MONTE WO project. Do not provision new Pages projects, modify DNS/security, run migrations, deploy the private CMS, change bindings or publish a separate product release.

The full suite still has two historical infrastructure-checksum expectation failures; the scoped 49-test release set passes. Keep those results explicit rather than weakening infrastructure preservation checks to produce a misleading green result.
