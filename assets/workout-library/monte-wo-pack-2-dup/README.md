# Monte Wo exercise pack 2 (17 exercises)

Same format as pack 1, so both packs can live in the same R2 bucket and the same D1 table.
Each exercise has 3 files under `r2/exercises/<id>/`:
- `demo.mp4`   5 reps with phase labels (Leve / Kenbe / Desann / Repoze) and a rep counter, 720x936, 30 fps, about 21.5 s
- `loop.mp4`   one clean cycle, no counter, loops seamlessly (4.3 s), for the app to put its own text on top
- `poster.jpg` still image for thumbnails and loading states

Exercises by category:
- Cardio: mountain-climber, high-knees, butt-kicks, jog-in-place
- Chest: dumbbell-bench-press
- Core: sit-up, lying-leg-raise, bicycle-crunch
- Legs: hip-thrust, bulgarian-split-squat, step-up, leg-extension, standing-leg-curl, bodyweight-squat
- Mobility: arm-circles, leg-swings
- Shoulders: upright-row

Notes
- Cardio and mobility moves (high knees, butt kicks, jog in place, mountain climber, arm circles, leg swings) alternate sides, so one cycle shows both sides and the on-screen counter counts full cycles, not single steps.
- Upload exactly like pack 1: `./upload.sh your-bucket-name`, then `npx wrangler d1 execute your-db --remote --file=exercises.sql`.
- `exercises.sql` creates the table only if it does not exist, and uses INSERT OR REPLACE, so it is safe to run after pack 1.
- `name_ht` (Haitian Creole name) is empty on purpose, to be filled after a native speaker checks it.
