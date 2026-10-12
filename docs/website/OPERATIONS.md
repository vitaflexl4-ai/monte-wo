# MONTE WO public website — build, preview and release

## Local preview

```sh
cd monte-wo
npm ci
npm run build
npm test
npm run dev
```

Open the preview at `/`. The existing Pages development command binds `0.0.0.0:8080`; on your own computer use `http://localhost:8080/`.

- `/tools/`: unified Free Tools directory.
- `/strength-lab/`: preserved five-tool collection.
- `/strength/`: public draft philosophy and four independent disciplines.
- `/app/`: static future-app concept, not a working dashboard.
- `/exercises/`: existing written library.
- `/exercises/standards/`: four proposed launch variations and draft checks.
- `/waitlist/`: existing workflow, unavailable until its destination/security configuration is actually ready.

Use the **full `npm run build`**. `scripts/build_website.py` is the final public-page normalization step, after the existing generators. Earlier generators import shared page generation and can rewrite page families; do not deploy intermediate generator output. The complete build was tested for byte-for-byte reproducibility.

## Browser verification

```sh
npx playwright install --with-deps chromium
npm run test:website
npm run test:browser
npm run test:lab-browser
npm run test:phase2
npm run test:library
npm run test:ranks
npm run test:strength-browser
node tests/strength-ui.mjs
```

The last command exercises the pre-existing restricted UI with **synthetic fixtures**, not live athlete identities or official ranking standards.

For the real **local-only** waitlist regression:

```sh
npm run db:local
npm run dev:waitlist  # separate process on 8081; LOCAL_DEVELOPMENT is local testing only
npm run test:phase1
```

No new migrations were introduced. The existing local database reported no pending migrations during this phase. Never enable the local-development security bypass in production.

## Portable interactive review

```sh
npm run export:website
node tests/portable.mjs --website
```

Outputs in the parent folder:

- `Monte-Wo-Website-Step-2.html`
- `Monte-Wo-Website-Step-2-Cloudflare.zip`

The portable HTML embeds styles, fonts, images and scripts. Shared image data is deduplicated to reduce the review file's size. Navigation, calculators and written guides work in the sandbox. Signup and private services are intentionally unavailable; it is not a production website or an account system. Clipboard fallback is provided when the sandbox denies permission.

## Production origin and metadata

A confirmed public origin has **not** been supplied or verified. Set `SITE_ORIGIN` in the build environment to the actual HTTPS origin, or set `publicOrigin` in `content/website/site.json`. Use an origin only: no credentials, path, query, fragment or port.

With a valid origin the build generates:

- absolute canonical and `og:url` URLs;
- absolute social-image URLs;
- `public/sitemap.xml`, containing 48 public routes in this release;
- a sitemap reference in `robots.txt`.

Without an origin, no canonical or sitemap is fabricated. The social image is bundled and relative references work locally, but reliable production sharing-card resolution remains a release task. Private administration is `noindex, nofollow` and excluded from the sitemap. Robots rules are not authorization controls.

The reserved origin `https://website-metadata.test` was used **only for an automated local metadata test**, then removed by rebuilding with the real default configuration. It is not a deployment URL and must not be copied into production.

## Waitlist release blocker

The repository's default preview has no configured live destination. Existing server code requires:

1. The operator's actual D1 `DB` binding and existing waitlist schema.
2. `TURNSTILE_SITE_KEY` as a public variable.
3. `TURNSTILE_SECRET` and `RATE_LIMIT_SALT` as encrypted secrets.
4. Correct host/origin settings and an actual production end-to-end test.

See the existing waitlist implementation/documentation for setup. Do not create a second database just for this website phase or copy local test bindings into production. Do not expose secrets in files, client scripts or screenshots.

When unavailable, the button stays disabled and the site says nothing has been collected. The contact email is a support fallback, not an automatic subscription. Even on success the workflow creates only a waitlist record, not an athlete account. This website does not send an automatic confirmation email.

No production database, challenge provider, submission or existing deployment was verified in this phase. A successful local-D1 test is not production verification.

## Deployment using the unchanged workflow

After review, origin configuration, appropriate waitlist setup and Cloudflare authentication:

```sh
npm ci
npm run build
npm test
npm run deploy
```

Ensure `SITE_ORIGIN` is set before the build. The existing deploy script targets Pages project **`vitaflex-monte-wo`**, branch **`main`**, output **`public`**. Verify that this is the intended project/account before executing it.

After deployment, verify the returned URL, production metadata, all primary routes, mobile navigation, 404 behavior, service-worker update, and the actual waitlist destination. Only then describe deployment or signup as live.

**Deployment was not executed during Website Step 2.** Ranking publication, account enrollment and the native app remain outside this release. Do not enable publishing or treat website completion as approval of rank standards.

## Localization and maintenance

- `content/website/en.json`: new public-section copy.
- `content/website/home-messages.json`: English, Haitian Creole and French homepage overlays; consistent keys.
- `content/website/site.json`: shared navigation, operator information and localized menu controls.
- `content/website/home.html`: preserved homepage template with generator slots replacing obsolete mock data.
- `public/website-copy.js`: generated copy; do not edit directly.
- `public/translations.js`: retains the previous homepage catalog and imports the new overlay.
- Existing Lab localization structure remains in `content/lab/`.

Other pages are intentionally English-first. A future language-routing decision, translated legal/cautionary text and fluent review are still required. Do not duplicate calculator or ranking logic for translations.

## Remaining review work

- npm reports six existing development-toolchain advisories (one low, five high); upgrades were not part of this task.
- Browser checks used Chromium responsive emulation, not physical-device coverage or a formal WCAG/security certification.
- Approved exercise demonstration media is still absent; the library does not pretend symbols are demonstrations.
- Original clipped rank artwork remains unchanged; replacements require approved supplied assets.
