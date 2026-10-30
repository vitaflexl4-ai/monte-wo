# Monte Wo exercise pack (10 exercises)

Each exercise has 3 files under `r2/exercises/<id>/`:
- `demo.mp4`   5 reps with phase labels (Leve / Kenbe / Desann / Repoze) and a rep counter, 720x936, 30 fps, about 21.5 s
- `loop.mp4`   one clean rep, no counter, loops seamlessly (4.3 s), for the app to put its own text on top
- `poster.jpg` still image at the peak of the movement, for thumbnails and loading states

Exercises: dumbbell-curl, back-squat, bench-press, deadlift, overhead-press, barbell-row, front-raise, triceps-pushdown, push-up, pull-up.
Total size is about 5.6 MB for all videos.

## Load into Cloudflare

1. Create an R2 bucket (dashboard: Storage & databases > R2), e.g. `monte-wo-media`.
2. Log in and upload everything (needs Node and wrangler):
   `npx wrangler login`
   `./upload.sh monte-wo-media`
   The script uses `--remote` so files go to your real bucket, not local dev storage.
3. Make the files reachable: in the bucket's Settings, connect a custom domain such as `media.vitaflexbusinessgroup.com`.
4. Create a D1 database (e.g. `monte-wo-db`) and load the exercise table:
   `npx wrangler d1 create monte-wo-db`
   `npx wrangler d1 execute monte-wo-db --remote --file=exercises.sql`
5. In the app, play `https://media.vitaflexbusinessgroup.com/` + the `demo_key` or `loop_key` from the table.

`manifest.json` has the same data as the SQL (names, muscles, equipment, durations, sizes).
`name_ht` (Haitian Creole name) is empty on purpose: fill it in after a native speaker checks it.
