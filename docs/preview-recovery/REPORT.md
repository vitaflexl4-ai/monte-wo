# Approved-preview recovery — exact owner selection required

## Status

**No production restoration has been performed. No application page, design, biography, navigation or functionality was edited in this recovery turn.** The rejected current site has not been substituted for an older preview. No historical Cloudflare deployment was deleted or overwritten. Existing immutable URLs are retained as references, rather than treating mutable branch aliases as the approved reference.

There is no reliable record tying your approval to one exact deployment ID. Following your explicit fallback instruction, this report supplies the actual surviving versions for identification instead of choosing another interpretation.

## Open the comparison gallery

Open `evidence/index.html` through the **Recovered website previews** live review server. The gallery contains actual desktop (1440 × 1000) and mobile (390 × 844) deployed-page screenshots and exact immutable URLs, full deployment IDs, timestamps and recorded commit references. These are not generated mockups, local rebuilds or proposed redesigns. Captures use normal browser navigation and scrolling to reveal existing animated sections; styles/content are not modified. Source inventory: `evidence/inventory.json`.

## Starting points — none labelled approved

### C24 — Earlier business-growth website

- Exact URL: https://96bb15fc.vitaflex.pages.dev/
- Environment: **production** (historical production snapshot, not falsely labelled a preview).
- Deployment ID: `96bb15fc-2734-454f-81bd-697db1f96515`
- Recorded commit: `3d8ab92af257e6dfa659076085f5cd54442680bc`
- Created: `2026-10-11T20:13:12.110054Z`
- Headline: **Your business is good. Is your digital presence?**
- Screenshots: [desktop](evidence/screenshots/C24-desktop.jpg) · [mobile](evidence/screenshots/C24-mobile.jpg).

### C25 — Earlier business-growth variant

- Exact URL: https://efe865f2.vitaflex.pages.dev/
- Environment: **production** (historical production snapshot, not falsely labelled a preview).
- Deployment ID: `efe865f2-24f1-42bb-be99-4591e2079eb6`
- Recorded commit: `c09ed8092928d6a5f5b3d506871832f274353094`
- Created: `2026-10-02T21:17:13.610244Z`
- Headline: **Your business is good. Is your digital presence?**
- Screenshots: [desktop](evidence/screenshots/C25-desktop.jpg) · [mobile](evidence/screenshots/C25-mobile.jpg).

### C19 — Initial corporate venture website

- Exact URL: https://f716da59.vitaflex-monte-wo.pages.dev/
- Environment: **preview** (actual preview deployment).
- Deployment ID: `f716da59-39ef-4914-a12c-7bb91bf8ea81`
- Recorded commit: `8c781f3279071d68538f788bcfd965d05da460d4`
- Created: `2026-10-27T18:28:19.855355Z`
- Headline: **We Build Ventures. We Create Possibilities.**
- Screenshots: [desktop](evidence/screenshots/C19-desktop.jpg) · [mobile](evidence/screenshots/C19-mobile.jpg).

### C03 — Later minimal corporate portfolio preview

- Exact URL: https://dac37e01.vitaflex-monte-wo.pages.dev/
- Environment: **preview** (actual preview deployment).
- Deployment ID: `dac37e01-f4c3-4b44-8b3d-561edbc1424c`
- Recorded commit: `d85ea390f38dcdc9631b347116d8ea7684fce278`
- Created: `2026-11-07T22:28:46.936893Z`
- Headline: **Beyond the obvious.**
- Screenshots: [desktop](evidence/screenshots/C03-desktop.jpg) · [mobile](evidence/screenshots/C03-mobile.jpg).

The gallery also includes the remaining earlier business-growth variants C26–C58, other portfolio previews and the current rejected family for comparison only. They differ in content and/or local CSS/JavaScript hashes. Some older Cloudflare uploads supplied no commit reference; those are explicitly marked unavailable, never invented.

## Comparison with the rejected production version

| Aspect | Current rejected production | C24/C25 earlier business-growth family | C03 portfolio preview | C19 initial corporate site |
|---|---|---|---|---|
| Hero | “Your business is good. Is your digital presence?”; large VF logo | Same headline, different original hero treatment, assets and layout | “Beyond the obvious.”; VF logo | “We Build Ventures. We Create Possibilities.” |
| Corporate journey | Presence gap → ten-question self-assessment → method → six package cards → about → portfolio → contact | Existing services/customer problems, business assessment, business-growth system, product/customer/market/marketing/performance/opportunity and business-fit sections | Minimal corporate identity and venture portfolio | Corporate purpose, ventures, approach, group identity and contact |
| Source assets | `/group.css`, `/business.css`, `/business.js` | Existing `css/vitaflex.css`, `/css/flex.css`, `/css/hero-fx.css` and original JS assets | `/group.css` | Earlier `/group.css` |
| Sony link in inspected homepage source | Two links (about + bottom footer), not the requested single bottom entry | No Sony link found in inspected original source | One bottom footer link | No Sony link found in inspected original source |
| New personal-content cards | Not added during recovery | Existing content preserved in screenshots; no new cards added | None added | None added |

The shared headline does **not** make C24/C25 equivalent to the rejected current implementation. Their actual layouts, sections and assets are different. They must not be rebuilt using the current self-assessment implementation.

## Actual production observed during recovery

- Owning project: `vitaflex`.
- Recorded current deployment: `ac0b5b50-f87e-487b-8676-776289e9f552`; https://ac0b5b50.vitaflex.pages.dev/ .
- Recorded current revision: `e02f5b911ce540cff854ad1b6203a9f05e5776b5`.
- The actual production homepage's HTML hash and local-asset/body fingerprint match comparison screenshot family **C01**. This identifies the rejected source accurately without treating it as the restoration reference.
- API observation time: `2026-11-07T22:53:18.370Z`. Apex/www still return Cloudflare 403 challenge responses to the inspection runner; the Pages production origin returns 200. This recovery does not claim desktop/mobile custom-domain verification, change zone security or conceal that blocker.

## Preservation and your required structure

The restoration acceptance constraint is recorded exactly:

1. Corporate homepage follows the **selected approved preview**, not a new concept.
2. A **single Meet Sony Alexis entry at the very bottom** opens the separate biography page.
3. Below the biography: **PERSONAL REFLECTIONS & RESOURCES**, with separate Daily Devotion, The Three Daily Wins and Blog links/pages.
4. No personal-resource cards on the corporate homepage.

No Sony content or local CMS work was changed or deleted. The current Sony page and inspected C03 Sony snapshot do not contain the named reflections section or the Daily Devotion/Three Daily Wins links. No matching implementation was found in the scoped tracked Sony/homepage history search either. This does not establish that another preview never contained them. Their exact source must come from the preview you identify; no invented resource URLs, new content or replacement pages have been created.

Selecting an old whole-site rollback blindly could remove newer Sony work. Restoration must use the selected corporate snapshot while preserving the Sony pages and protected product/customer routes, with an explicit comparison before publication. It must not deploy a separate MONTE WO project, change infrastructure, expose secrets or overwrite the approved immutable preview.

## Inspection scope and limitations

- 365 deployment records inspected across `vitaflex` (134), `vitaflex-monte-wo-live` (31), and `vitaflex-monte-wo` (200; capped at eight 25-record pages). This is not a claim that every older deployment in that last project was enumerated.
- 58 successful corporate-text-containing HTML/local-asset hash groups found. Nine groups are actual MONTE WO product presentations; the main corporate gallery excludes them. **49 corporate groups** remain for owner review, including the rejected current family for comparison.
- Only Cloudflare GET requests and ordinary public browser navigation were used. No Cloudflare configuration writes, rollback, provisioning or production publication was performed.
- Recovery/evidence commits may trigger the repository's pre-existing automatic PR-preview integration. Those are new immutable preview snapshots, not a production restoration or a deletion/overwrite of any historical immutable URL. Do not use the mutable branch alias as the historical reference.
- A deployment existing or previously passing tests is not evidence of your approval. Historical commits shown are Cloudflare's recorded source references, not a claim that every old commit is present in this checkout.

## Required decision

**Which exact URL or candidate ID matches the version you approved?** If none matches, supply the original Arena/Cloudflare preview URL or a screenshot of that approved preview. No production restoration will be guessed.


## Completed recovery evidence checks

- Inventory [run 42422653226](https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42422653226) succeeded; saved metadata/public captures to the fixed session branch.
- Scroll-revealed capture [run 42423238366](https://github.com/vitaflexl4-ai/monte-wo/actions/runs/42423238366) succeeded: **49 corporate source groups, 98 desktop/mobile screenshots, zero capture errors**. The full inventory also retains non-corporate product records, explicitly excluded from the corporate gallery.
- Main starting points C24, C25, C19 and C03 have no measured horizontal overflow at the captured widths. Historical French C40 has mobile overflow; it was recorded, not silently redesigned. Captures do not establish every interactive/backend feature works.
- Actual C24 screenshot visually inspected: existing orbital hero, original service/growth sections and navigation are captured after ordinary scrolling, not hidden by scroll-reveal effects.
- Application paths `public/`, application content and build sources remain unchanged against pre-recovery commit `e173dda`; Sony biography and all original work remain intact. Only recovery scripts/workflow and documentation/evidence have changed.
- Production remains the rejected revision recorded above. No restoration success or live custom-domain acceptance is claimed.
