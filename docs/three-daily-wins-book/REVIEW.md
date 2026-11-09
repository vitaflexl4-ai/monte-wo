# The Three Daily Wins — animated book review

**New revision: local preview only. No push or production deployment.** This replaces the previously published interactive design in the working build, not retroactively on the live site. The prior production release remains untouched until this new design is reviewed.

## Open the deliverable

- **Three Daily Wins — animated book** live preview, port **8099**: opens directly on the book. No click, swipe or typing is required. Watch for approximately 30 seconds; the final page then stays still. Reload is the browser-native way to watch again, not an on-page control.
- **Three Daily Wins — cinematic book preview**, port **8098**: standard public-site preview; the original corporate root remains unchanged. Path: `/sony/three-daily-wins/`. Natural journey: corporate footer → Meet Sony Alexis → the single book door below the original biography.
- **Three Daily Wins — desktop & mobile screenshots**, port **8100**: actual local Chromium capture gallery, also saved in this directory’s `index.html`.
- [Revised design brief](BRIEF.md): concept, exact sequence, materials, choreography, exclusions and accessibility alternatives.

The port-8099 root redirect is a **local preview utility only**, in `scripts/preview-book.py`; it is not a production root redirect or a change to the corporate homepage.

## What changed

A charcoal hardcover with champagne lettering and fine recessed rules opens into a warm ivory book. Three actual articulated page meshes rotate around the spine; four nested fold segments bend each moving leaf. Lighting, grain, page-edge layers, gutter, inside cover, reverse faces and contact shadows provide the material depth. Continuous unsegmented page faces replace the moving mesh at rest to avoid ink seams.

The cover, **Chapter I: SPIRITUAL**, **Chapter II: PHYSICAL**, **Chapter III: INTELLECTUAL**, and **THREE WINS. ONE DAY. A BETTER YOU.** advance in that order automatically. No looping. No progress indicators or interface panels. No media autoplay permissions, audio, video, external fonts, animation framework or generated imagery are required. The book’s HTML/CSS/JS total approximately **33.4 KB uncompressed**, excluding the existing favicon and HTTP headers. That is a source-size observation, not a Lighthouse or field-performance score.

Mobile is deliberately a close right-page composition, not an illegible miniature spread. Desktop shows the entire open book. The other two personal experiences are retired in this build: their public HTML is removed, navigation has one door, and the sitemap contains the original 55 URLs plus only the book, **56 total**. Local retired route checks return HTTP 404. The private `blog-cms/` directory is untouched and excluded.

## Real screenshots

| Moment | Desktop | Mobile |
|---|---|---|
| Hardcover | [1440 px](screenshots/1440-cover.png) | [390 px](screenshots/390-cover.png) |
| Spiritual | [1440 px](screenshots/1440-spiritual.png) | [390 px](screenshots/390-spiritual.png) |
| Page folding | [1440 px](screenshots/1440-turn.png) | [390 px](screenshots/390-turn.png) |
| Physical | [1440 px](screenshots/1440-physical.png) | [390 px](screenshots/390-physical.png) |
| Intellectual | [1440 px](screenshots/1440-intellectual.png) | [390 px](screenshots/390-intellectual.png) |
| Final page | [1440 px](screenshots/1440-final.png) | [390 px](screenshots/390-final.png) |

Also included: [short landscape](screenshots/844-landscape.png) and [reduced-motion reading edition](screenshots/390-reduced-motion.png). Screenshots are real rendered DOM/CSS geometry. The browser clock was advanced deterministically for reproducible capture timing; no visual mockup, synthetic photograph or composite was substituted for the app.

## Executed validation

- Build: PASS. **40/40 targeted tests PASS**, including unchanged approved corporate hashes, original biography preservation after stripping only the authorized door/style, and the exact one-route manifest addition.
- Complete book browser test: PASS at **320, 390, 600, 768, 1024, 1440 and 1920 px**. Cover/opening, three articulated turns, chapter order, final rest after an additional simulated minute, no horizontal overflow, zero controls and no local storage checked at every width.
- Reduced-motion and JavaScript-disabled complete reading editions: PASS. Live switch to reduced motion, simulated hidden-tab pause/resume without skipping, and 844 × 390 landscape: PASS.
- Corporate/group/original-biography browser regressions: PASS; original essay remains verbatim; four original ventures and single bottom Sony link preserved.
- Local HTTP/metadata audit: **56/56 PASS**; robots/sitemap HTTP 200. Retired personal routes: HTTP 404 in the local preview. No production endpoint is claimed verified for this new revision.
- axe-core 4.14.0, WCAG 2 A/AA + 2.1 AA automated rules: **zero detected violations** at 390 and 1440 px with both default and reduced motion. Initial local unthrottled CLS smoke observation: 0 in those four cases. Not real-device, Safari, throttled network, complete 30-second performance profiling, manual screen-reader certification or full WCAG compliance evidence. Per the requested brief there is intentionally no on-page autoplay pause/replay control; an OS reduced-motion preference provides the still edition.
- Full suite: **250/252 PASS**. The two unchanged historical `wrangler.toml` checksum-expectation failures remain in `tests/lab.test.js:28` and `tests/website.test.js:7`; neither infrastructure nor legacy fixture pins were edited to hide them.

## Preservation and release boundary

The approved corporate homepage, all four venture pages, corporate CSS, source biography and infrastructure are byte-identical to the pre-task source. Original immutable fixtures were not refreshed. No product/customer logic, private CMS, authentication, D1/R2 resources, DNS or security configuration was changed.

The old dashboard runtime is removed. The new book never reads, writes or transmits completion data, and does not access old browser-local progress. Existing optional response forms, Scripture practice, blog filters and article progress are not part of this book.

A future publication must first receive review approval for this new design, inspect the current production revision and update the fail-closed deployment precondition accordingly. The prepared CI/publisher checks now test the passive book rather than the superseded three-app implementation. None was triggered by a push in this revision. The earlier custom-domain challenge is not presumed resolved.
