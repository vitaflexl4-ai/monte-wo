# Public venture launch hold — published

Homepage #ventures and all four existing /ventures/ detail routes now show only a generic Launching soon holding treatment. No individual venture names, details, product links, forms, email addresses or signup. Original venture registry/template assets retained for future restoration. This is a public content curtain, not password authentication or a security boundary. Existing product/customer routes, Sony biography, personal book and all other public files remain unchanged (hash-pinned preservation test).

Source changes: scripts/venture_lock.py, scripts/build_group.py, site/group/portfolio.css. Generated output produced with npm run build. Holding-page title/description metadata uses neutral numeric identifiers to remain distinct without naming products. No full redesign of homepage hero/header/footer.

Production revision: efd58a446f1e332b0f01f8757fa8944e367522f0
Live: https://vitaflex.pages.dev/#ventures
Immutable: https://66efe09c.vitaflex.pages.dev/
Workflow: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/43909755945 — SUCCESS.

Four targeted unit tests pass, including all-other-public-file hash preservation and Sony approved-copy/layout validation. New locked-state browser suite passes local, hosted preview and production at five widths, every venture route, names/details/signup absence, no overflow, focus, no-JS, exact Sony text and actual book-to-portfolio journeys. All 56 URLs/metadata audit passes. Private API protection, exact product/book/policy bytes verified hosted preview and production.

Existing chapter-gallery/announcement legacy tests describe the superseded visible-ventures design and are not evidence of the locked state. A dedicated release workflow runs the new locked-state and preservation checks; publisher auto-selects these only when generated homepage includes launch-hold. Existing exact production baseline, domain/binding preservation, hosted-preview gate and revision guard retained.

Initial attempt 43909525762 stopped before publication on duplicate holding metadata. Fixed neutral per-page metadata; second release fully passed. No provisioning, DNS/security changes, database migrations or challenge bypass. Custom domain still challenges automated probes; success verifies the domain-owning pages.dev production origin. The personal book and biography may still mention ventures, as they were not changed by this portfolio/detail-page request.
