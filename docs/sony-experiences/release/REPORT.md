# Approved Sony experiences — publication result

## Result

The owner approved the local design and explicitly authorized publishing with the devotion/blog archives empty. The approved version was published to the existing **vitaflex** Pages production project, without merging or pushing to Git `main`.

- Published source: `4eee2ee2020a7eb802699ee3cf4dfab1d762fdbe`
- Immutable production: https://3e44a1ab.vitaflex.pages.dev/
- Stable production: https://vitaflex.pages.dev/
- Hosted pre-production preview: https://b481482c.vitaflex.pages.dev/
- Release run: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42428201389
- Fresh read-only baseline run: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42428142946

### Working published experiences

- https://vitaflex.pages.dev/sony/daily-devotion/
- https://vitaflex.pages.dev/sony/three-daily-wins/
- https://vitaflex.pages.dev/sony/blog/

The existing corporate homepage still has its single bottom **Meet Sony Alexis** link. The three resource doors remain below the biography, not on the corporate homepage.

## Passed release gates

1. Fresh read-only Cloudflare metadata confirmed the expected existing production revision `6268964ebb4c6b94609fdae2be10a69e41ea3515`, deployment `41992407-5e43-430c-be66-9af9f768e856`, project/domain ownership, direct-upload source and existing bindings before publication. The stale production precondition was updated to that observed revision, not removed.
2. Repeat build and **40/40 targeted tests** passed locally and in the release workflow.
3. Local group, original biography, approved-reference and new Sony browser suites passed.
4. Exact approved corporate reference comparison passed: root/four venture pages, corporate CSS, fonts and brand assets match; original biography remains preserved with only the authorized resource-hub additions normalized. Manifest comparisons permit only the three authorized new routes.
5. Hosted preview passed **58/58 HTTP/metadata checks** and the full Sony browser interaction suite **before production publication**. Publication rechecked that production had not changed during preview.
6. Publication completed; deployed revision matched the intended commit. Existing project domains and production D1/KV/R2/service/environment configuration were compared and remained unchanged. No provisioning or DNS/security changes were performed.
7. Stable production passed **58/58 HTTP/metadata checks**, robots/sitemap checks and the full Sony interaction browser suite at **320, 390, 600, 768, 1024, 1440 and 1920 px**: memorization/disclosures, completion/undo/reload/cross-tab, simulated local-midnight reset, storage-denied fallback, URL category filters, isolated intercepted reading-progress fixture, reduced-motion/no-JS and unchanged corporate journey. No uncaught page errors or external requests.
8. Separate normal desktop/mobile browsers confirmed the original four-venture corporate homepage and venture/biography routes on stable Pages production. The unauthenticated protected API probe returned **401** on production. This is not authenticated functional/API integration coverage. The hosted preview API probe returned **503**, so no preview backend-integration claim is made.

## Unresolved custom-domain access issue — do not report a completely green release

The publish step and all Pages production checks passed, but the **overall workflow concluded failure** because the pre-existing preferred-domain challenge remains:

- `https://vitaflexbusinessgroup.com/`: normal desktop/mobile Chromium received **HTTP 403**, `cf-mitigated: challenge`.
- The public-domain footer/User-Agent probe failed; subsequent preferred-domain HTTP/API checks were skipped.
- The final browser matrix passed the approved reference and stable Pages production on desktop/mobile, but failed the challenged preferred domain.

Thus the approved version is published and verified on the existing Pages origin, **not verified accessible through the preferred custom domain**. No firewall rule, bot protection, security setting, DNS record or challenge bypass was changed. That access problem requires a separate authorized Cloudflare/security investigation; another blind site deployment is not a demonstrated fix.

## Content and privacy boundaries

The devotion/article publication collections remain empty. The labelled KJV Scripture practice and generic response prompts are not an invented Sony publication. No fictional article, date, photo, quotation or personal experience was published. The future article renderer was exercised using a browser-intercepted synthetic fixture only, never a public article.

The private untracked `blog-cms/` directory was neither staged nor uploaded. No CMS was provisioned or connected. Wins remain browser-local, with no account, server-side tracking, history or spiritual-worth score. No separate MONTE WO production deployment, customer work, migration, new paid resource or infrastructure configuration change was requested or performed by this release script. Existing Git-connected preview automation may run on feature-branch pushes; it is not a Git `main` push or a separate product production release.

## Evidence

`live-verification.json` contains whitelisted GitHub check annotations confirming publication URLs/revision, preview and production checks, HTTP audit summaries and actual desktop/mobile browser results. `workflow-results.json` preserves step-by-step conclusions, including the custom-domain failures rather than hiding them. Actual hosted preview/production screenshots and full audit outputs are also retained in the release run's `group-deployment-evidence` artifact.

The parent `REVIEW.md`, screenshot gallery and pre-release test evidence are historical local design-review records, not current deployment-status assertions. The previously noted two full-suite infrastructure-checksum failures were not changed to conceal them; this release reran the scoped 40-test suite, not an invented all-green full-suite result.
