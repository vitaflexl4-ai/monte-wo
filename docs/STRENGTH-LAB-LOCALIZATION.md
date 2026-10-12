# Strength Lab: localization structure

Published locale in Step 1: **English (`en`) only**. No automatic or placeholder French/Haitian Creole translations are exposed.

- `content/lab/en.json` is the source catalog for tool titles, descriptions, formula/method guidance, form labels, results, validation errors and notices.
- `scripts/build_lab.py` reads that catalog to generate semantic static pages. It also compiles all `content/lab/*.json` catalogs into `public/lab-copy.js`.
- `public/lab.js` reads `data-lab-locale`, selects the corresponding catalog (English fallback), and uses `Intl.NumberFormat`. No result sentence is embedded in the pure calculation module.
- `public/lab-math.js` raises stable error codes, not English error messages. All validation copy is resolved in the catalog.
- Units, IDs and numeric calculation values are locale-independent. Do not translate `kg`, `lb`, field names, tool IDs or error-code keys.

## Future translation work

1. Copy the English catalog into `ht.json` and `fr.json` and have fluent reviewers translate the values, including all cautionary language. Preserve keys and numeric limits.
2. Localize the remaining static page-shell/headline/help copy in `build_lab.py` (currently English templates); keep shared branding, privacy and legal links consistent with the website. The initial structure does not claim that adding a JSON file alone translates every page.
3. Choose locale routing/selection as a separate product decision. Generate the appropriate `<html lang>` and `data-lab-locale` values. Do not silently imply that an untranslated page switched languages.
4. Decide how French decimal commas interact with comma-separated percentage lists. Keep DOM numeric input values normalized for calculations; do not change the math to parse display-formatted values.
5. Re-run all math tests unchanged, and add browser text, expanded-label, 320px, screen-reader and locale-number-format tests. Validate warnings and estimate/tested provenance in every language.

No runtime translation API or localization dependency is required. Generated copy and HTML should be rebuilt rather than hand-edited.
