#!/usr/bin/env bash
# Usage: ./upload.sh your-bucket-name
set -e
BUCKET="${1:?Pass your R2 bucket name, e.g. ./upload.sh monte-wo-media}"
cd "$(dirname "$0")/r2"
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-curl/demo.mp4" --file="exercises/dumbbell-curl/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-curl/loop.mp4" --file="exercises/dumbbell-curl/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-curl/poster.jpg" --file="exercises/dumbbell-curl/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/back-squat/demo.mp4" --file="exercises/back-squat/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/back-squat/loop.mp4" --file="exercises/back-squat/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/back-squat/poster.jpg" --file="exercises/back-squat/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/bench-press/demo.mp4" --file="exercises/bench-press/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bench-press/loop.mp4" --file="exercises/bench-press/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bench-press/poster.jpg" --file="exercises/bench-press/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/deadlift/demo.mp4" --file="exercises/deadlift/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/deadlift/loop.mp4" --file="exercises/deadlift/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/deadlift/poster.jpg" --file="exercises/deadlift/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/overhead-press/demo.mp4" --file="exercises/overhead-press/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/overhead-press/loop.mp4" --file="exercises/overhead-press/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/overhead-press/poster.jpg" --file="exercises/overhead-press/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/barbell-row/demo.mp4" --file="exercises/barbell-row/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/barbell-row/loop.mp4" --file="exercises/barbell-row/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/barbell-row/poster.jpg" --file="exercises/barbell-row/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/front-raise/demo.mp4" --file="exercises/front-raise/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/front-raise/loop.mp4" --file="exercises/front-raise/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/front-raise/poster.jpg" --file="exercises/front-raise/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/triceps-pushdown/demo.mp4" --file="exercises/triceps-pushdown/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/triceps-pushdown/loop.mp4" --file="exercises/triceps-pushdown/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/triceps-pushdown/poster.jpg" --file="exercises/triceps-pushdown/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/push-up/demo.mp4" --file="exercises/push-up/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/push-up/loop.mp4" --file="exercises/push-up/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/push-up/poster.jpg" --file="exercises/push-up/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/pull-up/demo.mp4" --file="exercises/pull-up/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/pull-up/loop.mp4" --file="exercises/pull-up/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/pull-up/poster.jpg" --file="exercises/pull-up/poster.jpg" --content-type="image/jpeg" --remote
echo "Uploaded."
