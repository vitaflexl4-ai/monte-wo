# MONTE WO Intelligence Command Center — Visual README

**Status: visual target / concept only.** This document defines the intended presentation for the private ARGON / ULTRON / AU command center. It is not evidence that the system is deployed or live.

## Visual target

The room should feel like a premium, cinematic, futuristic operations floor:
- dark navy/near-black architecture with electric-blue light for ARGON, red for ULTRON, and violet/cyan accents for AU;
- central AU coordination zone with a holographic globe/table;
- ARGON's blue-lit mobile-app workstation on one side;
- ULTRON's red-lit website-health workstation on the other;
- large transparent holographic screens with readable, evidence-backed operational information;
- a clear operator UI around the 3D scene: activity feed, agent status, incidents, and AU briefing.

The generated visual concept should be stored as `docs/assets/intelligence-command-center-concept.png` and embedded here once the image binary is committed. Until then, do not assume a screenshot or 3D scene exists in the application.

## What the room must animate

Movement must be driven by the agent state/event model, not arbitrary choreography:
- `idle`: agent remains at its home station; screen says "Idle / Waiting for data".
- `task_started`: agent walks to the relevant holographic screen.
- `evidence_received`: screen adds the event/evidence item and timestamp.
- `analysis_running`: agent examines the screen; show a progress state tied to a real job.
- `finding_created`: show the persisted finding and its confidence/evidence links.
- `correlation_started`: AU moves to the shared central display and shows the actual member events.
- `briefing_created`: AU's screen shows the persisted briefing and recommendation decisions.
- `task_failed`: agent shows an explicit error state and a route to logs.
- `recovered`: show recovery only after the actual recovery rule passes.

Do not represent a scheduled job as running until a job has actually started. Do not invent live timestamps, counts, uptime, incidents, confidence, traffic, or results.

## Reality labels

Every screen and API payload must expose one of:
- **LIVE** — backed by configured production-like telemetry/checks and persisted evidence.
- **SIMULATION / DEMO** — synthetic events, visibly watermarked, isolated from production records.
- **NOT CONNECTED / NOT CONFIGURED** — integration or data source is absent.
- **IDLE / WAITING** — no active job/event exists.

Never blend demo and live data in the same metric or briefing. Include a visible mode indicator at all times and ensure demo records cannot trigger production automation.

## Interactions

- Clicking an agent opens its last run, current task, timestamps, evidence, result, errors, and next scheduled run.
- Clicking a holographic incident opens its persisted incident record and timeline.
- Clicking an AU correlation opens the linked source events and the explanation for why they were grouped.
- An event timeline entry explains the event that caused an agent to move/change state.
- The room must work with keyboard navigation and reduced-motion settings; a 2D operational view remains available when 3D rendering is unsupported or expensive.

## Acceptance test

A repeatable test must create a test-only incident through the actual API, have ARGON or ULTRON process it, have AU correlate/summarize it, persist the result, and let the operator inspect the complete evidence chain in the UI. Automated tests must verify live/demo isolation, authorization, idle/failure states, and event-to-animation mapping.

## Security / deployment guardrails

- The room and all intelligence APIs remain private behind Cloudflare Access and server-side role checks.
- Keep demo fixtures clearly synthetic and separate from production storage/automation.
- Do not deploy publicly just to produce a shareable preview.
- Do not claim live integrations until they are configured and verified.
- Keep automation disabled by default and never let visual animation trigger an action.
- Document Cloudflare bindings, migrations, secrets, and a realistic no-recurring-cost path before deployment.

## Source of truth

The implementation and runbook are tracked in [PR #16](https://github.com/vitaflexl4-ai/monte-wo/pull/16) and `docs/INTELLIGENCE-COMMAND-CENTER.md`. This README is the visual/interaction acceptance contract, not a deployment claim.
