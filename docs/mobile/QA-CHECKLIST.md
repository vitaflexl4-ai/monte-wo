# Release acceptance — still requires real devices

Automated/local coverage is recorded in BUILD-REPORT.md. The checklist below is **not completed** by a browser preview or Hermes export.

- Android signed APK: verify certificate against trusted historical record; install on supported physical device; launch; relaunch; update over previous same-key version; confirm minimum API and permissions.
- Android AAB: bundle validation, Play internal distribution, signing/update path, pre-launch report.
- iOS: device build, TestFlight processing/install, supported OS versions, provisioning, launch screen and real screenshots.
- Native sign-in: actual Access policy, cancellation, redirect capture, PKCE/state rejection, expired provider session, disabled account, fresh launch, sign-out online/offline, secure-storage behavior and device backup policy.
- Accounts: enroll the existing identity; profile revisions; no public self-service signup claim; reviewer/athlete separation.
- Workouts: valid/invalid input, retry after network interruption, same ID deduplication, history pagination, owner isolation, deletion, date/timezone boundaries. Unsaved input is memory-only and can be lost on process termination.
- Performance: each of four disciplines; exact bodyweight/unit snapshot; tested single vs approved estimate; mandatory technique attestation; no draft/overall/manual/workout rank; independent verified/provisional history.
- Evidence: MP4 selection/cancellation, size rejection, private upload/playback, interrupted network, temporary file cleanup, pending/rejected/flagged/approved states, reviewer self-approval prohibition and stale-revision conflicts. Test real codecs on both platforms.
- Account deletion: request without signing in via public support; in-app pending request; identity verification, actual erasure/anonymization and evidence deletion, retained legal audit/backup handling, completion response. Pending row alone does not satisfy this checklist.
- Accessibility: VoiceOver/TalkBack, Dynamic Type/font scaling, focus, contrast, errors, keyboard avoidance, orientation/large-device layouts. Browser labels are not native accessibility certification.
- Security: dependency remediation/risk review, backend authorization, logs/secrets audit, private object storage, deep links, endpoint abuse protection and external penetration review appropriate to launch scope.
- Website regression: original navigation/tools/posters/locales/waitlist fallback; download page only exposes verified published artifacts; HTTPS URL/hash/signature match after upload; no instruction to disable security.
