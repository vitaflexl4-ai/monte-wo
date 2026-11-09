# Sony profile production release

Owner explicitly approved push and deployment in chat.

- Deployed revision: `0af75cc3baadf9ef247ae462e33d9f48dcc21115`.
- Existing project: `vitaflex`; domains and production bindings verified unchanged by publisher.
- Production: https://0c1af40d.vitaflex.pages.dev/sony/
- Stable production: https://vitaflex.pages.dev/sony/
- Hosted preview tested before publication: https://76ecb3c9.vitaflex.pages.dev/sony/
- Rollback reference: https://3e44a1ab.vitaflex.pages.dev/ (previous revision `4eee2ee2020a7eb802699ee3cf4dfab1d762fdbe`). No rollback executed.
- Read-only production inspection: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42669821797
- Release workflow: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42670049202

## Actual results

Build, local browser/layout checks, 49 scoped tests, exact corporate preservation comparison, hosted preview browser checks (profile eight layouts and book seven widths), preview URL audit, guarded publication, and production URL/metadata audit passed. Production audit: 58/58 URLs HTTP 200; robots and sitemap 200; protected production API returned 401. Normal production Pages desktop/mobile corporate and Sony route checks passed. Production cinematic book browser check passed at seven widths.

The publication step succeeded, but the overall workflow is **failure**, not green: subsequent preferred-domain footer verification and normal desktop/mobile browser checks encountered the existing Cloudflare HTTP 403 challenge (“Just a moment…”). Preferred-domain Sony accessibility is therefore not confirmed. No challenge bypass, security change, DNS edit, provisioning, private CMS publication, or separate MONTE WO deployment was performed.

The initial release attempt stopped before publishing because CI used the profile test default port 8098 while its local HTTP server used 8080. Explicit TEST_ORIGIN fixed this configuration issue; no tests were skipped or weakened.

Complete public check annotations are retained in `evidence/production-release-annotations.json`; workflow artifacts contain browser screenshots and detailed release evidence. The production profile eight-layout suite ran on the hosted preview before publication; post-publication production desktop/mobile route checks and seven-width book checks passed. Do not misstate the prepublication profile suite as a second full postpublication run.
