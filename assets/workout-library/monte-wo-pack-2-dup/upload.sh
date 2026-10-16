#!/usr/bin/env bash
# Usage: ./upload.sh your-bucket-name
set -e
BUCKET="${1:?Pass your R2 bucket name, e.g. ./upload.sh monte-wo-media}"
cd "$(dirname "$0")/r2"
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-bench-press/demo.mp4" --file="exercises/dumbbell-bench-press/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-bench-press/loop.mp4" --file="exercises/dumbbell-bench-press/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/dumbbell-bench-press/poster.jpg" --file="exercises/dumbbell-bench-press/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/upright-row/demo.mp4" --file="exercises/upright-row/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/upright-row/loop.mp4" --file="exercises/upright-row/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/upright-row/poster.jpg" --file="exercises/upright-row/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/hip-thrust/demo.mp4" --file="exercises/hip-thrust/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/hip-thrust/loop.mp4" --file="exercises/hip-thrust/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/hip-thrust/poster.jpg" --file="exercises/hip-thrust/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/bulgarian-split-squat/demo.mp4" --file="exercises/bulgarian-split-squat/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bulgarian-split-squat/loop.mp4" --file="exercises/bulgarian-split-squat/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bulgarian-split-squat/poster.jpg" --file="exercises/bulgarian-split-squat/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/step-up/demo.mp4" --file="exercises/step-up/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/step-up/loop.mp4" --file="exercises/step-up/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/step-up/poster.jpg" --file="exercises/step-up/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/leg-extension/demo.mp4" --file="exercises/leg-extension/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/leg-extension/loop.mp4" --file="exercises/leg-extension/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/leg-extension/poster.jpg" --file="exercises/leg-extension/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/standing-leg-curl/demo.mp4" --file="exercises/standing-leg-curl/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/standing-leg-curl/loop.mp4" --file="exercises/standing-leg-curl/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/standing-leg-curl/poster.jpg" --file="exercises/standing-leg-curl/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/bodyweight-squat/demo.mp4" --file="exercises/bodyweight-squat/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bodyweight-squat/loop.mp4" --file="exercises/bodyweight-squat/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bodyweight-squat/poster.jpg" --file="exercises/bodyweight-squat/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/mountain-climber/demo.mp4" --file="exercises/mountain-climber/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/mountain-climber/loop.mp4" --file="exercises/mountain-climber/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/mountain-climber/poster.jpg" --file="exercises/mountain-climber/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/sit-up/demo.mp4" --file="exercises/sit-up/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/sit-up/loop.mp4" --file="exercises/sit-up/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/sit-up/poster.jpg" --file="exercises/sit-up/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/lying-leg-raise/demo.mp4" --file="exercises/lying-leg-raise/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/lying-leg-raise/loop.mp4" --file="exercises/lying-leg-raise/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/lying-leg-raise/poster.jpg" --file="exercises/lying-leg-raise/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/bicycle-crunch/demo.mp4" --file="exercises/bicycle-crunch/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bicycle-crunch/loop.mp4" --file="exercises/bicycle-crunch/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/bicycle-crunch/poster.jpg" --file="exercises/bicycle-crunch/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/high-knees/demo.mp4" --file="exercises/high-knees/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/high-knees/loop.mp4" --file="exercises/high-knees/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/high-knees/poster.jpg" --file="exercises/high-knees/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/butt-kicks/demo.mp4" --file="exercises/butt-kicks/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/butt-kicks/loop.mp4" --file="exercises/butt-kicks/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/butt-kicks/poster.jpg" --file="exercises/butt-kicks/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/jog-in-place/demo.mp4" --file="exercises/jog-in-place/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/jog-in-place/loop.mp4" --file="exercises/jog-in-place/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/jog-in-place/poster.jpg" --file="exercises/jog-in-place/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/arm-circles/demo.mp4" --file="exercises/arm-circles/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/arm-circles/loop.mp4" --file="exercises/arm-circles/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/arm-circles/poster.jpg" --file="exercises/arm-circles/poster.jpg" --content-type="image/jpeg" --remote
npx wrangler r2 object put "$BUCKET/exercises/leg-swings/demo.mp4" --file="exercises/leg-swings/demo.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/leg-swings/loop.mp4" --file="exercises/leg-swings/loop.mp4" --content-type="video/mp4" --remote
npx wrangler r2 object put "$BUCKET/exercises/leg-swings/poster.jpg" --file="exercises/leg-swings/poster.jpg" --content-type="image/jpeg" --remote
echo "Uploaded."
