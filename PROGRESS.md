# MONTE WO v2 — Athlete Performance, Rank, World Nutrition & Universal Exercise Platform

## Summary of Delivered Capabilities

### 1. Pure-Obsidian (`#000000`) Design System (`apps/mobile/src/art.tsx`, `apps/mobile/src/ui.tsx`, `apps/mobile/App.tsx`)
- Eliminated dark-slate rectangular cutout borders around `#000000` brand emblems and 9-rank crests by anchoring the app shell, hero pedestals, rank badges, and navigation chrome in pure `#000000` obsidian with elevated `#090c12` / `#101520` surfaces, electric blue (`#258cf4`), and MONTE crimson (`#dc2626`) accents.
- Streamlined Home Command Center with 1-tap Power Actions (`AI Workout Builder`, `Barcode & AI Macro Scan`, `Custom Meal Plan AI`, `200+ Exercises & Media`), 4 `#000000` Ranked Discipline cards, live Workout Vault snapshot, and the 9-Rank Climb Scale showcase.

### 2. 9-Rank Climb Scale (`apps/mobile/src/RankScreen.tsx`, `shared/proposed-climb-scale.js`)
- Full 9-tier progression (`Debitan` → `Bati` → `Solid` → `Fò` → `Avanse` → `Mèt` → `Chanpyon` → `Titan` → `Lejand`) across all 4 independent disciplines:
  - Barbell Back Squat (`squat`)
  - Barbell Bench Press (`bench`)
  - Conventional Barbell Deadlift (`deadlift`)
  - Standing Strict Barbell Curl (`curl`)
- Bodyweight-adjusted Proposed Standard v0.1 (`35–180 kg`), strict movement checklist verification, single-rep vs multi-rep Epley estimate tracking, and clear separation between self-reported gym logs and MONTE Verified video adjudication.

### 3. World Nutrition, Barcode Reader, AI Macro Scanner & Meal Plan AI (`apps/mobile/src/world-foods.ts`, `apps/mobile/src/NutritionScreen.tsx`)
- **World Food Search**: Built-in Haitian/Caribbean + Global + Gym Athlete database (`Griot`, `Diri ak Pwa`, `Diri ak Djondjon`, `Soup Joumou`, `Lambi`, `Bannann Peze`, `Zaboka`, `Pikliz`, `Akasan`, sushi, tacos, jollof, Mediterranean bowls, staples, proteins) combined with live **Open Food Facts** global product search (3M+ foods worldwide).
- **Barcode Reader (`@zxing/browser` + `@zxing/library`)**: Live camera EAN/UPC barcode scanner, barcode photo decoder, and instant manual barcode lookup.
- **AI Macro Scanner**:
  - Smart Meal / Plate Analyzer (`"200g grilled chicken, 1.5 cups diri ak pwa, half avocado"` → instant gram & macro breakdown).
  - Nutrition Facts Label OCR / Text Extractor (`Calories`, `Protein`, `Total Carbohydrate`, `Total Fat`, `Serving size`).
  - Camera / Photo capture with optional Gemini 2.0 Flash or OpenAI Vision API key integration for direct visual macro estimation.
- **Preference-Driven Meal Plan Generator**: Generates 3–6 meals/day scaled to exact gram weights for target calories/protein, tailored to cuisine (`All World`, `Haitian & Caribbean`, `Gym Classic`, `Mediterranean`, `Latin`, `Asian`), dietary pattern (`Omnivore`, `Pescatarian`, `Vegetarian`, `Vegan`, `High-Protein`, `Low-Carb`), and custom ingredient/allergy exclusions, with 1-tap meal swapping and logging.

### 4. Universal Exercise Encyclopedia, Smart Workout Generator & Live Media Vault (`apps/mobile/src/global-exercises.ts`, `apps/mobile/src/media-vault.tsx`, `apps/mobile/src/WorkoutScreen.tsx`)
- **200+ Built-In Movements + Unlimited Custom Exercise Names**: Merges the 62 repo movements with 145+ curated strength, hypertrophy, calisthenics, Olympic, cable, dumbbell, kettlebell, and conditioning exercises — plus instant creation and logging of **any** exercise name on the spot.
- **Smart Workout Generator**: Builds tailored routines by goal (`Strength`, `Hypertrophy`, `Powerbuilding`, `Athletic`, `Fat-Loss Conditioning`), split (`Full Body`, `Upper`, `Lower`, `Push`, `Pull`, `Legs`, `Arms & Delts`, `Ranked Lift Peaking`), equipment (`Full Gym`, `Barbell Rack`, `Dumbbells Only`, `Home Gym`, `Bodyweight`), duration (`30–90 min`), and experience level, loading straight into the live set logger.
- **Add Video, GIF & MP4 Media As You Go (`media-vault.tsx`)**: Persistent IndexedDB + native file-picker + URL vault allowing `.mp4`, `.gif`, `.webm`, and poster images to be attached, previewed, looped inline, or replaced on any exercise in both the Workout Suite and Explore detail screens.

### 5. Haitian Rank Hall of Pride, Evolution Stage & AI Muscle Definition Camera (`apps/mobile/src/RankAvatarStage.tsx`, `apps/mobile/src/MuscleDefinitionCamera.tsx`, `apps/mobile/src/sound-fx.ts`, `public/cockpit-tools.js`)
- **Dual-State Evolution Stage (`YOU NOW` vs `POSSIBLE NEXT RANK`)**: Custom muscular silhouette tier paths across all 9 Haitian ranks (`Debitan` → `Lejand`), `"EVOLVE"` 2D lightning canvas effect, and synthesized Haitian `tanbou` drum-to-bass drop Web Audio feedback.
- **AI Muscle Definition Camera & 9:16 Story Exporter**: Live HD camera stream (`expo-camera` on iOS/Android, HTML5 `getUserMedia` on Web) with real-time contrast, shadow, and edge-sharpness contour shader (`MONTE WO AI GAINS DETECTOR — SHADOW RECONSTRUCTION ACTIVE`), electric-blue shutter capture, `"Save to Gallery"` (`expo-media-library`), and `"Share to Story"` (`1080×1920` `9:16` `"MONTE WO · LEVEL UP"` vertical card with Haitian rank crest + `expo-sharing` / Web Share / Instagram & TikTok Story links).

### 6. Git & Cloudflare Pages (`vitaflex-monte-wo`) Production Build Connection
- **Reproducible Root Build (`npm run build`)**: Synced `content/website/cockpit.html`, `content/nutrition/cockpit-world-foods.json`, `scripts/build_cockpit.py`, `scripts/build_website.py`, and `scripts/phone_cockpit.py` so `npm run build` outputs all 51 website routes + upgraded `/exercises/` Movement Cockpit without overwriting new capabilities.
- **Hosted `/mobile/` Expo Web SPA (`npm run build:mobile-web`)**: Exported `MONTEWO_WEB_PREVIEW=true` React Native Web bundle directly into `public/mobile/` (`pages_build_output_dir = "public"`) and pinned `.nvmrc` / `.node-version` (`22.13.0`), root `package.json` lockfile alignment, and `shared/exercises-catalog.js` ES module compatibility for Cloudflare Pages Functions (`functions/api/[[route]].js`).

