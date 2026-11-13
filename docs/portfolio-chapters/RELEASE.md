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

Deployment: requested immediately by owner, using the existing guarded production workflow. Publication results will be recorded after verification. Existing custom-domain Cloudflare challenges are not bypassed.
