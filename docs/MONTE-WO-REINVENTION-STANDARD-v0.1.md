# MONTE WO Reinvention — Product and Ranking Standard v0.1

Status: owner-authorized redesign proposal; numerical cutoffs are proposed for review, not yet implemented in the production ranking engine.
Owner authorization: On 2026-10-23, the product owner instructed the team to reinvent the ranking standards and app experience ("we approve the ranking standard"; "please reinvent"; "ok cook").
Scope: Four independent disciplines: Barbell Squat, Barbell Bench Press, Barbell Deadlift, Strict Biceps Curl. Nine ranks: Debitan, Bati, Solid, Fô, Avanse, Mèt, Chanpyon, Titan, Lejand.

## Product principles
1. Ranks represent demonstrated strength in a specific lift, not attendance, streaks, XP, account age, body composition, or social popularity.
2. Every lift is ranked independently. No composite overall rank in this version.
3. The same evidence and judging standard must apply to all athletes; rank eligibility should account for body mass and sex category only after the owner approves the exact policy and the app can collect the minimum required data safely.
4. A rank is earned only from a valid performance, never from an estimate alone. Estimated 1RM may help training but cannot qualify for verified rank.
5. Every rank has explicit technical standards, valid equipment rules, evidence requirements, and a review/appeal path.
6. Keep verified, self-reported, and estimated results visually distinct. A self-reported result can display progress but must never appear as verified.
7. No made-up athlete records, rankings, leaderboards, benchmarks, or success metrics.
8. No rank labels are awarded by default. Existing records must not be silently re-ranked when rules change; version and preserve the standard used for each decision.

## The nine-rank ladder
1. Debitan — first validated standard.
2. Bati — foundational strength.
3. Solid — consistent, established strength.
4. Fô — strong intermediate performance.
5. Avanse — advanced performance.
6. Mèt — exceptional performance.
7. Chanpyon — high-level performance.
8. Titan — elite performance.
9. Lejand — the highest and rarest distinction.

The names describe progression only. They do not themselves define the kilograms needed.

## Standard-setting method
Do not insert arbitrary kilograms or percentages directly into application code. Create a versioned, reviewable standards dataset. For each discipline, use a body-mass-relative performance measure (load / athlete body mass) as the baseline, then validate whether one simple ratio is fair enough across body-mass ranges. If not, use a documented, independently reviewable interpolation model with tests and published limits. Do not invent sex categories or formula coefficients: owner approval is required before final values become official.

For the initial candidate table, establish nine strictly increasing performance cutoffs per discipline. Require:
- monotonic cutoffs (each higher rank strictly exceeds the previous one);
- sensible gaps that widen at the high end so Titan and Lejand are genuinely rare;
- no cross-discipline inference (a squat result cannot grant a deadlift rank);
- explicit supported units and deterministic kg/lb conversion;
- exact rounding policy and boundary tests;
- validation against reputable, current strength-sport standards and a documented rationale before release.

The numerical table is deliberately NOT embedded in this v0.1 document because external benchmark validation and final fairness policy have not yet been completed. The owner authorized redesign, not fabrication. The app can be rebuilt fully while the candidate data set is developed.

## Discipline-specific judging
### Barbell squat
- Standardize bar position, depth target, start/finish position, and rack/safety rules.
- Require hip crease below the top of the knee as the proposed minimum depth; capture side-angle evidence where verification is requested.
- No spotter assistance, downward movement after ascent begins, or failure to regain stable standing position.
### Barbell bench press
- Standardize rack, grip limits, touch point, pause, foot placement, and lockout.
- Proposed valid rep: controlled bar contact with torso, visibly motionless pause, then full elbow lockout without spotter assistance.
- No bounce, heave, spotter touch, or incomplete lockout.
### Barbell deadlift
- Standardize stance, grip options, bar start, and finish.
- Require knees and hips extended with shoulders behind or aligned to the bar and controlled completion.
- No hitching/resting bar on thighs, ramping, downward bar movement before lockout, or outside assistance.
### Strict biceps curl
- Define the apparatus (straight bar or EZ bar) and grip; do not mix curl apparatus records.
- Require upper back and buttocks against a wall or approved strict bench setup, elbows held in a defined position, full extension at the bottom, and controlled curl to the specified top position.
- No hip drive, torso swing, knee drive, or shoulder roll to complete the rep.
- Because curl judging is less standardized across federations, require explicit video review for verified curl ranks.

These are proposed technical standards. A final judging handbook must specify exact setup measurements, rep definitions, video angles, permitted equipment, and exception handling before official verification begins.

## Evidence and verification
- Training logs and estimated 1RM are training features, not rank evidence.
- Candidate evidence record: discipline, load, unit, athlete body mass at test, date, equipment/method, standard version, evidence media reference, reviewer decision, and audit trail. Store only necessary data; never store passwords in evidence or logs.
- For self-reported attempts, show “Self-reported” and “Not verified.”
- For verified attempts, require an authorized review process and a clear audit record. Do not claim independent federation certification.
- Rejections must give a neutral reason and allow resubmission/appeal.
- Standard updates are versioned; do not silently downgrade or upgrade existing ranks.

## App experience to build
### Home
- Premium training dashboard: clear greeting, current training goal, next action, recent workout, weekly training volume derived only from actual saved sessions, and four discipline cards.
- Each discipline card shows actual achieved status or “No result yet”; never populate with sample achievements.
### Workout
- Usable session builder: exercise search/filter, sets, reps, load and units, rest timer, notes, set completion, edit/delete, save and recovery behavior, and workout history.
- Sound and haptics independently switchable; play only after user gesture. Respect reduced motion.
### Nutrition
- Useful calculators only from user-entered data, clear units, editable inputs, transparent formula labels, and no prefilled fictional bodyweight/height/age.
- Separate calculated estimates from medical advice; no fake food-scan results or invented macros.
### Rank
- Visually compelling nine-rank ladder with a discipline switcher and clear progression visualization.
- Before numeric standards are signed off, show rank names and the standards process but do not show fabricated cutoff numbers or issue rank awards.
- After standards approval, display the next eligible cutoff, user's validated result, evidence status, standard version, and a transparent reason when not eligible.
### Identity and quality
- Keep official blue/red MONTE WO mark and tagline “Leve. Klase. Monte Wo.”
- Premium athletic visual hierarchy, intentional spacing, strong typography, purposeful charts and state-specific empty screens. No placeholder warning wall.
- Adults-only, minimal data, no password analytics/logging, no fake social proof, no unapproved Creole/French translations.

## Release gates
- Owner approves exact numerical dataset and body-mass/category policy.
- Tests prove monotonic thresholds, boundaries, unit conversion, standard versioning, evidence state separation, no estimate-only awards, and no rank inflation.
- Native screen review on supported Android device/emulator; web screenshots alone are insufficient.
- Typecheck, lint, mobile tests, and root tests reviewed; known failures tracked honestly.
- No production deployment, migration, app-store release, real-account creation, or spending without separate explicit approval.
