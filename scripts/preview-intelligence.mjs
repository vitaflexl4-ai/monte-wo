#!/usr/bin/env node
// MONTE WO Intelligence — one-command local preview.
//
// Starts (1) wrangler pages dev with the INTEL_DB binding and preview hardening on an internal
// port, and (2) the Host-rewriting preview proxy on PUBLIC_PORT (default 8080). If the local D1
// has not been migrated yet, apply migrations first:
//
//   npx wrangler d1 execute monte-wo-intel-local --local --config wrangler.intel-local.toml \
//     --file migrations/0003_intelligence.sql
//   npx wrangler d1 execute monte-wo-intel-local --local --config wrangler.intel-local.toml \
//     --file migrations/0004_intelligence_ops.sql
//
// A PREVIEW_TOKEN is generated and printed when not provided: the intelligence API requires it
// from every host while it is set, so the preview stays private. This is a development preview —
// production uses Cloudflare Access, never this script.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const PUBLIC_PORT = Number(process.env.PUBLIC_PORT || 8080);
const UPSTREAM_PORT = Number(process.env.UPSTREAM_PORT || 8081);
const TOKEN = process.env.PREVIEW_TOKEN || randomBytes(24).toString('base64url');
const SITE_URL = process.env.SITE_URL || `http://localhost:${PUBLIC_PORT}`;
const INGEST_KEY = process.env.INTELLIGENCE_INGEST_KEY || 'local-preview-key';

const wrangler = spawn('npx', ['wrangler', 'pages', 'dev', 'public',
  '--d1', 'INTEL_DB',
  '--binding', 'LOCAL_DEVELOPMENT=true',
  '--binding', `PREVIEW_TOKEN=${TOKEN}`,
  '--binding', `SITE_URL=${SITE_URL}`,
  '--binding', `INTELLIGENCE_INGEST_KEY=${INGEST_KEY}`,
  '--ip', '0.0.0.0', '--port', String(UPSTREAM_PORT)
], { stdio: ['ignore', 'pipe', 'pipe'] });
const proxy = spawn('node', ['scripts/preview-proxy.mjs', String(PUBLIC_PORT), String(UPSTREAM_PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });

const forward = (child, tag) => {
  child.stdout.on('data', d => process.stdout.write(`[${tag}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[${tag}] ${d}`));
};
forward(wrangler, 'wrangler');
forward(proxy, 'proxy');

const stop = () => { wrangler.kill('SIGTERM'); proxy.kill('SIGTERM'); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
wrangler.on('exit', code => { proxy.kill('SIGTERM'); process.exit(code ?? 0); });

setTimeout(() => {
  console.log('\n==========================================================');
  console.log('MONTE WO Intelligence — LOCAL PREVIEW (development only)');
  console.log(`Dashboard : http://localhost:${PUBLIC_PORT}/intelligence/`);
  console.log(`Unlock    : enter this preview token when prompted:`);
  console.log(`            ${TOKEN}`);
  console.log('The token is required from every host while it is set.');
  console.log('==========================================================\n');
}, 4000);
