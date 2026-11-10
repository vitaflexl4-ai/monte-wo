# Sony Alexis portrait update

**Local preview only; no push or deployment for this revision.**

## Selection

Hero: supplied `Black and Gold Executive Portrait.png` (1184 × 1328), used without facial edits, retouching, compositing or added typography. Responsive WebP variants at 480, 768 and 1184px preserve its proportions; approximately 16/34/74KB. Mobile source sizing accounts for the cover-image rendered width rather than just the viewport. Mobile framing reserves the existing header and gives the face breathing room above the copy; no content or new sections added.

Secondary: top-left panel from `Cinematic Luxury Portrait Collection.png`, individually extracted as a 765 × 505 landscape portrait, approximately 23KB WebP. Used only in the existing philosophy photograph location. No collage is displayed as a website photo.

Sharing image: 1200 × 630 photo-only crop of the supplied standalone portrait, approximately 87KB JPEG. No new text, logo, watermark or face alteration. Existing SEO title/description and biography unchanged.

## All collage portraits extracted

15 individual portrait files under `portraits/`, from all three supplied collages. Crop coordinates, dimensions and SHA256 source hashes are recorded in `extraction-manifest.json`. Crops stay inside white dividers; top panels in the first collage exclude the existing monogram/tagline areas. Existing clothing details/logos are not digitally retouched. No generative imagery tools used.

Only selected assets are added under public/assets/sony; the full extracted library stays in this review folder, not a new website gallery. Original older assets remain untouched for historical/rollback compatibility. New filenames prevent old image-cache collisions on any future release.

## Changes

- `content/sony/profile-media.json`: selected assets, alt text, dimensions, focal point, responsive source sizing, social image.
- `scripts/prepare_sony_portrait_designs.py`: optional Pillow authoring tool for reproducible panel extraction and optimized selected assets, no production dependency. Run with the source-upload directory as its argument.
- `scripts/founder_page.py`: honor optional configured hero sizes; no text or structure changes.
- `public/sony/profile.css`: mobile-only portrait framing to preserve hairline and balance image/copy.
- `public/sony/index.html`: regenerated image attributes/social references only.
- Five new optimized public image files; review gallery, 15 extracted portraits, evidence/screenshots in this folder.

## Verification

Build PASS; scoped tests **50/50 PASS**. Profile browser checks PASS at **eight layouts** (320, 390, 600, 768, 844 landscape, 1024, 1440, 1920), including actual decoded portraits, navigation and return journeys, full verbatim biography, preserved four anchors, keyboard/mobile menu, no-JS/reduced-motion, no overflow, broken links or page errors.

All tracked existing public files compared against HEAD: only Sony profile HTML and its mobile portrait framing CSS changed. Corporate homepage, remaining venture pages, product pages, book HTML/CSS/JS and navigation are byte-identical. Original biography data and all visible wording are unchanged. Actual desktop/mobile screenshots visually inspected; no claim of real-device Safari certification or production verification.

No provisioned services, private CMS, connected-app writes, DNS/security changes, push or deployment. Await approval for a separate guarded VitaFlex release. Production remains on the previously published book-navigation revision until then.
