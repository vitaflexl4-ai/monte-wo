# Monte Wo exercise pack 3: front-view moves (12 exercises)

These moves happen side to side, so they are filmed from the front instead of the side. Same file format as packs 1 and 2, same bucket and same D1 table.
Each exercise has 3 files under `r2/exercises/<id>/`:
- `demo.mp4`   5 reps with phase labels (Leve / Kenbe / Desann / Repoze) and a rep counter, 720x936, 30 fps, about 21.5 s
- `loop.mp4`   one clean cycle, no counter, loops seamlessly (4.3 s)
- `poster.jpg` still image for thumbnails and loading states

Exercises by category:
- Arms: alternating-curl, hammer-curl
- Back: wide-grip-pull-up, wide-lat-pulldown
- Cardio: jumping-jacks
- Chest: chest-fly
- Core: side-bend
- Legs: sumo-squat, lateral-lunge, standing-side-leg-raise
- Shoulders: lateral-raise, dumbbell-press-front

Notes
- Alternating curl and jumping jacks: one cycle covers both sides, so the counter counts full cycles.
- Upload like the other packs: `./upload.sh your-bucket-name`, then `npx wrangler d1 execute your-db --remote --file=exercises.sql` (safe to run after packs 1 and 2).
- `name_ht` (Haitian Creole name) is empty on purpose, to be filled after a native speaker checks it.
