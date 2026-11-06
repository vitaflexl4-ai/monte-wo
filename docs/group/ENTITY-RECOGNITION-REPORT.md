# VitaFlex — homepage entity recognition and 55-URL technical audit

## Status

Validated locally; deployment pending the existing `vitaflex` workflow. Baseline source is preserved in Git at `5c57afe`. No new public page, section, text, navigation, brand claim, contact detail, image, design rule or functionality was introduced. All 61 pre-existing HTML bodies and 165 static files match the pinned preservation baseline. Eight full-page screenshot pairs (homepage/profile × 320/390/768/1440px) are pixel-identical.

## 1. Already correct

- Sony's `/sony/` profile already had one valid Person, ProfilePage and Organization graph, supported published degree information, consistent identity and an affiliation reference. **Its source, generated HTML and graph were not changed.**
- Homepage and profile titles, descriptions, canonical tags, Open Graph/Twitter metadata, headings and meaningful image alternatives were already present.
- A canonical public sitemap with 55 unique preferred-domain URLs, including `/sony/` exactly once, already existed. No private portal, API, callback, administrator or legacy duplicate profile was listed.
- robots.txt allowed compliant public search/AI crawling and retained private exclusions for `/api/`, `/strength/admin/`, `/intelligence/`, `/account/callback/`. Existing security/authentication and private noindex headers remain unchanged.
- Existing homepage footer **Meet Sony Alexis**, profile brand/home link and return-to-portfolio link already connected the profile to the corporate site. No new visible links were needed.
- Preferred HTTPS origin, official transparent PNG assets, WOFF2 font delivery, reduced motion and responsive behavior were already established.

## 2. Missing or incorrect

- Homepage lacked Organization and WebSite JSON-LD.
- The 55-path HTTP audit found MONTE WO's Open Graph URL incorrectly inherited the corporate root URL, although its canonical correctly pointed to `/monte-wo/`.
- The prior release verifier checked eight routes, not actual HTTP responses and metadata across the complete 55-URL sitemap.

## 3. Changes made — strictly technical

- Added one homepage JSON-LD graph containing Organization and WebSite. Organization uses the same stable ID as Sony's existing affiliation reference. WebSite identifies the existing site and references that Organization as publisher. Existing official logo URL is used; no legal status, employer, founder title, dates, awards, social profiles or other unsupported information is asserted.
- Corrected only the MONTE WO `og:url` to agree with its existing canonical: `https://vitaflexbusinessgroup.com/monte-wo/`.
- Added a read-only HTTP audit covering all sitemap paths, direct status codes/redirects, canonical/OG consistency, title/description uniqueness, source indexing directives, public robots access and selected crawler response probes. Four concurrent public-page requests maximum; no private endpoints are requested by this new audit.
- Added read-only redirect probes for the legacy profile URL and, on the preferred domain, HTTP and www hosts. Probes record actual responses rather than silently following and hiding redirects/challenges.
- Integrated the 55-path audit into local CI checks, the preview gate before production, production-alias verification and preferred-domain verification. No project, Worker, DNS, WAF, binding or application system was added or changed.
- Strengthened the existing release verifier to parse and check the actual served homepage graph and emit evidence alongside the unchanged Sony graph.
- Added regression tests for consistent entity IDs, supported fields and detection of indexing/metadata errors. No runtime dependency was added.

### Actual homepage JSON-LD

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://vitaflexbusinessgroup.com/#organization",
      "name": "VitaFlex Business Group",
      "url": "https://vitaflexbusinessgroup.com/",
      "logo": "https://vitaflexbusinessgroup.com/assets/group/vitaflex-business-group.png"
    },
    {
      "@type": "WebSite",
      "@id": "https://vitaflexbusinessgroup.com/#website",
      "name": "VitaFlex Business Group",
      "url": "https://vitaflexbusinessgroup.com/",
      "publisher": {
        "@id": "https://vitaflexbusinessgroup.com/#organization"
      }
    }
  ]
}
```

The Organization definition on the homepage and profile is the same entity (`https://vitaflexbusinessgroup.com/#organization`), not two different organizations. Its shared name/URL/ID agree; the homepage additionally supplies the already-published official logo. No duplicate graph is inserted in a page.

## 4. Validation performed

| Check | Result |
| --- | --- |
| Build | Passed |
| Targeted SEO/profile/group tests | 24 passed, 0 failed |
| Full suite | 234/236 passed; same two pre-existing wrangler.toml checksum failures |
| Local sitemap HTTP audit | All 55 direct HTTP 200, matching canonicals/OG URLs, unique metadata, no public source noindex/robots exclusions |
| XML sitemap | Parsed; 55 unique preferred-domain public URLs; Sony exactly once |
| Schema | JSON parsed, graph counts/types/IDs/relationships tested; no invented sameAs or corporate/employment attributes |
| HTML validation | Homepage and Sony passed; MONTE WO has 9 pre-existing validator findings, identical on baseline (DOCTYPE casing, button types, aria-label usage and raw ampersand) |
| Preservation | All 61 HTML bodies and 165 static files byte-identical; no visible changes |
| Visual check | 8 homepage/profile screenshot pairs pixel-identical at 320/390/768/1440px |
| Responsive browser | Profile eight viewports (320–1920px); group/product seven routes at seven widths; no overflow, clipping, failed images, page errors or broken tested internal links |
| Internal links | Existing static reference regression passed, including 131 group references and product links |
| Accessibility | Zero automated axe violations on homepage/profile at four widths; homepage retains one incomplete/manual-review check per width |

Schema and HTML checks are local validators and explicit semantic regression checks, not claims of certification from Google's or Schema.org's hosted validators.

### Performance and image findings

Existing images, compression, dimensions, font assets and animation rules were inspected and retained without alteration. Synthetic mobile measurement (Chromium 153, 390×844, 4× CPU, 1.6 Mbps / 150ms latency) recorded profile LCP ~0.56s and CLS ~0.0010; homepage LCP ~3.48s and CLS ~0.00042. The existing large homepage PNG and reveal animation remain its primary LCP considerations. No visual quality or animation was sacrificed for a score. These are local synthetic measurements, not production field Core Web Vitals. Field INP/CWV and real-user data were not available.

### Crawlability and security interpretation

The unchanged wildcard robots group allows public HTML for Googlebot, Bingbot, other compliant search crawlers and AI retrieval crawlers, with private exclusions applying equally. Googlebot/Bingbot/OAI-SearchBot/PerplexityBot HTTP User-Agent probes test response behavior only: they do **not** authenticate real crawlers or establish indexing. Robots rules are advisory, not authorization; existing authenticated portal/API protections remain intact.

The audit deliberately distinguishes alternate-origin path validation from preferred-domain validation. A Pages-host 200 response is not evidence that a Googlebot request to the custom domain succeeds. When the preferred-domain edge blocks sitemap retrieval, the script uses the already-validated local canonical path list to record responses for all 55 paths and explicitly labels the remote sitemap failure; it does not claim remote sitemap success.

## 5. Deployment

Pending the existing guarded workflow. Target is only the existing domain-owning Cloudflare Pages project **vitaflex**, production branch **main**. Preview must pass the existing schema/API checks and the new all-55 HTTP audit before production publication. Final URLs and status will be recorded after execution.

## 6. Remaining issues and limits

- Existing Cloudflare custom-domain challenges can block CI requests. No security setting was weakened to bypass them; actual responses will be recorded separately from successful Pages-host audits.
- Real verified-Googlebot/Bingbot/AI crawler access and selected canonical/indexing status require appropriate search-engine webmaster tools and edge logs. Search Console/Bing Webmaster Tools access was not available. No indexing, ranking or AI inclusion is claimed.
- Nine legacy MONTE WO HTML-validator findings remain; no visible body or functional button semantics were changed under the strict preservation rule.
- Two unrelated pre-existing protected-source checksum failures remain; their assertions/config were not weakened.
- No new official social profiles, project URLs or unpublished credentials were introduced; unknown external identities remain omitted.
- Physical-device Safari/Firefox, screen-reader and field Core Web Vitals testing were not performed.

## Evidence and reproduction

`docs/group/entity-recognition-evidence.json` contains exact graphs, all 55 local HTTP rows, measured browser/performance data and visual comparisons. Deployment artifacts additionally record all 55 preview/production/preferred-domain HTTP rows, crawler/redirect probes and verified served schema.

```sh
npm ci
npm run build
node --test tests/seo.test.js tests/founder.test.js tests/group.test.js
npm test
# With public/ served on port 8080:
VERIFY_ORIGIN=http://127.0.0.1:8080 node scripts/audit-public-seo.mjs
node tests/founder-browser.mjs
node tests/group-browser.mjs
```

## Every modified or added file and why

- `.github/workflows/deploy-group.yml` — Run all-55 HTTP audits in CI, production-alias and preferred-domain checks.
- `docs/group/ENTITY-RECOGNITION-REPORT.md` — Complete implementation and deployment handoff.
- `docs/group/entity-recognition-evidence.json` — Machine-readable local/production evidence.
- `public/index.html` — Generated homepage head: Organization/WebSite JSON-LD only.
- `public/monte-wo/index.html` — Generated head: correct Open Graph URL only.
- `scripts/audit-public-seo.mjs` — Read-only sitemap HTTP, metadata, robots, crawler and redirect audit.
- `scripts/build_group.py` — Generate the missing homepage graph and correct product OG URL durably.
- `scripts/publish-group-domain.mjs` — Require the preview all-55 audit to pass before production.
- `scripts/verify-group.mjs` — Validate and record actual served homepage entities.
- `tests/seo.test.js` — Regression coverage for entity consistency and audit error detection.
