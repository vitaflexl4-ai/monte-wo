# MONTE WO — recover the full development source

This folder is the full development snapshot for the workout persistence checkpoint. It does not depend on earlier patch ZIPs. Keep it: the earlier standalone website ZIP did not contain the full native project.

## Verify the extracted source

From this folder:

```bash
shasum -a 256 -c SOURCE-FILES.sha256
```

The manifest is included in the checkpoint preview's generated source ZIP. No Git history, credentials, database contents or installed packages are included.

## Try the lightweight workout checkpoint locally

Requires Python 3 and Git. The preview server packages files listed by Git, so first create a NEW local snapshot repository inside this newly extracted folder. These commands do not contact or push to GitHub:

```bash
git init -b feature/mobile-foundation
git add .
python3 scripts/preview_workout_checkpoint.py
```

Then open `http://localhost:8085` on this Mac. This browser harness exercises the shared workout validator/archive but is not a native app build. Its preview history is not automatically transferred to the app, the production website, another browser profile, or another device. Do not run `git init` in an existing repository as a replacement for reconciling its branch/history.

## Native development

Use Node 22.13+ and the exact lockfile:

```bash
cd apps/mobile
npm ci
npm run typecheck
```

No dependency upgrades are necessary for this checkpoint. Native installation/build testing remains pending; do not treat browser testing as Android/iOS verification. The existing internal Android security exception is not public-release approval. Do not disable the security gate or create a replacement signing identity.

## Current feature boundary

Finish & save on device persists completed workouts, with separate device and account history. Unfinished sets are not saved. Local data is installation/profile scoped, visible to people using that installation, not encrypted by MONTE WO, and can be erased by uninstalling/clearing storage. No automatic cloud upload or rank award occurs.

The live account API currently reports unavailable. Sign-in is still an enrolled Access pilot, not public registration. Read `docs/mobile/OPERATIONS.md` before any backend configuration. No production migration, resource creation or data transfer is authorized by these recovery commands.

## Do not deploy placeholder settings

The local Wrangler config contains commented placeholders. Do not run root `npm run deploy` blindly. Preserve/download the existing production project settings first, and include the new `shared/` directory with the Functions source. No new website deployment is part of these recovery commands.

## Reconnect to the existing repository later

Reconcile this snapshot with the existing `vitaflexl4-ai/monte-wo` repository on the dedicated branch using the owner's authenticated tooling. Do not overwrite main, force-push, or create another application database. Review `docs/mobile/workout-checkpoint/REPORT.md` and the included check results first.
