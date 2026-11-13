# Portfolio chapters and shared venture pages

## Authorized scope
Only the homepage #ventures section and the three listed venture pages were redesigned. Original homepage hero, header, footer, Sony link, corporate logo assets, group.css, product routes, Sony biography/book and Training compatibility page remain byte-identical. The old VitaFlex Training concept is not used in the visible trio.

## Source and build
- content/group/ventures.json: truthful status, category, description and lifecycle stage.
- scripts/portfolio_chapters.py: chapter gallery, all three venture pages from one template, share-image artwork source.
- site/group/: authored scoped CSS, 1.8 KB progressive-enhancement JS, licensed self-hosted Cormorant Garamond, three 1200×630 PNG share images.
- scripts/build_group.py copies source assets and renders outputs. No generated HTML/CSS/JS was hand-edited.
- Optional share preparation: BROWSER_EXECUTABLE_PATH=… node scripts/prepare_portfolio_shares.mjs, then npm run build. Existing Playwright only; no new runtime libraries.

## Experience
01 Monte Wo: Launching soon; Launching lifecycle marker, existing blue/red logo, slow sweep and nine existing rank gems in Haitian Creole (lang=ht), in the requested order. Free-tools availability is distinguished from the unreleased workout platform.

02 Bible Verse Memory App: Under development; Building lifecycle marker, amber memory text/traces. Dedicated /ventures/bible-verse-memory-app/ destination, never the personal Three Daily Wins book.

03 VitaFlex Intelligence: In development; Building lifecycle marker, silver network/veil, original orbit monogram and “To be introduced when it is ready.” Existing announcement prose retained in the shared detail layout; equation remains removed.

All three have explicit named links, descriptions, share images, semantic heading order, focus rings and 48px link heights. Images are lazy-loaded with dimensions. Motion uses CSS and a small IntersectionObserver/pointer/passive-scroll enhancement, desktop-only parallax capped at 10px. Reduced motion disables animations, reveals and pointer/parallax enhancements, including live preference changes. No-JS content stays visible.

## Local checks
- 59/59 targeted tests pass.
- New chapter browser suite: seven widths (320–1920px), homepage and three detail pages, truthful statuses/lifecycle, focus/44px targets, decoded images, no overflow, reduced motion, no-JS, cursor effect, live preference switch, and all three named journeys pass.
- Group routes/layout tests and approved corporate eight-width/journey checks pass.
- Intelligence six-layout/no-JS/reduced-motion/navigation suite passes.
- Sony profile eight-layout regression and passive book seven-width regression pass.
- 56/56 sitemap URLs return HTTP 200 with validated metadata. The single added route is the Bible app.
- Full suite: 269/271 pass. Two existing wrangler checksum failures (Lab/Website protected-source pins) remain; infrastructure pins were not weakened.
- Preservation evidence checks every existing public file. Only six existing public files change: homepage, Monte Wo/Intelligence detail pages, route manifest, sitemap and service-worker route list. Added assets/routes are separate. Historical preservation uses an exact SHA-pinned authorized exception, not a broad ignore.

## Published and independently verified

Production revision: **7c21af18c311f65ece1fc3e9f4ef5a9078c99f0e**.

- Live homepage: https://vitaflex.pages.dev/#ventures
- Monte Wo: https://vitaflex.pages.dev/ventures/monte-wo/
- Bible Verse Memory App: https://vitaflex.pages.dev/ventures/bible-verse-memory-app/
- VitaFlex Intelligence: https://vitaflex.pages.dev/ventures/vitaflex-intelligence-corp/
- Immutable production: https://adf0573a.vitaflex.pages.dev/

Deployment workflow https://github.com/vitaflexl4-ai/monte-wo/actions/runs/43335550720 passed all local gates, exact protected-reference comparison and hosted-preview checks (https://829e825d.vitaflex.pages.dev/), then uploaded production. Its immediate post-upload assertion read the previous canonical revision and failed closed; subsequent diagnostic GET already reported the new production revision. No deployment was repeated to work around that observation.

Independent **read-only** production verification https://github.com/vitaflexl4-ai/monte-wo/actions/runs/43336668330 is fully **SUCCESS**. It confirms the expected revision and existing domains via one API GET, all 56 live sitemap URLs and metadata, seven-width portfolio/all-three-page tests, Intelligence regression, eight-width Sony profile and seven-width book regressions. Public annotations and step results are recorded in evidence/live-verification-*.json. No provisioning, DNS/security changes, migrations, or challenge bypass occurred.

Initial candidate run 43335453913 stopped before publication because its test referenced a Git ancestor absent in shallow checkout. The test was corrected to use immutable content/hash fixtures. The subsequent deployment used that corrected test. Cancellation through gh was denied by integration permissions, so the failed candidate was allowed to finish without publication; the corrected release ran through serialized deployment concurrency.

The custom domain still returned Cloudflare HTTP 403 to automation in deployment diagnostics; the independent live suite verifies the domain-owning pages.dev production origin, not successful custom-domain access. This is not a claim of search indexing or verified crawler traffic.

Full log/artifact downloads use hosts outside this sandbox's network allowlist; public GitHub API annotations provide the retained live publication/check evidence. Screenshots from live verification remain attached to the successful GitHub run.
