# VitaFlex Business Group — Noir

## Current presentation

The later direction supersedes the explanatory corporate homepage: minimal, mysterious, charcoal/champagne, sculptural artwork, editorial typography, quiet motion. No corporate contact links, contact forms, explanatory paragraphs, mission blocks or agency-style calls to action.

- `/`: “Beyond the obvious.”, group identity and two discreet portfolio entries.
- `/ventures/monte-wo/`: minimal venture identity; real destination at `/monte-wo/`.
- `/ventures/vitaflex-training/`: minimal distinct venture identity; no invented launch or external destination.
- `/monte-wo/`: preserved product homepage. Existing product, tools, accounts, legal and protected API routes remain intact. Their product-support contact details are deliberately preserved; corporate pages do not link to them as contact channels.

Edit `content/group/ventures.json` for venture information; `scripts/build_group.py` generates the corporate layer after the existing product build. Visual assets: `public/group.css`, `public/group-sculpture.svg`, `public/group-mark.svg`; existing local Inter fonts and MONTE WO artwork remain available. Corporate pages require no JavaScript and honor reduced motion.

## Production publication — resolved project mismatch

The main domain was attached to Pages project `vitaflex`, not the repository's earlier deployment target `vitaflex-monte-wo-live`. Inspection of the individual project confirmed that the source field is omitted (direct upload), not a git-connected deployment.

`scripts/publish-group-domain.mjs` now:

1. Inspects the domain-owning project and checks that both apex and www remain assigned to it.
2. Rejects a git-connected source and verifies the approved preview marker.
3. Saves previous deployment metadata to the workflow evidence artifact.
4. Publishes through the existing `scripts/deploy-intelligence.mjs --project-name vitaflex --skip-build` workflow, preserving its fail-closed security provisioning.
5. Verifies that the production revision matches the checked-out revision.

No DNS, WAF, challenge, Access, SSL or zone-security configuration was changed. An initial DNS-cutover approach failed during read-only preflight and made no domain changes; it was removed in favor of publishing directly to the existing domain owner.

### Deployed revision

`d3e38d25902370b66f52a75b941fcda9c729664a`

- Domain-owning project: `vitaflex`
- Domains: `vitaflexbusinessgroup.com`, `www.vitaflexbusinessgroup.com`
- Production deployment: https://0241061e.vitaflex.pages.dev
- Production alias: https://vitaflex.pages.dev
- Separate preview alias: https://vitaflex-monte-wo-live.pages.dev
- Evidence: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/40707804697

## Verification

- `npm run build`: PASS.
- `npm test`: 213/215 PASS. Two existing protected-file checksum expectation mismatches in Lab/Website tests remain unchanged; reproduced on the starting revision previously. No protected files or checksum assertions were weakened.
- Group/product regression subset: 13/13 PASS.
- GitHub Chromium browser tests: PASS. Four routes, 20 responsive layouts (320–1440px), corporate links, keyboard skip navigation, no page errors. Desktop/mobile screenshots are workflow artifacts.
- Both production and preview aliases: verified HTTP 200 on `/`, both venture detail pages, `/monte-wo/`, `/tools/`; expected design/status markers matched.
- Private intelligence API: HTTP 401 without authentication on both aliases.
- Cloudflare project API confirms that the project owning the apex and www domains now has the new deployed revision.
- Public-domain automated request still returns Cloudflare's `Just a moment...` challenge (HTTP 403). The workflow intentionally remains red at that strict external check. The project mismatch is resolved and the domain-owning production project is updated, but a successful human-browser visit through the challenge was not independently verified. Do not claim an HTTP 200 custom-domain verification or disable security to make the check green.

## Owner-supplied logo update

The owner supplied two original PNG logos. They are retained unchanged in `brand-assets/group/`. The black-background logo replaces the abstract hero artwork; its actual VF monogram replaces the placeholder header mark and supplies the favicon. The textured/tagline variant is preserved as an alternate. Optimized web assets total about 83 KB. No recreated or generated logo is used. Browser checks explicitly decode image assets and assert the official hero/header paths.

## Third venture: VitaFlex Intelligence Corp

Owner confirmed VitaFlex Intelligence Corp is a third venture under VitaFlex Business Group, not a parent rename. It appears in the minimal portfolio and at `/ventures/vitaflex-intelligence-corp/`, with `In Development` status. No logo, external public product URL, capabilities, customers or legal-registration claims have been invented. Existing private `/intelligence/` and API routes are not linked or altered.

Portfolio rows, count, detail routes and venture offline assets now derive from the same registry, so future ventures no longer require editing hard-coded homepage rows. Wordmark/category fallbacks are venture-specific rather than defaulting every unbranded venture to VitaFlex Training. Build and the 15-test focused regression suite pass; repeat builds verify cache-list deduplication.

## Design assessment and refinement

The logo-led direction was retained. Source/layout review identified tiny 6–8px labels, mobile hero positioning tied to absolute pixel offsets, multiple contradictory CSS overrides, and portfolio hover padding that moved content. The refinement replaces those with one readable stylesheet, an intrinsic grid hero that stacks at 820px, larger secondary text, consistent spacing, visible focus states and 44px primary controls. Venture rows use stable hover surfaces and directional arrows rather than shifting padding. The long Intelligence Corp title has a deliberate second line and mobile category placement. Venture detail pages share the same improved rhythm. No contact section or explanatory marketing copy was added.

Browser regressions now check seven viewport widths per route, headline/logo separation, portfolio text clipping, stable hover geometry, keyboard focus and reduced-motion preferences in addition to decoded images, links and screenshots. Security/domain-verification behavior is unchanged.

## Transparent-logo request

The hero and header now use genuine transparent PNGs (`vitaflex-business-group.png`, `vitaflex-monogram.png`) with an RGBA favicon. Background removal is applied to the original black-background logo; supplied originals are unchanged. CSS screen blending is removed, and the offline cache is versioned for the PNG change. The full-resolution transparent deliverable is `brand-assets/group/vitaflex-business-group-transparent.png`.
