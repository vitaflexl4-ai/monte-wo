# Sony Alexis — technical SEO & AI discoverability

## Scope and status

Published to the existing `vitaflex` Cloudflare Pages production project (`main`) at revision `ac3fe7340b14951bbe2a35fffff1759c13e2ac54`. Preview and production-alias SEO verification passed; fresh independent live-domain retrieval confirmed the unchanged profile, new robots rules and sitemap. The user's final **no visible changes** instruction takes precedence over the earlier request for a new profile. This update is strictly behind the scenes and confined to the existing website/profile. No other project websites were edited.

Before editing: inspected the existing source, live `/sony/`, live robots.txt, metadata, renderer, source content and deployment workflow. The existing version is preserved in Git at `0fc7886`; `tests/fixtures/seo-visible-baseline.json` independently pins all 61 HTML bodies, 165 static files and visible profile source fields from that version.

## A. Changes made

- **Visible biography changes: none.** Headings, paragraphs, signature, chapters, links, photos/logos, interface, styles, typography, scripts and animations are unchanged. All 61 HTML bodies and 165 pre-existing static files compare byte-for-byte to the baseline. Full-page profile screenshots compare pixel-identically at 320/390/768/1440px.
- Retained the correct title, H1, canonical, 55-URL sitemap, existing descriptive homepage footer link and return-to-portfolio link. No new visible links or sections were added.
- Refined only the SEO description and corresponding Open Graph, Twitter and JSON-LD descriptions to summarize already-published education, interests, Haiti, faith and service. Did not add the earlier proposed nationality/community-development description as those specific assertions are not currently explicit in the published essay.
- Replaced the inline organization duplication with a stable Organization entity and an `affiliation` reference from Person. Added the inverse `mainEntityOfPage` reference to the existing ProfilePage, retaining one Person entity.
- Added two `EducationalOccupationalCredential` entries for the bachelor's degree in Business Administration and MBA already stated in visible HTML. No issuers, dates, IDs or unverified credentials were added. Expanded `knowsAbout` only with published education/interests (leadership, AI and learning included).
- Kept `image` off Person: the verified group logo is not a verified personal portrait. The unchanged social preview remains the group emblem with descriptive alternative text.
- Excluded `/intelligence/` and `/account/callback/` in robots.txt alongside the existing API/admin exclusions. Retained public access for all compliant crawlers; no AI crawler block or broad noindex was introduced.
- Advanced only the service-worker cache name to `montewo-core-v30-technical-entities` so cached profile HTML can update; no service-worker functionality changed.
- Strengthened the existing release verifier to parse and inspect the **deployed** JSON-LD and metadata, check private-path exclusions, record the API status and write public SEO evidence into CI artifacts.

### Facts intentionally not introduced

Liberty University, CleanCapHT, CJVitaFlex, external social profiles, public recognition, job titles, nationality and new corporate/project relationships were not introduced into visible content or hidden structured data. The final restriction permits only already-published facts; the institution and those identities do not appear in the existing essay. Accordingly, no `alumniOf`, `sameAs`, `jobTitle`, `nationality`, personal image, credentials issuer or new subsidiary/ownership relationship is emitted. Adding these would first require a separate approved publication of the relevant facts and verification of official URLs; no such visible change was made or proposed for implementation in this task.

## B. Validation

- `npm run build`: passed.
- `node --test tests/seo.test.js tests/founder.test.js tests/group.test.js`: **22 passed, 0 failed**.
- `npm test`: **232 passed / 234 total**; the same two existing `wrangler.toml` checksum expectation failures remain in the lab/website protected-file tests. No protected config, source or assertion was weakened.
- `html-validate`: profile and homepage passed.
- JSON-LD: valid JSON; exactly one Person, one ProfilePage, one Organization; unique stable IDs and resolved entity references; published degree names and interests tested; unsupported attributes absent. These are local validation results, not claims of certification by Google's hosted Rich Results Test or Schema.org's hosted validator.
- Canonical: one query-free HTTPS preferred-domain canonical; OG URL agrees. All sitemap URLs use the preferred domain, resolve to local HTML and have matching canonicals. No duplicate titles/descriptions among sitemap pages.
- Indexability: explicit index/follow on `/sony/`; no blocking profile header; no robots exclusion for public profile. Important existing facts remain in server-rendered HTML, not runtime requests or hidden keyword content.
- Sitemap: 55 unique canonical URLs; `/sony/` exactly once; no private portal, callback, admin or API routes. Existing sitemap was correct and retained unchanged.
- Links/heading/image checks: 131 group references resolved; exactly one H1; chapter headings/anchors and alt attributes remain valid. Existing product link regression passed. No project or social URL was invented.
- Profile browser: eight widths 320–1920px including landscape; no overflow/clipping; keyboard navigation, chapter anchors, no-JavaScript reading, reduced motion, no failed assets/page errors. Existing group/product browser regression passed all seven routes at seven widths.
- axe: zero automated violations on profile and homepage at 320/390/768/1440px. Profile has zero incomplete checks; homepage retains one incomplete/manual-review check per width. Not a complete WCAG certification.
- Synthetic performance: Chromium 153, mobile 390×844, 4× CPU throttling, 1.6 Mbps / 150ms emulation. Profile LCP ~0.57s / CLS ~0.0010; homepage ~3.48s / CLS ~0.00042. These are local synthetic measurements, not field CWV or Lighthouse scores. No stylesheet/font/image/performance-visible change was necessary or made; existing homepage logo/reveal animation still dominate its LCP.

## AI crawler policy and llms.txt decision

The wildcard robots group allows public HTML to compliant search and AI crawlers, including retrieval crawlers such as OAI-SearchBot and PerplexityBot, while retaining the same private exclusions for every crawler. No separate bot group was added because a specific group can replace wildcard rules and inadvertently omit private-path exclusions. This best fits the requested public discoverability without weakening authentication.

The same wildcard also permits compliant training crawlers on public pages. Training permission is a separate policy choice from search inclusion; no training-specific block was added under the explicit instruction not to automatically block AI crawlers. Future decisions about training can be made independently of public retrieval. Robots.txt is advisory, **not an access-control boundary**; existing portal authentication, protected APIs, security headers and noindex on private surfaces remain unchanged.

No `llms.txt` was created. It would be an additional public document, duplicate existing biography information, and is not required for crawlability, entity interpretation or guaranteed use by any AI system. Standard crawlable HTML, stable canonicals and supported JSON-LD serve this task without an appearance-only file.

## C. Deployment

- Project: **vitaflex**, production deployment branch **main**.
- Preview: https://8237997d.vitaflex.pages.dev/ (profile `/sony/`).
- Immutable production deployment: https://f4749640.vitaflex.pages.dev/.
- Production website: https://vitaflexbusinessgroup.com/; profile: https://vitaflexbusinessgroup.com/sony/.
- Deployed revision: `ac3fe7340b14951bbe2a35fffff1759c13e2ac54`.
- Workflow: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42264336964.
- CI build, responsive browser tests, all 22 SEO/profile/group tests, verified preview publication, production publication and production-alias verification passed. The verifier parsed actual served JSON-LD and confirmed one Person and both published degrees, current metadata, canonical, robots, sitemap and eight routes.
- Private API: production returned **401**; preview returned **503** (fail-closed). This is protection testing, not an authenticated end-to-end workflow test. Existing production bindings and variables were preserved.
- The final strict custom-domain check from GitHub still encounters **HTTP 403 / Cloudflare challenge**, leaving the overall workflow red. This is not a claim that the entire CI run passed. Publication and production-alias validation completed before that failure.
- Independent fresh custom-domain requests to the profile, robots.txt and sitemap succeeded using `?verify=ac3fe73` to avoid stale verification responses. Public canonical URLs are unchanged and query-free.
- The publication script verified the existing domain owner and production branch, preserved production bindings/variables and domains, and created no project, Worker, migration or DNS/WAF change.

Actual CI verification receipt:

```json
{"origin":"https://vitaflex.pages.dev","profile":"Sony Alexis","canonical":"https://vitaflexbusinessgroup.com/sony/","routes":8,"robots":true,"sitemap":true,"personEntities":1,"publishedDegrees":2,"apiStatus":401}
```

## D. Outstanding

- Actual Google indexing, Google-selected canonical, sitemap submission and verified-Googlebot access require authenticated Google Search Console inspection. No Search Console access is available in this task; no search engine or AI inclusion/ranking is guaranteed.
- Existing Cloudflare edge challenges still block GitHub-runner custom-domain requests. Source-level indexability does not prove verified Googlebot/AI access through the edge. No security setting was weakened to bypass checks.
- Existing domain ownership is checked through the deployed Pages project. No DNS change or new domain verification is required for this publication; a new Search Console property would require owner verification if not already established.
- Unpublished institution/project/social details deliberately omitted as above; no unverified public URLs were added.
- Physical-device Safari/Firefox and screen-reader testing were not performed.
- Two pre-existing checksum expectation failures remain.

## E. Actual resulting metadata

```json
{
  "title": "Sony Alexis | Professional Profile & Biography",
  "description": "Discover Sony Alexis — his background in business administration, leadership, fitness and technology, and reflections on learning, faith, Haiti and service.",
  "h1": "Sony Alexis (unchanged)",
  "canonical": "https://vitaflexbusinessgroup.com/sony/",
  "robots": "index, follow, max-image-preview:large",
  "og:type": "profile",
  "og:title": "Sony Alexis | Professional Profile & Biography",
  "og:description": "Discover Sony Alexis — his background in business administration, leadership, fitness and technology, and reflections on learning, faith, Haiti and service.",
  "og:url": "https://vitaflexbusinessgroup.com/sony/",
  "og:image": "https://vitaflexbusinessgroup.com/assets/group/vitaflex-business-group.png",
  "twitter:card": "summary",
  "twitter:title": "Sony Alexis | Professional Profile & Biography",
  "twitter:description": "Discover Sony Alexis — his background in business administration, leadership, fitness and technology, and reflections on learning, faith, Haiti and service."
}
```

### Actual resulting JSON-LD

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://vitaflexbusinessgroup.com/sony/#person",
      "name": "Sony Alexis",
      "url": "https://vitaflexbusinessgroup.com/sony/",
      "description": "Discover Sony Alexis — his background in business administration, leadership, fitness and technology, and reflections on learning, faith, Haiti and service.",
      "affiliation": {
        "@id": "https://vitaflexbusinessgroup.com/#organization"
      },
      "mainEntityOfPage": {
        "@id": "https://vitaflexbusinessgroup.com/sony/#profile"
      },
      "hasCredential": [
        {
          "@type": "EducationalOccupationalCredential",
          "name": "Bachelor's degree in Business Administration",
          "credentialCategory": "degree"
        },
        {
          "@type": "EducationalOccupationalCredential",
          "name": "Master of Business Administration (MBA)",
          "credentialCategory": "degree"
        }
      ],
      "knowsAbout": [
        "Business administration",
        "Leadership",
        "Entrepreneurship",
        "Fitness",
        "Technology",
        "Artificial intelligence",
        "Continuous learning"
      ]
    },
    {
      "@type": "ProfilePage",
      "@id": "https://vitaflexbusinessgroup.com/sony/#profile",
      "url": "https://vitaflexbusinessgroup.com/sony/",
      "name": "Sony Alexis | Professional Profile & Biography",
      "description": "Discover Sony Alexis — his background in business administration, leadership, fitness and technology, and reflections on learning, faith, Haiti and service.",
      "inLanguage": "en",
      "mainEntity": {
        "@id": "https://vitaflexbusinessgroup.com/sony/#person"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://vitaflexbusinessgroup.com/#organization",
      "name": "VitaFlex Business Group",
      "url": "https://vitaflexbusinessgroup.com/"
    }
  ]
}
```

### Resulting robots.txt

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /strength/admin/
Disallow: /intelligence/
Disallow: /account/callback/
Sitemap: https://vitaflexbusinessgroup.com/sitemap.xml

```

### Evidence and reproducibility

Machine-readable actual metadata, JSON-LD, tests, preservation counts, screenshots comparison results and browser measurements: `docs/group/technical-discoverability-evidence.json`. Reproduce with `npm ci`, `npm run build`, and `node --test tests/seo.test.js tests/founder.test.js tests/group.test.js`. Existing browser commands are `node tests/founder-browser.mjs` and `node tests/group-browser.mjs` against a server serving public/ on port 8080. Optional axe/performance audit uses `tests/seo-browser.mjs` with `@axe-core/playwright` installed as temporary tooling, not an application dependency.

## Every modified/added file in this task

- `content/group/founder.json`
- `docs/group/TECHNICAL-DISCOVERABILITY-REPORT.md`
- `docs/group/technical-discoverability-evidence.json`
- `public/robots.txt`
- `public/sony/index.html`
- `public/sw.js`
- `scripts/build_group.py`
- `scripts/build_website.py`
- `scripts/founder_page.py`
- `scripts/verify-group.mjs`
- `tests/fixtures/seo-visible-baseline.json`
- `tests/founder.test.js`
- `tests/group.test.js`
- `tests/phone-cockpit.test.js`
- `tests/posters.test.js`
- `tests/seo.test.js`
