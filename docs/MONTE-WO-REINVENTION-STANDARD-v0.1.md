# MONTE WO Reinvention — Product & Proposed Climb Scale Standard v0.1

**Status:** Proposed Candidate Standard v0.1 (`status: "proposed"`, `purpose: "candidate-preview"`). Official verified rank awards remain **locked** until owner sign-off and reviewer workflow activation.  
**Date:** 2026-10-23  
**Identity:** **MONTE WO** · *Leve. Klase. Monte Wo.* / *Measure. Prove. Earn. Climb.*

---

## 1. Core Principles

1. **Strength, Never Attendance:** Ranks are earned solely through demonstrated 1-rep strength under strict movement rules—never XP, streaks, workout count, or account age.
2. **Four Independent Disciplines:** Barbell Squat, Barbell Bench Press, Barbell Deadlift, and Strict Biceps Curl are ranked independently. There is no composite "overall rank."
3. **Nine Ranks per Discipline (The Climb Scale):**
   - `01` **Debitan** — The beginning. Establish a legitimate, technically sound lift.
   - `02` **Bati** — Build a consistent foundation of strength.
   - `03` **Solid** — Demonstrate dependable, repeatable performance.
   - `04` **Fò** — Show substantial strength beyond the foundation.
   - `05` **Avanse** — Reach an advanced level of strength.
   - `06` **Mèt** — Demonstrate exceptional strength and control.
   - `07` **Chanpyon** — Achieve a highly demanding strength standard *(video verification floor)*.
   - `08` **Titan** — Reach an elite level of performance *(video verification required)*.
   - `09` **Lejand** — The highest distinction; extremely difficult to earn *(video verification required)*.
4. **Bodyweight-Adjusted Fairness (`bodyweight-lookup-v1`):**
   - Linear `load / bodyweight` ratios unfairly penalize heavier athletes and under-challenge lighter athletes, while raw absolute weight tables automatically reward body mass.
   - Proposed Standard v0.1 uses damped allometric scaling across **14 bodyweight nodes** (`35, 43, 47, 52, 59, 66, 74, 83, 93, 105, 120, 140, 165, 180 kg`) compatible with `server/strength/engine.js`'s exact rational interpolation:
     $$L(W, r) = \text{round}_{0.5}\!\left(\max\!\left(L_{\min},\; A_r \cdot \left(\frac{W}{W_{\text{ref}}}\right)^{b}\right)\right)$$
     with $b = 0.67$ for Squat and Bench Press, $b = 0.65$ for Deadlift, and $b = 0.60$ for Wall-Strict Straight-Bar Curl.
   - Heavier athletes must always lift **strictly higher absolute weight**, while relative `× BW` tapers realistically across weight classes.
   - Out-of-domain bodyweights (`< 35 kg` or `> 180 kg`) and non-adult ages (`< 18`) are explicitly rejected without extrapolation.
5. **Strict Technique Gate:** Every movement rule in the discipline's MONTE Standard rulebook must be satisfied on the scored single. If any check is missed (incomplete squat depth, bounced bench, hitched/strapped deadlift, or lost wall contact on strict curl), the lift is disqualified (`status: "failed-technique"`).
6. **Verified vs. Self-Reported vs. Training Estimates:**
   - **MONTE Verified:** Locked until v0.1 thresholds receive owner sign-off and independent reviewer operations are enabled.
   - **Self-Reported (Proposed v0.1 Preview):** Athletes can track strict 1-rep singles immediately on their device, clearly badged `SELF-REPORTED · NOT VERIFIED · PROPOSED v0.1`.
   - **Training Estimates (Epley e1RM):** Multi-rep sets (`2–10 reps`) and logged workouts provide training context only and **never** award even a candidate rank.

---

## 2. Proposed v0.1 Reference Anchor Tables

Full machine-readable 14-node microgram tables live in `content/strength-proposals/climb-scale-proposed-v0.1.json` (generated deterministically by `scripts/build_proposed_climb_scale.mjs` and verified against `server/strength/engine.js`).

### Male / Open Reference Anchor (`83 kg / 183.0 lb` Bodyweight)

| Rank | Barbell Squat | Barbell Bench (Paused) | Barbell Deadlift (Conv.) | Strict Biceps Curl (Wall) |
| :--- | :---: | :---: | :---: | :---: |
| **01 Debitan** | 62.5 kg (0.75×) | 45.0 kg (0.54×) | 77.5 kg (0.93×) | 25.0 kg (0.30×) |
| **02 Bati** | 85.0 kg (1.02×) | 62.5 kg (0.75×) | 105.0 kg (1.27×) | 32.5 kg (0.39×) |
| **03 Solid** | 110.0 kg (1.33×) | 82.5 kg (0.99×) | 135.0 kg (1.63×) | 40.0 kg (0.48×) |
| **04 Fò** | 137.5 kg (1.66×) | 102.5 kg (1.23×) | 167.5 kg (2.02×) | 47.5 kg (0.57×) |
| **05 Avanse** | 165.0 kg (1.99×) | 122.5 kg (1.48×) | 197.5 kg (2.38×) | 56.0 kg (0.67×) |
| **06 Mèt** | 192.5 kg (2.32×) | 142.5 kg (1.72×) | 227.5 kg (2.74×) | 65.0 kg (0.78×) |
| **07 Chanpyon** *(Video)* | 222.5 kg (2.68×) | 165.0 kg (1.99×) | 260.0 kg (3.13×) | 75.0 kg (0.90×) |
| **08 Titan** *(Video)* | 255.0 kg (3.07×) | 187.5 kg (2.26×) | 295.0 kg (3.55×) | 86.0 kg (1.04×) |
| **09 Lejand** *(Video)* | 290.0 kg (3.49×) | 212.5 kg (2.56×) | 332.5 kg (4.01×) | 98.5 kg (1.19×) |

### Female Reference Anchor (`66 kg / 145.5 lb` Bodyweight)

| Rank | Barbell Squat | Barbell Bench (Paused) | Barbell Deadlift (Conv.) | Strict Biceps Curl (Wall) |
| :--- | :---: | :---: | :---: | :---: |
| **01 Debitan** | 37.5 kg (0.57×) | 25.0 kg (0.38×) | 50.0 kg (0.76×) | 15.0 kg (0.23×) |
| **02 Bati** | 52.5 kg (0.80×) | 35.0 kg (0.53×) | 67.5 kg (1.02×) | 20.0 kg (0.30×) |
| **03 Solid** | 67.5 kg (1.02×) | 45.0 kg (0.68×) | 87.5 kg (1.33×) | 25.0 kg (0.38×) |
| **04 Fò** | 85.0 kg (1.29×) | 57.5 kg (0.87×) | 107.5 kg (1.63×) | 30.5 kg (0.46×) |
| **05 Avanse** | 105.0 kg (1.59×) | 70.0 kg (1.06×) | 130.0 kg (1.97×) | 36.5 kg (0.55×) |
| **06 Mèt** | 125.0 kg (1.89×) | 82.5 kg (1.25×) | 152.5 kg (2.31×) | 43.0 kg (0.65×) |
| **07 Chanpyon** *(Video)* | 147.5 kg (2.23×) | 97.5 kg (1.48×) | 177.5 kg (2.69×) | 50.0 kg (0.76×) |
| **08 Titan** *(Video)* | 172.5 kg (2.61×) | 115.0 kg (1.74×) | 205.0 kg (3.11×) | 58.0 kg (0.88×) |
| **09 Lejand** *(Video)* | 200.0 kg (3.03×) | 132.5 kg (2.01×) | 235.0 kg (3.56×) | 67.0 kg (1.02×) |

---

## 3. Reinvented App Architecture

- **Home (`App.tsx`):** Athletic command dashboard with Training Focus selector, real 7-day volume & session analytics derived strictly from saved workouts, recent workout summary, 4 independent Discipline Climb cards, 9-Rank Climb Scale strip, and quick navigation.
- **Workout (`src/WorkoutScreen.tsx`):** Complete session builder with canonical movement search/filtering, quick empty-load templates, set completion checkmarks, repeat-set helper, RPE & session notes, automatic unfinished-draft recovery, built-in Rest Timer (`60s–240s` + `±15s`), and an integrated Barbell Plate & Warm-up Lab.
- **Rank (`src/RankScreen.tsx`):** Full 9-Rank Climb Scale experience across all 4 disciplines, interactive bodyweight/category target interpolation (`kg` & `lb` + `× BW`), strict movement-standard attestation checkboxes, immediate device self-reported lift tracking, and visual separation between `MONTE Verified (Locked)`, `Self-Reported (Proposed v0.1)`, and `Workout Log Estimate`.
- **Nutrition (`src/NutritionScreen.tsx`):** Native Mifflin-St Jeor BMR/TDEE & goal calculator, Strength Macro & Per-Meal Split Planner, device-local Daily Meal Macro Log (`4P + 4C + 9F`), and Bodyweight Hydration & Creatine Reference—starting with 100% blank inputs.
- **Explore (`App.tsx` / `ExerciseGrid.tsx` / `PremiumMuscleMap.tsx`):** 62-exercise catalog (57 animations + 14 written guides) and interactive front/back Muscle Map.

---

## 4. Release Gates Before Official Production Activation

1. Owner review and sign-off of the candidate v0.1 anchor numbers and reference category policy (`male`, `female`, `unclassified`).
2. Cohort validation / fairness review before promoting `purpose` from `"candidate-preview"` to `"production"` in `content/strength/`.
3. Reviewer eligibility, video-evidence retention/privacy policy, and appeal workflow sign-off before issuing `MONTE Verified` awards.
4. Native Android/iOS device testing alongside web preview verification.
