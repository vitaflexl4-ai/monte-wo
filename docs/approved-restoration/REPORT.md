# Restore the exact owner-approved VitaFlex corporate website

## Explicit reference — no interpretation

Owner selected **https://2f802a54.vitaflex.pages.dev/**, deployment `2f802a54-bd76-4364-881e-5b276dd93029`, source revision `cdd431502dcf20792ad2c9f5b18dc90c73bcc82c`. This supersedes the rejected conversion homepage. It is the source of truth, regardless of its historical Cloudflare “production” label.

Restores “Beyond the obvious.”, the four-venture centerpiece, all dedicated venture pages, the exact original visual identity/stylesheet/animations, and one **Meet Sony Alexis** link at the bottom footer. No new corporate sections, resources/cards, self-assessment or redesign are introduced.

## Exactness and preservation

- Fixture `tests/fixtures/approved-corporate-reference.json` pins 13 approved files: homepage, all four venture pages, group CSS, fonts, official logos/favicon, route manifest and original 55-URL sitemap.
- Build output matches every pin byte-for-byte. CI additionally fetches the actual approved immutable URL and compares every file to local bytes **before** any publication; source/deployment mismatch fails closed.
- Current Sony page is retained byte-for-byte, including its approved visible biography and later safe SEO changes: current title, no independently unverified credential graph, owner-confirmed alias in SEO only. No Sony rollback to older credential assertions.
- All **228** original protected non-Sony public files now match the unchanged historical snapshot, including homepage/manifests, all product pages/assets, contact and privacy. The former homepage/manifests exceptions have been removed from preservation tests.
- Rejected prototype source/assets and unlinked `/business-contact/` file are preserved as existing work, not loaded/linked on the restored corporate site or advertised in its sitemap. Their historical reports remain intact. The superseded browser test source is archived; its former entry point now runs the restoration checks.
- No separate MONTE WO deployment, Worker, DNS, security setting, binding, database, paid resource or private CMS provisioning is involved. Existing corporate project publisher only; customer/product bytes unchanged.

## Executed validation before publication

- `npm run build`: PASS; exact approved fixture and all original public preservation checks pass.
- Targeted group/Sony/SEO/preservation/legacy-source/restoration tests: **34/34 PASS**.
- Full `npm test`: **244/246 PASS**; only the two previously documented unchanged-`wrangler.toml` checksum expectations fail (`tests/lab.test.js:28`, `tests/website.test.js:7`). Neither infrastructure nor pins changed to conceal them.
- Restoration browser: PASS at 320/390/600/768/820/1024/1440/1920 widths; all four venture page → home journeys, one bottom Sony link → separate biography, no rejected self-assessment, no page errors.
- Existing group browser: PASS across all corporate/product routes, decoded assets, responsive geometry, real links and keyboard navigation.
- Existing Sony browser: PASS across eight layouts, verbatim essay, no clipping, chapter navigation, focus, no-JS, reduced motion and no failed assets/errors.
- Local public HTTP/metadata audit: **55/55 PASS**, canonical URLs unique; original approved sitemap restored. Screenshot evidence is local browser output, not yet a live-domain acceptance claim.

## Release safety and pending live verification

Target is existing corporate Pages project `vitaflex`, owning apex/www and `vitaflex.pages.dev`; fixed Git source branch `arena/beb13e2a-monte-wo`. No main checkout/push/merge. Publisher production label `main` is an existing Cloudflare label, not a separate Git branch operation.

Pre-release guard currently expects rejected production revision `e02f5b911ce540cff854ad1b6203a9f05e5776b5`; read-only metadata refresh must confirm it before release. Publisher validates the exact restored preview before promoting, rechecks drift and preserves domains/bindings. Approved reference deployment is never modified or overwritten. New production deployment is separately recorded.

**Status at this commit: local restoration/tests complete; production publication and actual live verification pending.** Existing custom-domain Cloudflare challenge is not assumed fixed by restoring files. Do not suppress that verification failure or disable security; record actual outcomes separately from production-origin success.

Read-only production preflight [42424226455](https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42424226455) at **2026-11-07T23:13:10.665Z** confirmed `vitaflex`, direct upload, expected rejected revision `e02f5b911ce540cff854ad1b6203a9f05e5776b5`, deployment `ac0b5b50-f87e-487b-8676-776289e9f552`, unchanged apex/www domains and D1-present/R2-absent configuration. The release guard is based on this actual observation, not on the older approved snapshot being mistaken for current production.

Implementation: `4e1668e7da92ffecf4237456ce158c1b6e7bc90d`; live desktop/mobile verifier added in `16e134b`. Final release requested below. Strict live checks remain enabled; the browser step runs even if the earlier custom-domain probe fails, so real desktop/mobile outcomes are captured rather than skipped.
