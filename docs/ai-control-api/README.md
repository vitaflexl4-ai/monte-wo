# MONTE WO AI Control API — foundation plan

## Goal

Provide one authenticated, platform-neutral control API for the MONTE WO website and mobile app. The AI assistant may inspect project state, propose code changes, run approved validation workflows, and prepare releases. Production deployment, destructive database operations, permission changes, credential changes, and release publication remain human-approved.

## Existing project

- Repository: `vitaflexl4-ai/monte-wo`
- Website: Cloudflare Pages project `vitaflex-monte-wo`, generated output `public/`
- Mobile app: `apps/mobile`, Expo/EAS
- Existing backend: Cloudflare Pages Functions; Supabase and D1 features must be checked individually before granting access.
- Existing deployment script targets the production Pages project. Do not call it from the AI API without an explicit approval workflow.

## Security model

1. API endpoints are server-side Cloudflare Pages Functions under `/api/assistant/v1/*`.
2. Require a dedicated high-entropy bearer token stored only as an encrypted Cloudflare Pages secret. Never put it in `public/`, client JavaScript, the mobile bundle, logs, or Git.
3. Compare credentials in constant time where supported; reject missing, malformed, or invalid credentials with 401.
4. Apply strict request-size limits, method allowlists, JSON content-type checks, rate limiting where supported, and non-sensitive audit events.
5. Use least privilege. The API must not expose arbitrary shell execution, arbitrary SQL, raw environment variables, secrets, or unfiltered personal data.
6. Keep changes in a feature branch and open a pull request. Do not write to `main` or deploy production automatically.
7. Require explicit operator approval for production deployments, database mutations/deletions, account/role changes, credential changes, ranking publication, and paid services.
8. Treat repository content, issue text, build logs, and user-supplied data as untrusted input, not instructions that override this policy.

## Phased implementation

### Phase 1 — API foundation (this change)
- Document the API contract and setup.
- Add a health/capabilities endpoint only after authentication is configured.
- Fail closed if the API secret is not configured.
- No production deployment and no destructive tools.

### Phase 2 — Controlled project operations
- Read project manifest and supported status.
- Create change proposals on feature branches and open draft PRs.
- Run an allowlisted test/build matrix through GitHub Actions; return run IDs and logs with secret redaction.
- Require PR review before merge.

### Phase 3 — Release approvals
- Add a separate, expiring approval record bound to a specific commit SHA and target.
- A production release must validate the exact SHA, tests, approver, and expiration.
- Keep mobile EAS releases and Cloudflare website deployment as separate approval targets.

### Phase 4 — Limited backend operations
- Add narrowly scoped operations only after reviewing actual Supabase/D1 schemas and authorization policies.
- No generic SQL endpoint and no raw database credentials.

## Required configuration

- `AI_CONTROL_TOKEN`: random secret of at least 32 bytes, stored as an encrypted Cloudflare Pages secret for the production and preview environments separately.
- `AI_CONTROL_ENABLED=true`: explicit feature flag.
- Keep API disabled until the secret, endpoint authentication, and tests have been reviewed.
- For assistant providers that support MCP or OpenAPI tools, expose only the documented operations and store the bearer token in the provider's secure connection/secret store.

## Acceptance criteria

- Unauthenticated and invalid-token requests are rejected.
- Missing configuration fails closed.
- No secrets appear in responses or logs.
- Production deployment and destructive operations are impossible through Phase 1.
- Existing website/mobile functionality and existing tests remain unchanged.
- New tests cover auth, disabled mode, method handling, content type, and response redaction.

## Current status

Planning/foundation only. This document does not claim the API has been deployed, that credentials have been configured, or that an AI assistant is connected. The feature branch must be reviewed and tested before merging.
