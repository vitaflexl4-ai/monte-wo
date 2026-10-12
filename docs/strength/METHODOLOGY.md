# MONTE WO Strength Index™ — methodology and calibration protocol

**Status: DRAFT — NOT OFFICIAL. No production threshold is approved.**
Operator: VitaFlex Business Group. Brand: **MEASURE. PROVE. EARN. CLIMB.** Motto: **LEVE. KLASE. MONTE WO. / LIFT. RANK. CLIMB HIGH.** The ™ notation identifies a proposed mark; registration is not claimed.

## Scope and rank meanings

Four independent launch disciplines only: Barbell Squat; Barbell Bench Press; Barbell Deadlift; Strict Biceps Curl. No combined score or overall rank. Debitan → Bati → Solid → Fò → Avanse → Mèt → Chanpyon → Titan → Lejand. Even Debitan requires its threshold; merely creating an account earns nothing. Rank is a statement of strength, not worth, persistence or personality.

The user’s exact rank identities and existing artwork are preserved. The retired demo’s numeric bands and allometric constants have been archived under `retired-demo/`, removed from public rank metadata and removed from the homepage award calculation. Saved demo inputs are not migrated into athlete achievements.

## Evidence review performed

- OpenPowerlifting describes an open competition archive and public-domain competition data: https://openpowerlifting.gitlab.io/opl-csv/. The bulk-download page was inspected, not downloaded or analyzed: https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html. Its reported snapshot was 2026-10-09. This is a candidate source for squat/bench/deadlift, **not** a representative beginner/gym population, not a strict-curl dataset, and not a set of MONTE WO thresholds. Preserve snapshot digest, federation rules and data provenance. Do not equate a federation’s tested flag with proof that every athlete was drug-tested at every performance.
- IPF 2026 technical-rule listing was inspected as a judging reference: https://www.powerlifting.sport/rules/codes/info/technical-rules. Our rulebooks are original draft product specifications; no IPF approval or equivalence is claimed. Different sumo/conventional, raw/equipped, paused/touch-and-go and bar variants are not merged indiscriminately.
- Fahey’s 2026 study describes exercise- and sex-specific allometric normalization in a sample of 203 college-aged adults and explicitly limits its findings to within-sample comparisons. This motivates testing fitted rather than presumed exponents; it is not external validation of our ranks. [3](https://link.springer.com/article/10.1007/s00421-026-06276-9)
- Evidence about predicting 1RM is protocol-specific. The biceps-curl/RPE study used a different prediction approach and does not establish Epley validity for our wall-strict variation. [3](https://pmc.ncbi.nlm.nih.gov/articles/PMC3761544/)
- The squat estimation research inspected reported dependence on repetition count and prediction equation; no single exercise/repetition formula was adopted as universally accurate. [1](https://opensiuc.lib.siu.edu/cgi/viewcontent.cgi?article=1744&context=gs_rp)

No raw real-world calibration data were ingested, no population model was fitted, no professional judging panel convened, and no official validation was completed. Synthetic tests below measure software behavior, not athletic validity.

## Computational format implemented — not a validated model

`bodyweight-lookup-v1` supports separate sex-reference and non-overlapping age categories, each containing increasing bodyweight nodes and **nine positive, strictly increasing required performance loads at every node**. All loads are integer micrograms. Between adjacent bodyweights, each rank’s required load is interpolated exactly as a rational number:

`T(w) = T(a) + [T(b) − T(a)] × (w − a) / (b − a)`.

Outside the validated node interval or an explicit category: unsupported, no rank; no extrapolation. No arbitrary universal ratio or 2/3 exponent remains. This table format can encode an approved monotone conditional curve, but choosing interpolation itself requires validation before publication. Changing a scientific model beyond the supported format requires an explicitly versioned engine change and new tests, not reinterpretation of old results.

Qualifying tested single = exact entered load. “Tested” does not prove a true maximal attempt. Optional Epley estimates use the exact rational `load × (30 + reps) / 30`, but only if that model approves Epley and its own repetition range (software ceiling 10, not a scientific claim). All four bundled models have `estimate: null`. No estimated rank is approved. The separate educational 1RM tools remain educational and cannot write rank records.

Conversions use exact 1 lb = 0.45359237 kg; input decimal strings accept three decimal places. Eligibility uses integer cross multiplication of rational values, never display rounding. The profile/bodyweight unit is separate from load unit. Range limits (adults 18–100, bodyweight 30–350 kg, loads up to 1000 kg) are defensive software support limits, not approved population boundaries or exercise safety limits.

The highest eligible threshold is found independently for each discipline. Invalid/incomplete form attestation is rejected. Rejected/flagged evidence blocks eligibility. Self-report can never prove actual form: provisional requires explicit athlete attestation and remains labeled self-reported; verification requires a separate reviewer.

## Required calibration work before approving any table

1. **Pre-register scope:** target age/sex populations, health/sport context, each exact variation, equipment, outcome (actual single vs estimate), measurement tolerances, validity rules and intended rank meanings. Define Titan/Lejand as defensibly exceptional without arbitrary quotas. Do not pick cutoffs merely to produce attractive distributions.
2. **Acquire evidence:** licensed, provenance-tracked competition data for relevant powerlifts plus representative, consented training-population data including beginners. Collect a dedicated wall-strict curl cohort. Record invalid, missing and excluded observations; do not treat absences as zero lifts.
3. **Resolve repeated athletes:** source-resolved pseudonymous identifiers, not names as infallible IDs. Predefine best/current observation policy and split **by athlete**, preferably with a time and external-site holdout. Do not leak the same athlete across train/test.
4. **Compare normalization:** absolute loads within supported strata; simple ratio baseline; fitted discipline/sex allometry; flexible conditional bodyweight curves. Test residual dependence on bodyweight and age, subgroup calibration, uncertainty, performance across extreme body sizes and sensitivity to equipment/variation. A fixed theoretical exponent is a candidate for evaluation, never an unexamined default.
5. **Nine thresholds separately per discipline:** strength-domain reviewers define meaningful achievement anchors supported by data; statistics quantify distributions and uncertainty rather than dictating arbitrary top-rank quotas. Publish derivation, sensitivity and tail support for every threshold. Check gaps, smoothness at bodyweight nodes, age-boundary discontinuities, rank-order crossings and out-of-domain rejection.
6. **Estimate validation:** paired tested-single / submaximal-set data for each supported exercise, category and rep range; quantify bias and individual prediction limits, not just correlation. Either validate a conservative eligibility policy or do not permit estimated official eligibility.
7. **Judging validation:** supply real permissioned valid/invalid visual examples; multiple qualified blinded reviewers; inter-rater reliability, camera-angle/occlusion policy, load/identity/date/bodyweight evidence consistency and appeal procedure. An unclear view is inconclusive, not a pass.
8. **Independent approval:** complete data/license, calibration, holdout, bias, rank-meaning, population and limitation references; documented fitness-domain and statistical signoff; release operator checks the immutable digest; different administrator publishes. There is no approval in this repository.
9. **Monitor without manipulation:** versioned changes with reason, author, date, new validation and impact report. Never lower a standard merely for engagement. Preserve old achievements in context and require explicit reassessment under new versions.

`scripts/calibration_diagnostics.py` is an implemented exploratory harness. It checks the CSV digest/protocol, deduplicates athletes, holds out deterministic athlete groups and reports absolute/ratio/fitted-allometry prediction diagnostics. It does **not** output rank thresholds, choose a winner, certify fairness, implement external holdouts or approve a model. Synthetic tests prove harness operation only. Complete inferential analysis remains necessary.

## Progress and verification policy

MONTE Climb Scale is the within-interval fraction of exact qualifying performance between adjacent approved thresholds; the displayed integer percentage is floored. A result below the next threshold cannot round into the next rank. On reaching a new qualifying tier the next interval begins; a genuine 100% load requirement does not grant a review-gated rank without the required verification. No percentage above the highest tier or for draft/unsupported models. Percentages are not comparable across exercises.

Provisional and verified achievements are stored and displayed separately. A higher self-report cannot relabel a lower evidence-reviewed achievement as higher verified. If the load meets a review-gated tier, the highest lower tier whose self-report criteria are fully satisfied may be provisional; the higher eligibility remains explicitly awaiting verification. Numerical progress can truthfully show 100% while evidence review remains outstanding—it still cannot grant that rank. The draft policy requires review from Titan onward, but this does not define what Titan’s performance threshold is. Evidence review changes status, never numeric performance or standards. New evidence clears any old verification; prior rejection/flag holds remain until an authorized reviewer resolves them. Decisions carry a revision CAS and exact rulebook; stale calculations cannot revive a revoked verification.

## Threshold register

| Discipline | Table | Source | Thresholds | Approval |
|---|---|---|---|---|
| Barbell Squat | squat-model-draft-1 | Candidate competition + prospective cohort; no calibration performed | Empty | DRAFT — NOT OFFICIAL |
| Barbell Bench Press | bench-model-draft-1 | Candidate competition + prospective cohort; no calibration performed | Empty | DRAFT — NOT OFFICIAL |
| Barbell Deadlift | deadlift-model-draft-1 | Candidate variation-filtered competition + prospective cohort; no calibration performed | Empty | DRAFT — NOT OFFICIAL |
| Strict Biceps Curl | curl-model-draft-1 | Dedicated standardized cohort required | Empty | DRAFT — NOT OFFICIAL |

There are **zero official threshold tables**. Rules JSON files in `content/strength/` document each draft protocol. Visual examples, qualified agreement studies and scientific approval are explicit release blockers.

Profile-change scenarios evaluate the most recent submission in each discipline (at most four), explicitly labeled hypothetical. All earlier results remain immutable. This bounded operation avoids an unbounded history rewrite inside one Worker request. Current-rank projection uses a database query over latest eligible results per performance, not the truncated display-history list. The UI/API displays the latest 2,000 calculations, latest 1,000 decisions and at most 200 pilot submissions; older append-only records remain in storage.
