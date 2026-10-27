# VitaFlex Business Group repositioning

## Architecture and maintenance

- `/`: parent-company homepage; no MONTE WO application scripts or analytics dependencies.
- `/ventures/monte-wo/`: venture description, supported development status, real product destination.
- `/ventures/vitaflex-training/`: separate brand description; no invented launch status or external URL.
- `/monte-wo/`: preserved generated product homepage and interactive concept.
- Existing tools, exercise guides, app, waitlist, account, legal and protected API routes stay at their existing paths. Product-home links now point to `/monte-wo/`.
- Existing `/about/` and `/contact/` remain MONTE WO pages. Corporate About and Contact are homepage sections.

Edit `content/group/ventures.json` to add ventures. `logo`, `status`, and `destination` can be null when not confirmed. The generator produces cards and detail pages from the same source. Run `npm run build`; the corporate layer runs last from `scripts/build_group.py`. Keep product engines and data contracts separate.

Group presentation uses local Inter fonts, charcoal/champagne styling, original CSS architectural artwork, a new typographic group mark and existing MONTE WO logo. VitaFlex Training uses a restrained typographic treatment, not a claimed supplied official logo. There are no external font, image or JavaScript dependencies on the corporate pages. Contact opens the existing mailbox with a group-inquiry subject; it does not pretend to submit a form.

## Evidence (2026-10-27)

- Inspected repository, route manifests, supplied assets, build chain, Pages configuration and existing deployment workflow before implementation.
- Direct custom-domain access from the sandbox failed TLS connection. GitHub-hosted inspection later returned HTTP 403, title `Just a moment...` (Cloudflare challenge). No claim to having visually inspected the protected production content.
- `npm run build`: PASS.
- `npm test`: 210/212 PASS before adding three group-specific tests. Two remaining failures are existing `wrangler.toml` checksum expectation mismatches in Lab/Website protected-source tests; reproduced on an untouched archive of the starting revision. No protected file was changed or checksum check weakened. An initial intelligence rate-limit test failed once but passed on repeat; no security code was changed.
- New group browser suite: PASS on GitHub-hosted Chromium, four routes, twenty 320–1440px layouts, all corporate links, keyboard skip navigation, zero page errors. Screenshots are in workflow artifacts.
- Local Chromium download was blocked by sandbox network policy. A registry-sourced Chromium alternative lacked system libraries; no browser security settings were changed in the committed tests. GitHub runner provided the working browser environment.
- Cloudflare Pages deployment: SUCCESS through `scripts/deploy-intelligence.mjs`, preserving its existing security configuration workflow.
- Revision `e4833d439472dcbd5ba8819fd52e070d31dab7cc` deployed to `https://b247f333.vitaflex-monte-wo-live.pages.dev`; project alias `https://vitaflex-monte-wo-live.pages.dev` returned HTTP 200 and the new corporate title and headline.
- Evidence run: https://github.com/vitaflexl4-ai/monte-wo/actions/runs/40559922690 . Build, browser tests, deployment and diagnostic steps passed; final custom-domain verification FAILED, correctly making the overall run red.

## Production-domain blocker — not a completed custom-domain launch

Cloudflare's Pages project API confirms:

- `vitaflex-monte-wo-live`: the existing supported deployment target, now serving the new group website.
- `vitaflex`: owns `vitaflexbusinessgroup.com` and `www.vitaflexbusinessgroup.com`; production revision at inspection was `3d8ab92af257e6dfa659076085f5cd54442680bc`.

Thus uploading successfully to the repository's configured project does **not** update the requested domain. The domain also challenges automated verification with HTTP 403. Do not disable Cloudflare security to make a test green.

Before finishing the domain launch, inspect the separate `vitaflex` project's source/build/function configuration and decide whether to deploy this site there or transfer the domain to the verified Pages project. Preserve any existing domain functionality and review DNS requirements. This implementation deliberately does not silently overwrite the separate project's configuration or transfer its domains without inspecting it. After resolving routing, run `node scripts/verify-group.mjs` from an environment authorized to access the domain; check apex and www in a real browser as well.

The workflow retains strict custom-domain verification, captures pre-deploy headers/errors, uploads screenshots/deployment evidence, and verifies the Pages fallback independently. This is not reported as a successful live-domain launch.
