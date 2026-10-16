#!/usr/bin/env bash
# Usage: ./upload.sh your-bucket-name
set -e
BUCKET="${1:?Pass your R2 bucket name, e.g. ./upload.sh monte-wo-media}"
cd "$(dirname "$0")/r2"
npx wrangler r2 object put "$BUCKET/exercises/lateral-raise/demo.mp4" --file="exercises/lateral-raise/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/lateral-raise/loop.mp4" --file="exercises/lateral-raise/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/lateral-raise/poster.jpg" --file="exercises/lateral-raise/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/jumping-jacks/demo.mp4" --file="exercises/jumping-jacks/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/jumping-jacks/loop.mp4" --file="exercises/jumping-jacks/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/jumping-jacks/poster.jpg" --file="exercises/jumping-jacks/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/chest-fly/demo.mp4" --file="exercises/chest-fly/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/chest-fly/loop.mp4" --file="exercises/chest-fly/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/chest-fly/poster.jpg" --file="exercises/chest-fly/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-press-front/demo.mp4" --file="exercises/dumbbell-press-front/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-press-front/loop.mp4" --file="exercises/dumbbell-press-front/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-press-front/poster.jpg" --file="exercises/dumbbell-press-front/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/alternating-curl/demo.mp4" --file="exercises/alternating-curl/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/alternating-curl/loop.mp4" --file="exercises/alternating-curl/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/alternating-curl/poster.jpg" --file="exercises/alternating-curl/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/hammer-curl/demo.mp4" --file="exercises/hammer-curl/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/hammer-curl/loop.mp4" --file="exercises/hammer-curl/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/hammer-curl/poster.jpg" --file="exercises/hammer-curl/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/sumo-squat/demo.mp4" --file="exercises/sumo-squat/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/sumo-squat/loop.mp4" --file="exercises/sumo-squat/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/sumo-squat/poster.jpg" --file="exercises/sumo-squat/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/lateral-lunge/demo.mp4" --file="exercises/lateral-lunge/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/lateral-lunge/loop.mp4" --file="exercises/lateral-lunge/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/lateral-lunge/poster.jpg" --file="exercises/lateral-lunge/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/side-bend/demo.mp4" --file="exercises/side-bend/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/side-bend/loop.mp4" --file="exercises/side-bend/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/side-bend/poster.jpg" --file="exercises/side-bend/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/wide-grip-pull-up/demo.mp4" --file="exercises/wide-grip-pull-up/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/wide-grip-pull-up/loop.mp4" --file="exercises/wide-grip-pull-up/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/wide-grip-pull-up/poster.jpg" --file="exercises/wide-grip-pull-up/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/wide-lat-pulldown/demo.mp4" --file="exercises/wide-lat-pulldown/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/wide-lat-pulldown/loop.mp4" --file="exercises/wide-lat-pulldown/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/wide-lat-pulldown/poster.jpg" --file="exercises/wide-lat-pulldown/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/standing-side-leg-raise/demo.mp4" --file="exercises/standing-side-leg-raise/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/standing-side-leg-raise/loop.mp4" --file="exercises/standing-side-leg-raise/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/standing-side-leg-raise/poster.jpg" --file="exercises/standing-side-leg-raise/poster.jpg" --content-type="image/jpeg" --remote
echo "Uploaded."
