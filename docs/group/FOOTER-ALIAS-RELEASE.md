# Corporate footer Privacy removal and Sony Holmes alternate name

## Scope

Owner instructed “Forget 2, deploy,” omitting the Senate/testimony request. This release removes only the corporate footer Privacy link and adds the owner-confirmed alternate name Sony Holmes to Sony Alexis's existing profile. It introduces no Senate, Austin Holmes, foster-family, credential, title or unverified relationship claim.

Status: published to the existing production project; production Pages verification passed. Custom-domain verification remains incomplete because its post-publication check failed (see receipt below).

## Changes

- Corporate footer source: `scripts/build_group.py`. Removed exactly `<a href="/privacy/">Privacy</a>` from the shared corporate page shell. Existing profile anchor, copyright, motto, markup structure, layout and styles remain otherwise unchanged.
- Regenerated homepage, Sony profile and four venture pages. Homepage and four venture HTML files differ byte-for-byte only by that anchor deletion. No replacement policy page was created.
- `Sony Alexis` remains the primary name, H1, signature, title and stable Person ID. `Sony Holmes` is a single `alternateName` on that same Person, not a second Person or profile.
- Added one sentence to the beginning of the existing opening paragraph: **My professional name is Sony Alexis, and I am also known as Sony Holmes.** No chapter or additional biography section was added; all original narrative, headings, closing, faith/Haiti/family/service themes remain intact.
- Updated the profile SEO/OG/Twitter/JSON-LD description to: **Discover Sony Alexis, also known as Sony Holmes — his background in business administration, fitness, technology, and connection to Haiti.**
- `/sony/`, canonical, sitemap, robots, entity affiliations and existing footer profile link text remain unchanged. No keyword list, duplicate profile, unsupported sameAs or external testimony URL was added.
- MONTE WO's product HTML, its existing Privacy link, and `public/privacy/index.html` are unchanged. The policy remains a valid public route in the sitemap.
- CSS, logo/font/image assets, application functionality, private security configuration, service-worker logic and DNS were not modified. The existing navigation strategy is network-first, so no unrelated service-worker change was needed.

## Checks

- `npm run build`: passed.
- Profile/group/SEO static tests: **25/25 passed**.
- Full suite: **235/237 passed**; the same two pre-existing wrangler.toml protected-file checksum assertion failures remain.
- Profile browser: eight widths 320–1920px, keyboard/chapters/reduced-motion/no-JavaScript reading, no clipping/overflow, all paragraphs in order, no failed assets/page errors: passed.
- Group/product browser regression: passed.
- Homepage/profile HTML validation: passed.
- Local HTTP audit: **55/55 HTTP 200**, canonical/metadata/indexability checks passed.
- Preservation tests keep the original baseline fixture intact and normalize only the explicitly authorized Privacy anchor deletion and one alias sentence before comparing all 61 HTML bodies. All 165 static files remain byte-identical. All remaining profile source content is compared to the original pinned baseline.
- Additional regression test verifies one Person, primary/alternate names, no Senate/foster-family material, one unchanged corporate profile link, no corporate Privacy anchor, and no second profile.

Protected complete-file SHA-256 values confirmed before/after build:

- `public/monte-wo/index.html` — `65a339c207b7edf9784f8f98b9dfd81911f28433772816cd13cd8c361fc02ee3`
- `public/privacy/index.html` — `5ad88f6a2e5100afb503ecd176960cb1d7106b5d29f44176f9e1146709369afa`
- `public/group.css` — `0dc8d6ef0cbf3b3495a76594fed317a39d85f5c507374ecdbce4433b7a35159e`

## Production-source and deployment safeguards

The source changes are on the fixed session branch `arena/beb13e2a-monte-wo`, not a blind checkout/deploy of main. Publication is restricted to existing project `vitaflex`, its existing domain list and its production deployment branch `main`.

Before any preview or production publication, the workflow reads the Cloudflare project API and **requires the actual current production revision to equal `6a1596d2715efea265147ece053109021aee9a5e`**, the baseline whose site content was used for this change. This is a checked precondition, not an assumption that the old revision is still live. If the project, ownership, revision or production branch differs, publication aborts. It also checks production has not changed during preview before publishing. Future releases must inspect and explicitly update this precondition rather than removing it.

Preview checks require: all six corporate footers exist, Privacy is absent, existing Sony link remains, alternateName and the visible alias sentence are served, the app policy returns 200 and its complete bytes match the unchanged source. The preview 55-path HTTP audit must also pass. The publication script preserves existing production bindings/variables/domains and creates no project, Worker, migration, DNS or security change.

After publication, production Pages checks repeat these checks. A separate clearly labeled Googlebot **User-Agent probe** reads the custom-domain HTML to verify the actual footer and alias through the known edge behavior. This is content verification, not verified crawler traffic or proof of Google indexing. The existing default-request custom-domain audit is retained and may still fail at Cloudflare; no security setting or broad allow rule is changed to bypass it.

## Deployment receipt

- Workflow: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42413313336
- Published revision: `de98ffdf952c5b896e798714c6a3d8bdb2c60ab3`.
- Existing project: `vitaflex`; production branch: `main`; existing apex/www domains retained.
- Actual source precondition passed against revision `6a1596d2715efea265147ece053109021aee9a5e`, deployment `f4c7468a-a221-4fc5-a7d0-fa127c081d34`.
- Preview: https://56a98c1a.vitaflex.pages.dev — footer/alias/policy verification and all 55 HTTP/metadata checks passed before production publication.
- Production deployment: https://26d880f0.vitaflex.pages.dev
- Production origin: https://vitaflex.pages.dev — all 55 HTTP/metadata checks passed; six corporate footers lack Privacy and retain the Sony link; Sony Alexis remains primary with Sony Holmes as alternate; complete app policy bytes match unchanged source; protected API returned 401.
- CI browser/layout and targeted SEO/content regression steps passed on this run without bypassing any tests. The previous attempt stopped before publication at the browser step; its exact transient failure was not recovered.
- The Cloudflare API diagnostics after publication confirmed the new production URL and revision on the domain-owning project. Default-request apex diagnostics still returned HTTP 403 with the “Just a moment...” challenge page.
- **Overall workflow conclusion: failure after successful publication**, at the custom-domain User-Agent content probe. The later default custom-domain/protected-API audit was skipped. The probe's precise assertion error could not be retrieved because GitHub's signed log download returned EOF. Therefore the alias/footer have been verified on production Pages, **not confirmed through the custom domain**. Do not interpret the deployment receipt as an all-green custom-domain audit.
- No security/DNS changes were made to bypass the edge behavior. No Google Search Console access, genuine crawler visit or indexing result is claimed.

The source revision guard intentionally still names the prior baseline. A future deployment must explicitly inspect and update it; blindly rerunning this release will fail closed now that production has advanced.

## Every changed file

- `.github/workflows/deploy-group.yml`
- `content/group/founder.json`
- `docs/group/FOOTER-ALIAS-RELEASE.md`
- `public/index.html`
- `public/sony/index.html`
- `public/ventures/lifeline/index.html`
- `public/ventures/monte-wo/index.html`
- `public/ventures/vitaflex-intelligence-corp/index.html`
- `public/ventures/vitaflex-training/index.html`
- `scripts/build_group.py`
- `scripts/founder_page.py`
- `scripts/publish-group-domain.mjs`
- `scripts/verify-group.mjs`
- `tests/founder.test.js`
- `tests/seo.test.js`

## Follow-up: alternate name in SEO only

The owner subsequently requested removal of Sony Holmes from the visible biography, retaining it only for SEO. Removed the added opening sentence and restored the original visible biography exactly. The head metadata description and Person.alternateName remain unchanged. Regression and deployed-content checks now require the alternate name to be absent from the visible body. Build and all 25 targeted tests passed; no app, policy, styling or other page changes resulted. This follow-up's guarded deployment expects the preceding production revision `de98ffdf952c5b896e798714c6a3d8bdb2c60ab3`. The receipt above describes the preceding release, not this follow-up.
