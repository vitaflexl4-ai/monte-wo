# Restore the exact owner-approved VitaFlex corporate website

## Final outcome

**The owner-selected corporate presentation is restored and published. Desktop/mobile checks pass on the production Pages origin. Custom-domain verification remains blocked by Cloudflare.**

- New production revision: `6268964ebb4c6b94609fdae2be10a69e41ea3515`.
- New production deployment: https://41992407.vitaflex.pages.dev/ .
- Stable production origin: https://vitaflex.pages.dev/ .
- Original approved reference stays intact: https://2f802a54.vitaflex.pages.dev/ .
- Release: [42424284309](https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42424284309), completed 2026-11-07T23:15:26Z. Exact 13-file reference comparison, build, local browser/regression tests, preview checks, production publication and **55/55 production HTTP/metadata checks passed**. Protected API returned **401**, and product privacy bytes remain unchanged.
- Follow-up normal live browser comparison: [42424474570](https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42424474570). **Both the actual approved reference and restored production origin pass at desktop 1440×1000 and mobile 390×844**, including all four dedicated venture pages, separate Sony page, one bottom Sony link, no rejected self-assessment and no horizontal overflow/page errors. Results and actual live screenshots: `evidence/live/`.
- Apex `https://vitaflexbusinessgroup.com/` still returns **403 / Cloudflare challenge** to desktop and mobile Chromium. The release and follow-up workflows remain **failure**, not green. No successful custom-domain desktop/mobile verification is claimed. Existing zone-security read limitations were documented previously; no security bypass or infrastructure change was attempted.

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

**Historical pre-release status at the implementation commit: local restoration/tests complete; production publication and live verification were pending.** Existing custom-domain Cloudflare challenge is not assumed fixed by restoring files. Do not suppress that verification failure or disable security; record actual outcomes separately from production-origin success.

Read-only production preflight [42424226455](https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42424226455) at **2026-11-07T23:13:10.665Z** confirmed `vitaflex`, direct upload, expected rejected revision `e02f5b911ce540cff854ad1b6203a9f05e5776b5`, deployment `ac0b5b50-f87e-487b-8676-776289e9f552`, unchanged apex/www domains and D1-present/R2-absent configuration. The release guard is based on this actual observation, not on the older approved snapshot being mistaken for current production.

Implementation: `4e1668e7da92ffecf4237456ce158c1b6e7bc90d`; live desktop/mobile verifier added in `16e134b`. Final release requested below. Strict live checks remain enabled; the browser step runs even if the earlier custom-domain probe fails, so real desktop/mobile outcomes are captured rather than skipped.


## Live verification detail and preserved failure evidence

The first post-publication browser run recorded a mobile overflow measurement during early document loading. It was retained in `evidence/live-browsers.json`, not erased or described as passing. The follow-up verifier waits for the normal load event, CSS/font/image readiness and two animation frames, and checks the original approved site alongside the restored site. Both pass after readiness at 390px and 1440px with identical measured viewport widths and the expected Inter font. No application CSS, markup, assets, animations or page design were changed to obtain this result. The assertion remains strict.

The release workflow's final preferred-domain step was skipped after its prior challenge failure. The independent live browser step still ran and recorded both origins. The follow-up read-only workflow is also red because it honestly retains the preferred-domain failures, even though the approved/reference and restored-origin rows all pass. Machine/user-agent probes are not proof of verified crawler access, ranking or indexing.

### Actual live screenshot evidence

- [Restored production desktop](evidence/live/restored-live-production-desktop.png)
- [Restored production mobile](evidence/live/restored-live-production-mobile.png)
- [Approved reference desktop](evidence/live/restored-live-approved-desktop.png)
- [Approved reference mobile](evidence/live/restored-live-approved-mobile.png)
- [Actual preferred-domain desktop challenge](evidence/live/restored-live-preferred-desktop-blocked.png)
- [Actual preferred-domain mobile challenge](evidence/live/restored-live-preferred-mobile-blocked.png)
- [Structured live browser results](evidence/live/restored-live-browser.json)
- [Exact approved-reference comparison](evidence/reference-comparison.json)

## Safety and remaining action

The approved immutable reference was never modified, overwritten or deleted. Restoration was a new deployment of exactly matching corporate files while keeping the later safe Sony page, rather than blindly rolling back the whole project and reintroducing older unverified SEO credentials. The rejected deployment `ac0b5b50-f87e-487b-8676-776289e9f552` remains a recorded pre-change reference; no rollback back to that rejected design was performed. Source/history and untracked private CMS work remain intact. No main merge/push or separate MONTE WO project/Worker deployment occurred.

A zone-security administrator needs to review the existing rule challenging legitimate public corporate requests before preferred-domain acceptance can be completed. Do not disable security broadly or send credentials in chat. The next release must refresh production metadata and its one-shot revision guard rather than blindly rerun the obsolete precondition.

This final report/evidence commit is not another production deployment. Current production application bytes remain those published from `6268964`.
