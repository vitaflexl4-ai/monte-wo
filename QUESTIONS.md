# MONTE WO — Owner Decisions and Approvals

Updated: 2026-10-23

These items require Sony's decision or approval. Development should continue on unblocked work while they remain open.

## Open questions for Sony

### Q1 — Authentication method (P2)
**Question:** Which sign-in method should MONTE WO use?
- **Recommended for consideration:** emailed sign-in link as the initial method, with passkeys considered as an additional option after the first secure flow is reviewed. This is a proposal, not a decision.
- The implementation will remain behind a local mock server and `AuthAdapter` until approved. No production authentication or real accounts will be created.
- Design review must cover short-lived single-use links, session rotation/expiry/revocation, rate limits, abuse monitoring without credentials, Turnstile placement, adult-only eligibility (18+), and safe account recovery.

### Q2 — Official ranking standards (P0/P3/P5)
**Question:** When will the discipline threshold tables and judging protocols be approved?
- **Recommended:** keep every lift at “Assessment pending” until thresholds are researched, tested and explicitly approved.
- Do not change the ranking engine, threshold tables or evidence storage. Do not show sample ranks or fabricated results to users.

### Q3 — Creole and French copy (P7)
**Question:** Who is the native-speaker reviewer for Haitian Creole and French?
- **Recommended:** keep `name_ht` fields empty and do not ship machine-translated strings. English strings can be organized in a translation file while approvals are pending.

### Q4 — Legal pages and privacy language (P6/P8)
**Question:** Who will approve privacy, terms, account deletion, data export and store data-safety wording?
- **Recommended:** prepare drafts only; do not represent them as legally approved.

### Q5 — Apple and Google developer accounts (P8)
**Question:** Have the owner-created Apple and Google developer accounts and organization details been finalized?
- **Recommended:** prepare release assets and listing drafts without publishing, creating accounts, paying fees or uploading store builds.

### Q6 — Public website origin / download route (P9)
**Question:** What confirmed public origin should be used for the download page and `/downloads/android.json`?
- **Recommended:** do not fabricate a permanent domain, APK URL, version, checksum, availability status or download button. Keep any download route honest until an artifact is signed, verified and explicitly approved.

### Q7 — Missing onboarding source folder (P1)
**Question:** The repository tree does not contain the requested `monte-wo-onboarding/` folder. Can Sony add it to the repository or provide the intended source asset bundle?
- **Recommended:** use the supplied source assets as-is once present; do not fabricate onboarding artwork or replace the official transparent blue/red logo.

### Q8 — Canonical Android application ID (P8)
**Question:** Confirm the permanent Android application ID before any release build. Current `app.config.ts` says `com.vitaflex.montewovitaflex`, while prior project notes refer to `com.vitaflexbusinessgroup.montewo`. These identifiers are not interchangeable after publishing.
- **Recommended:** resolve ownership/package identity with Sony before creating or publishing any release build. No build has been started as part of this work.

## Owner-only checklist
- [ ] Approve ranking thresholds and judging protocols.
- [ ] Choose authentication method.
- [ ] Create/confirm Apple developer account.
- [ ] Create/confirm Google Play developer account.
- [ ] Approve Haitian Creole text.
- [ ] Approve French text.
- [ ] Approve legal pages and privacy/data-safety answers.
- [ ] Confirm public website origin and release-download details.
- [ ] Supply or commit the missing `monte-wo-onboarding/` source folder.
- [ ] Confirm the canonical Android application ID.

## Guardrails
- Adults 18+ only; collect minimum necessary data.
- Never log, store or send passwords to analytics; never commit secrets.
- No production deploy, remote migrations, store builds, publishing, spending or real account creation.
- No machine translation. Keep unapproved `name_ht` values empty.
- Never change the ranking engine, rank thresholds or evidence storage as part of the backlog.
