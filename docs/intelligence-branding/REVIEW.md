# Intelligence branding — preview review

Status: approved by owner and published. Production revision: 64d1798309f9c5e48ac35bea44de61874fa07364. Immutable deployment: https://128b6eb3.vitaflex.pages.dev/.

## Changes
- Corporate portfolio now lists MONTE WO, Bible Verse Memory App, and VitaFlex Intelligence. Bible Verse Memory App is marked Under Development and links to its existing book chapter experience; no app capabilities or launch dates have been invented.
- Original VF image and original corporate logo assets remain byte-identical. Intelligence adds only a separate thin champagne-gold orbit. The existing VITAFLEX lettering is retained.
- Intelligence headings, title, footer, social metadata, and book chapter use VitaFlex Intelligence. Original approved biography prose is unchanged.
- Added transparent monogram favicon and Intelligence social image, derived from the original VF pixels. Corporate assets remain untouched.
- Retained the Training detail route for compatibility. No new routes, altered sitemap, or removed customer functionality.

## Preview
- Homepage: https://8098-ilc7jicwbqw89vdofbvb6.e2b.app/
- Intelligence: https://8098-ilc7jicwbqw89vdofbvb6.e2b.app/ventures/vitaflex-intelligence-corp/

## Checks
- 55 targeted unit tests pass.
- Announcement browser checks pass across six layouts, including no-JavaScript, reduced motion, immediate equation readability, convergence, and navigation.
- Group browser checks pass across seven widths and existing routes.
- Corporate restoration checks pass across eight widths and three venture journeys.
- Local HTTP audit: 55 URLs pass.
- Full suite: 265/267 pass; two existing wrangler checksum failures remain in lab.test.js and website.test.js. Infrastructure pins were not weakened.
- Preservation evidence confirms only four existing public files changed; original corporate logo, hero assets, stylesheet, routes, and sitemap remain unchanged.

Evidence is in evidence/; responsive captures are in screenshots/. Light and dark monogram proofs are monogram-light.png and monogram-dark.png.

## Production publication

Owner approved this revision. Workflow https://github.com/vitaflexl4-ai/monte-wo/actions/runs/43078555195 published to the existing vitaflex project after checking baseline 08dc85cb2aedefc338a7e2eb39a35ff468a1a429 and hosted-preview regressions.

Live links: https://vitaflex.pages.dev/ and https://vitaflex.pages.dev/ventures/vitaflex-intelligence-corp/.

Production project validation, all 55 sitemap URLs, book, Sony profile, Intelligence announcement, and production desktop/mobile navigation passed. Overall workflow remains failed because custom-domain probes receive Cloudflare HTTP 403 challenges and the historical reference preview has four ventures rather than the current expected three. Production itself passes the restored desktop/mobile route checks. Protected API check returned 401 in the production project verification; the subsequent combined public-domain/API step was skipped. No DNS/security changes or challenge bypass was attempted.

GitHub annotations and step outcomes are saved in evidence/production-annotations.json and evidence/production-run.json. Full log/artifact download was blocked by this sandbox's outbound host restrictions; GitHub API annotations were available and confirm publication and checks.
