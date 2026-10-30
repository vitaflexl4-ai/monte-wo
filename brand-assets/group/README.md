# Official VitaFlex Business Group logo

Both PNG originals were supplied by the owner in this conversation. Retain them unchanged.

- `vitaflex-business-group-original.png`: black-background full logo, used on the corporate homepage.
- `vitaflex-business-group-tagline-original.png`: alternate textured version with “BUILD. OPTIMIZE. GROW.”; retained as an alternate, not mixed into the minimal website.

Web derivatives in `public/assets/group/` use the first original: optimized full-logo WebP, a VF-only crop for the header, and a square favicon from the same crop. No generated replacement, tracing, recoloring or typography changes. The header crop is decorative alongside the accessible group name; the full hero logo has descriptive alt text.

## Transparent PNGs

`vitaflex-business-group-transparent.png` is the full-resolution transparent derivative. Public hero/header assets are now true RGBA PNGs, not images using a blend-mode simulation. The black field, including enclosed spaces, is removed using a soft near-black alpha key; bright gold pixels are preserved. Original uploads remain unchanged. Run `scripts/prepare-group-logo.py` with Pillow to reproduce the derivatives.
