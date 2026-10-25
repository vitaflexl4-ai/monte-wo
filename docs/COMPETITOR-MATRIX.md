# MONTE WO — Living Competitor Matrix

**Research date: 2026-10-24** · Cadence: quarterly, or on a major competitor release — batched research only, never continuous crawling (zero-cost rule).
**Machine-readable source:** [`content/intelligence/competitors.json`](../content/intelligence/competitors.json) (rendered in the Intelligence Command Center's TITAN view).

Rules used for this research:
- **Verified** = read on official pages, store listings, or help centers of the vendor.
- **Reviewer-opinion** = credible third-party reviews; labelled as opinion, not fact.
- **Marketing** = vendor claims we could not independently verify.
- No access controls bypassed, no private user data collected, no proprietary code/artwork copied.
- The most feature-rich app is **not** treated as the best model — only lessons that genuinely fit MONTE WO's identity (independent, effort-earned ranks with transparent standards) are recommended.

## Matrix (researched 2026-10-24)

| Dimension | Hevy | Strong | Boostcamp | StrengthLog | StrongLifts 5x5 | MONTE WO position |
| --- | --- | --- | --- | --- | --- | --- |
| Set-recording speed | ~2 taps/set, previous values prefilled, auto rest timer *(verified)* | Fast, minimalist; "arguably fastest on the market" *(reviewer-opinion)* | RPE/RIR per set, supersets free *(verified)* | Auto timer, import previous sets *(verified)* | Log from notification, phone locked *(verified)* | Recording is the core loop — keep it minimal-tap with previous performance visible |
| Next-action clarity | Rest timer notifies next set *(verified)* | Rest timer | Progression pre-written into programs; Auto-Progression is Pro *(verified)* | Quick-stats (rep-PR at weight); progression left to lifter *(verified + reviewer gap)* | Plans every set/weight; zero decisions *(verified)* | Show the athlete the next set, weight, and verification step explicitly |
| Onboarding friction | Empty workout or routine start *(verified)* | Free forever, unlimited logging day one *(verified)* | Program finder by goal/level/equipment/days *(verified)* | Free logging, no ads *(verified)* | Guided, starts light — but subscription required *(verified)* | Low-friction start; rank standards published up front |
| 1RM / progression / history | Per-exercise graphs, PR alerts; 3-month history cap on free *(verified)* | 1RM calc free, charts Pro; "never locked out" of data *(verified)* | Live PR flags, estimated 1RM free *(verified)* | 1RM + PR warm-up + IPF/Wilks/Sinclair calculators free *(verified)* | Graphs + history; access tied to subscription per user reports *(verified + reviewer)* | Estimated 1RM always labelled estimated; verified results only from evidence |
| Ranking transparency / verification | Exercise leaderboards, social *(verified)* — unverified claims | none | Strength Score 0-100 (DOTS-based, self-entered) *(verified)* | IPF/Wilks + Sinclair calculators — transparent formulas, self-entered *(verified)* | none | Percentile-style tiers over **verified** performances; provisional/estimated/verified kept distinct — matches the OpenPowerlifting-ecosystem gold standard |
| Offline / low-bandwidth | Reviewer: offline OK, syncs later | Reviewer: local-first, reliable in poor signal *(verified behavior, reviewer framing)* | not documented | not documented | Reviewer: fully offline | Local-first storage + ETag/304 caching (TITAN backlog) — our athletes train on unreliable connections |
| Accessibility | not documented | not documented | not documented | not documented | not documented | accessibilityLabel on 100% of controls (shipped 2026-10-24); no competitor documents this — an area to lead, not follow |
| Free-tier limits | Unlimited logging; 4 routines, 7 custom exercises, 3-month history *(verified)* | Unlimited logging; 3 routines *(verified)* | 14,000+ programs free, builder uncapped, no ads *(verified)* | Unlimited everything basic, no ads, unlimited routines *(verified)* | None — subscription required to use at all *(verified)* | Free access to personal history and rank standards forever; no ads |
| Paid tier (US, 2026) | $2.99-3.99/mo; $74.99 lifetime | $4.99/mo; $99.99 lifetime | $59.99/yr | ~annual only (~$109/yr per reviews) | $11.99/mo; $199.99 lifetime | $0 — no paid tier; mission-funded |
| Complexity | Social feed + marketplace features | Minimal | Large program library | Mid | Single program, minimal | Prefer removing complexity (TITAN mandate) |
| Privacy | Account + social feed | Account sync optional | Account | No ads, optional Health sync | No ads | Telemetry consent-gated, aggregated, bounded enums only |
| Operating cost model | Subscription | Subscription | Subscription + paid programs | Subscription | Subscription | Cloudflare free tier + static pages (see docs/INTELLIGENCE-COMMAND-CENTER.md) |

### Ranking-platform reference (why our model is credible)

The OpenPowerlifting ecosystem is the reference for understandable strength standards: percentile tiers computed over **judged competition results** (median = intermediate, top 20% = advanced, top 5% = elite, top 1% = world class), CC0 public-domain data, 3.5M+ meet entries across 100+ federations. Sites built on it (FitnessVolt, Powerlifting Records, Lift Vault) **never blend** verified competition data with self-reported gym numbers, and label both populations with source and sample size — because self-reported data runs higher (Strength Level alone holds 195M+ community-submitted lifts since 2015).

**Lesson adopted:** MONTE WO keeps provisional, estimated and verified results distinct for the same reason, and publishes its standards openly.

## Top recommendations (only lessons that fit MONTE WO)

1. **Minimal-tap recording with previous performance visible** — the category bar (Hevy, StrongLifts). Fewer taps on the core loop = more complete verification evidence.
2. **Explicit next-action clarity for athletes** — StrongLifts/Boostcamp remove decisions; our intelligence agents already model `nextAction`; apply the same to athlete flows (next set, next weight, next verification step).
3. **Never lock history or verification evidence behind payment** — StrongLifts' subscription wall (and reported history lock-in) is the most-cited trust damage in the category; Strong's opposite promise is a selling point. Our rank record of effort must stay accessible.
4. **Keep provisional/estimated/verified distinct** — confirmed as the credible model by the OpenPowerlifting ecosystem.
5. **Offline/low-bandwidth first** — local-first storage, sync when connected, ETag/304 caching, small payloads. Directly relevant to where our athletes train.
6. **Generosity is a viable long-term position** — StrengthLog and Boostcamp prove free-first builds loyalty; aligned with our mission and $0 budget.

**Deliberately NOT emulated:** social feeds / unverified gym leaderboards (Hevy), AI-generated adaptive programming (Fitbod/Jefit — costly and unauditable), paid-exclusive program marketplaces (Boostcamp Pro). None fit effort-earned, verified, transparent ranks.

## Source register (all accessed 2026-10-24)

- Hevy — official features, help centre 2026 guide, App Store listing: hevyapp.com/features, help.hevyapp.com (art. 33106320824727), apps.apple.com id1458862350; reviews: aitoolsbakery.com, sensai.fit, whistleout.com
- Strong — official site + App Store listing: strong.app, apps.apple.com id464254577; reviews: repreturn.com, sensai.fit, alphaprogression.com
- Boostcamp — official site/features/programs/beginners/free-workout-app/vs-stronglifts pages (Oct 2026 updates)
- StrengthLog — official site + training-programs page + Google Play listing; review: steelrep.app (comparison table)
- StrongLifts — official app page + own App Store/Google Play listings (subscription terms stated by vendor)
- Ranking platforms — powerliftingrecords.com (standards tool), fitnessvolt.com (standards + free data API page), strengthlevel.com (self-reported standards, own admission of community-submitted data), liftvault.com, howstrong.info, openpowerlifting.org

## Research log

| Date | Scope | Researcher | Notes |
| --- | --- | --- | --- |
| 2026-10-24 | Initial matrix: Hevy, Strong, Boostcamp, StrengthLog, StrongLifts + ranking platforms | Arena agent (session) | Official sources prioritized; store listings used for pricing/free-tier terms; reviewer opinions labelled |
