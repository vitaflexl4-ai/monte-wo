# Corporate footer Privacy removal and Sony Holmes alternate name

## Scope

Owner instructed “Forget 2, deploy,” omitting the Senate/testimony request. This release removes only the corporate footer Privacy link and adds the owner-confirmed alternate name Sony Holmes to Sony Alexis's existing profile. It introduces no Senate, Austin Holmes, foster-family, credential, title or unverified relationship claim.

Status: validated locally; guarded deployment pending.

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

Production URLs, actual source precondition result and deployment verification will be recorded after execution. No Google Search Console access or indexing request is claimed.

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
