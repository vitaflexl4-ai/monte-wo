# Website Step 2 — repository audit and scope decisions

**October 12, 2026 · MONTE WO · VitaFlex Business Group**

This audit uses the repository delivered after the Free Strength Lab work. Earlier phase labels are historical; the user's current request is **Website Step 2 only**. No application or ranking-backend development is authorized here.

## Actual architecture

- Vanilla HTML/CSS/ES modules with Python static-page generators.
- Cloudflare Pages output directory: `public`; existing `wrangler.toml`, Functions routing, project name and deploy command retained.
- Five working Strength Lab calculators, six older calculator routes, a 14-guide/7-group exercise library, company/legal pages, waitlist UI/API and optional D1/Turnstile configuration.
- Existing draft Strength Index public pages and restricted technical pilot code from an earlier task. The new prompt does not mean that code never existed; it is preserved without expansion or activation.
- No production origin or deployed Cloudflare resources verified in this phase. The default development configuration has no live waitlist binding/site key/secrets and truthfully reports signup unavailable.

## Findings that took priority

| Actual finding | Website-only response |
|---|---|
| The homepage still showed illustrative `468`, `+42`, 90/120 kg PRs, 24 workouts, 12-day streaks, named leaderboard rows and podium positions—even though ranks were already disabled. | Removed this pretend athlete/result data. Kept the approved phone composition as an explicitly static concept with four unranked discipline slots and no numerical progress. Removed obsolete data from the new homepage source template too. |
| The supplied MONTE WO app screenshot (`Screenshot 2026-10-11 at 22.03.28.png`) contains retired aggregate-score/rank placeholders. | Used its layered-phone composition and dark technical style as a reference. Did not publish the obsolete screenshot as a current or functional app screen. Supplied logos and rank emblems remain unchanged. |
| Homepage navigation pointed Free Tools to `/strength-lab/`; other headers pointed to `/tools/`, and Lab headers used a different label. | Standardized Free Tools → `/tools/` across all pages. Preserved `/strength-lab/` and every existing calculator URL. A shared mobile navigation implementation now includes the waitlist link, Escape/outside/focus dismissal and predictable focus. |
| Older tools directory primarily highlighted six older calculators; the five newer strength tools were reached through a secondary promotion. | Made the five working strength tools the primary directory. Kept four already-working nutrition/body-composition tools available and the two original strength URLs accessible. Further nutrition work is labelled planned; no new calculator built here. |
| The public Strength Index prominently offered a technical pilot connection. | Kept its implementation and routes, but placed the pre-existing pilot behind a closed, clearly labelled disclosure. Added plain-language qualifying-performance philosophy before the four discipline cards. |
| General movement guides could be confused with the exact launch ranking variations. Romanian deadlift and dumbbell curl are not the proposed conventional-deadlift/wall-strict-curl standards. | Added `/exercises/standards/`, reading existing draft rulebook checks rather than inventing rules. Explicit variation differences, equipment context, incomplete judging/demo status and links to the draft source. |
| Waitlist already had validation, consent, deduplication, honest unavailable/error/success states and a real local-D1 test path. | Preserved that workflow and its server code. Added a no-JavaScript fallback. Verified local D1 and failure states, without claiming a production destination is connected. |
| Page metadata/social previews were inconsistent; no confirmed production origin was available. | Added shared per-page sharing metadata and a branded social image. Canonicals and sitemap are generated only when a confirmed HTTPS `SITE_ORIGIN` is supplied. No domain invented. |
| A simple 404 page already existed. | Refreshed it with shared branding/navigation and verified an actual unknown route returns 404. This was an improvement, not a newly discovered absence. |
| The homepage FAQ overstated language coverage across the whole website. | Corrected all three homepage versions: homepage supports English/Kreyòl/French; other sections remain English-first. New public-section copy is catalog-based for later translation without changing calculations. |
| Existing toolchain reported six npm advisories. | Reported the remaining advisories. No unreviewed dependency upgrade was hidden inside this website task. |

## Preservation boundary

`docs/website/baseline.json` captures pre-change hashes. Automated checks confirm unchanged backend/Functions files, standards/models, migrations, Wrangler configuration, lockfile, original public brand assets, ranking/scoring data, and all calculator business logic.

No new account workflow, workout dashboard, mobile app, backend ranking endpoint, scoring threshold, rank award or publication was added. Existing restricted-pilot browser fixtures remain tests only, not website data.
