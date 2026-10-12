# Monte Wo official rank artwork

## Source and processing

The nine numbered PNGs were supplied by the user as the official Monte Wo ranks. Originals are retained byte-for-byte in `brand-assets/ranks/`. `scripts/build_ranks.py --assets` crops the emblem area, removes near-black background with an alpha mask, and fits it into a transparent 288×288 lossless WebP. It does not redraw, recolor, borrow another tier’s symbol, or invent missing pixels.

**Source limitations:** Chanpyon, Titan and Lejand have cropped-off upper portions in the supplied PNGs; those portions remain absent. Transparent padding preserves their placement without pretending to restore the source. Some source edge clipping and colored glow/background remain. Complete source artwork can replace the crop later, without changing the canonical rank identity or consumers.

## Canonical identities

| Rank | Pwen Fòs | Accent | Supplied source | Web emblem |
|---|---:|---|---|---|
| Debitan | 1–199 | `#c1c9d3` | `01_Debitan.png` | `/assets/ranks/debitan.webp` |
| Bati | 200–299 | `#efa55e` | `02_Bati.png` | `/assets/ranks/bati.webp` |
| Solid | 300–399 | `#a0ceff` | `03_Solid.png` | `/assets/ranks/solid.webp` |
| Fò | 400–499 | `#4aaaff` | `04_Fo.png` | `/assets/ranks/fo.webp` |
| Avanse | 500–599 | `#2bdcde` | `05_Avanse.png` | `/assets/ranks/avanse.webp` |
| Mèt | 600–699 | `#bb71fa` | `06_Met.png` | `/assets/ranks/met.webp` |
| Chanpyon | 700–799 | `#ffac45` | `07_Chanpyon.png` | `/assets/ranks/chanpyon.webp` |
| Titan | 800–899 | `#ff4055` | `08_Titan.png` | `/assets/ranks/titan.webp` |
| Lejand | 900–1000 | `#f7d354` | `09_Lejand.png` | `/assets/ranks/lejand.webp` |

`public/ranks.json` owns this mapping. `public/ranks.js` is generated from it, with helpers from `scripts/rank-helpers.js`. `scoring.js` uses the same rank lookup; page generators also read this source. Mockup containers declare their score, not a separately hardcoded rank. Switching languages retains proper rank names and the corresponding images.

## Offline and portable review

Service worker cache v7 includes all nine emblems plus the rank module and metadata. The portable exporter embeds the same assets once in a shared data-URI map and passes it into each local page. Static rank-page images are embedded too. No external image fetch is needed. The export routes calculator button clicks through validated local submit handlers because the viewer’s outer sandbox does not allow native form submission; this does not send forms to a network endpoint. Waitlist collection remains disabled in the portable review.

The rank artwork update does not validate the provisional strength-scoring formula or turn the coming-soon app into an operational account/logging system.
