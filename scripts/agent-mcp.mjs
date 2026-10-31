#!/usr/bin/env node
// MONTE WO — Agent API client for AI agents: MCP server (stdio) + small CLI. Zero dependencies, Node ≥ 18.
//
// This is the file you hand to the agent. It needs exactly two environment variables, both supplied by
// the owner out-of-band (a secret manager or the MCP client's env block — never chat, never Git):
//   MONTE_WO_AGENT_URL   origin of the deployment, e.g. https://<project>.pages.dev or https://<custom-domain> (no path)
//   MONTE_WO_AGENT_KEY   the key issued with scripts/agent-key.mjs (mwa_<16 hex>_<43 chars>)
// Optional:
//   MONTE_WO_AGENT_TIMEOUT_MS   per-request timeout (default 20000)
//   MONTE_WO_AGENT_ALL_TOOLS=1  list every tool, not only the ones this key's scopes/role allow
//
// MCP (Model Context Protocol, JSON-RPC 2.0 over stdio — Claude Desktop, Claude Code, Cursor, any MCP client):
//   node scripts/agent-mcp.mjs
// CLI (shell-capable agents, cron jobs, humans):
//   node scripts/agent-mcp.mjs check                        # handover acceptance test: whoami + status, exit 0 only if usable
//   node scripts/agent-mcp.mjs tools                        # the tools this key can use (name, description, scope)
//   node scripts/agent-mcp.mjs call whoami
//   node scripts/agent-mcp.mjs call get_audit '{"limit":20}'
//   node scripts/agent-mcp.mjs call put_memory '{"key":"lock:deploy","body":{"owner":"ultron"},"header_If_Match":0}'
//
// Design: the tool list is discovered from GET /api/agent/tools (the server's own function-calling manifest),
// so new operations appear here without changing this file. Every call is one HTTP request with the bearer key;
// results are returned verbatim with the HTTP status. Nothing is cached, stored or logged besides stderr diagnostics.
// Binary operations (evidence upload/stream) are not exposed through MCP — use HTTP directly for those.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SERVER_NAME = 'monte-wo-agent';
const SERVER_VERSION = '1.0.0';
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const BINARY_TOOLS = new Set(['strength_upload_evidence', 'strength_get_evidence']);
const BASE = (process.env.MONTE_WO_AGENT_URL || '').replace(/\/+$/, '');
const KEY = process.env.MONTE_WO_AGENT_KEY || '';
const TIMEOUT = Number(process.env.MONTE_WO_AGENT_TIMEOUT_MS) || 20000;
const ALL_TOOLS = process.env.MONTE_WO_AGENT_ALL_TOOLS === '1';

const log = msg => process.stderr.write(`${SERVER_NAME}: ${msg}\n`);

// ---------- HTTP ----------
export async function http(method, path, { query, body, headers = {} } = {}) {
  if (!BASE) throw new Error('MONTE_WO_AGENT_URL is not set');
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  const h = { Accept: 'application/json', ...headers };
  if (KEY) h.Authorization = 'Bearer ' + KEY;
  let payload;
  if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(u, { method, headers: h, body: payload, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT) });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  const pick = n => res.headers.get(n);
  const meta = {};
  if (pick('etag')) meta.etag = pick('etag');
  if (pick('x-ratelimit-remaining') !== null) meta.rateLimitRemaining = Number(pick('x-ratelimit-remaining'));
  if (pick('retry-after')) meta.retryAfter = Number(pick('retry-after'));
  if (pick('allow')) meta.allow = pick('allow');
  return { status: res.status, ok: res.ok, ...meta, body: data };
}

// ---------- discovery + per-key tool list ----------
let manifestPromise = null;
export function loadManifest() {
  if (!manifestPromise) manifestPromise = (async () => {
    const tools = await http('GET', '/api/agent/tools');
    if (tools.status === 404) throw new Error(`Agent API is not enabled at ${BASE} (404 ${tools.body?.error || ''}) — the owner must deploy with --with-agent-api first`);
    if (!tools.ok || !Array.isArray(tools.body?.tools)) throw new Error(`could not load ${BASE}/api/agent/tools (HTTP ${tools.status})`);
    let who = null;
    if (KEY) {
      const r = await http('GET', '/api/agent/whoami');
      if (r.ok) who = r.body; else log(`whoami failed (HTTP ${r.status} ${r.body?.error || ''}) — tools are listed unfiltered; calls will fail until the key is valid`);
    } else log('MONTE_WO_AGENT_KEY is not set — discovery only; every call will be 401');
    const scopes = who?.key?.effectiveScopes || null, role = who?.principal?.role || null;
    const usable = tools.body.tools.filter(t => !BINARY_TOOLS.has(t.name)).filter(t => {
      if (ALL_TOOLS || !scopes) return true;
      if (t.scope && !(scopes.includes('*') || scopes.includes(t.scope))) return false;
      if (t.roles && !(role && t.roles.includes(role))) return false;
      return true;
    });
    return { version: tools.body.version, who, tools: usable, byName: new Map(usable.map(t => [t.name, t])) };
  })();
  return manifestPromise;
}

export function instructionsFor(m) {
  const who = m.who, scopes = who ? (who.key.scopes || []).join(', ') : '(unknown — key not validated)';
  const policy = who?.policy || {};
  return [
    `You operate the MONTE WO Agent API at ${BASE} as key "${who?.key?.name || 'unknown'}" (scopes: ${scopes}${who?.principal ? `; linked Strength principal ${who.principal.id} with role ${who.principal.role}` : '; no linked Strength principal'}).`,
    `Rate limit: ${who?.rateLimit?.limit ?? '?'} calls per 10 minutes — on HTTP 429 wait for retryAfter seconds. Server policy: waitlist e-mail access ${policy.pii ? 'ENABLED' : 'disabled'}, reviewer/admin Strength automation ${policy.privilegedStrength ? 'ENABLED' : 'disabled'}.`,
    'Product rules you must respect and never work around: four independent disciplines (Squat, Bench Press, Deadlift, Biceps Curl) with nine ranks each and no combined rank; ranks are never awarded manually (the API refuses it and audits the attempt); self-reported performances are Provisional at most, Verified only after an authorized evidence review; draft standards cannot award official ranks.',
    'Honesty: report only what the API returned; say "not connected"/"unavailable" when a database or feature is not bound (HTTP 503). Never invent thresholds, rankings, users or metrics.',
    'Coordination with other agents: shared memory keys are namespaced — lock:<task> (create with header_If_Match 0, exactly one winner), checkpoint:<agent>, incident:<id>, note:<topic>. Always release or bump your own locks; never delete another agent\'s keys.',
    'Every call is audited under this key. Personal data (waitlist e-mails) must never be copied into memory keys, logs or summaries. Escalate to the owner instead of guessing when a call is forbidden (403) or the service degrades (503).'
  ].join('\n');
}

// ---------- tool execution ----------
class ToolError extends Error {}
export async function callTool(m, name, args) {
  const t = m.byName.get(name);
  if (!t) throw new ToolError(`Unknown tool: ${name}`);
  if (args !== undefined && (args === null || typeof args !== 'object' || Array.isArray(args))) throw new ToolError('arguments must be a JSON object');
  const params = { ...(args || {}) };
  const path = t.http.path.replace(/\{([a-zA-Z]+)\}/g, (_, p) => {
    if (params[p] === undefined || params[p] === null || params[p] === '') throw new ToolError(`Missing required parameter: ${p}`);
    const v = encodeURIComponent(String(params[p])).replace(/%3A/gi, ':'); delete params[p]; return v;   // ':' is a legal path character — keeps memory keys readable in the audit trail
  });
  const headers = {};
  for (const k of Object.keys(params)) if (k.startsWith('header_')) { headers[k.slice(7).replace(/_/g, '-')] = String(params[k]); delete params[k]; }
  let body;
  if (Object.prototype.hasOwnProperty.call(params, 'body')) { body = params.body; delete params.body; }
  return http(t.http.method, path, { query: params, body, headers });
}
const toolResult = r => ({ content: [{ type: 'text', text: JSON.stringify(r, null, 2) }], isError: !r.ok });
const mcpTool = t => ({
  name: t.name, description: t.description, inputSchema: t.parameters,
  annotations: { readOnlyHint: t.http.method === 'GET', destructiveHint: t.http.method === 'DELETE' || t.name.startsWith('forget_'), idempotentHint: t.http.method !== 'POST', openWorldHint: false }
});

// ---------- MCP server (stdio, JSON-RPC 2.0, newline-delimited) ----------
function rpcError(code, message, data) { const e = new Error(message); e.rpc = { code, message, ...(data !== undefined ? { data } : {}) }; return e; }
async function handle(msg) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') throw rpcError(-32600, 'Invalid Request');
  const p = msg.params || {};
  if (msg.method.startsWith('notifications/')) return null;   // initialized / cancelled / progress — nothing to answer
  switch (msg.method) {
    case 'initialize': {
      const requested = typeof p.protocolVersion === 'string' ? p.protocolVersion : PROTOCOLS[0];
      let instructions = `MONTE WO Agent API at ${BASE || '(MONTE_WO_AGENT_URL not set)'}.`;
      try { instructions = instructionsFor(await loadManifest()); } catch (e) { log(e.message); instructions += ' ' + e.message; }
      return { protocolVersion: PROTOCOLS.includes(requested) ? requested : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }, instructions };
    }
    case 'ping': return {};
    case 'tools/list': { const m = await loadManifest().catch(e => { throw rpcError(-32000, e.message); }); return { tools: m.tools.map(mcpTool) }; }
    case 'tools/call': {
      const m = await loadManifest().catch(e => { throw rpcError(-32000, e.message); });
      try { return toolResult(await callTool(m, p.name, p.arguments)); }
      catch (e) {
        if (e instanceof ToolError) throw rpcError(-32602, e.message);
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'request-failed', message: e.message }) }], isError: true };
      }
    }
    case 'resources/list': return { resources: [] };
    case 'prompts/list': return { prompts: [] };
    default: throw rpcError(-32601, `Method not found: ${msg.method}`);
  }
}
async function respond(msg) {
  const isNotification = msg && msg.jsonrpc === '2.0' && msg.id === undefined;
  try {
    const result = await handle(msg);
    if (isNotification) return null;
    return { jsonrpc: '2.0', id: msg.id, result };
  } catch (e) {
    if (isNotification) { log(e.message); return null; }
    return { jsonrpc: '2.0', id: msg && msg.id !== undefined ? msg.id : null, error: e.rpc || { code: -32603, message: e.message } };
  }
}
function serveStdio() {
  const out = obj => process.stdout.write(JSON.stringify(obj) + '\n');
  let buffer = '', inflight = 0, ended = false;
  const finish = () => { if (ended && inflight === 0) process.exit(0); };   // let in-flight HTTP calls answer before exiting
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg; try { msg = JSON.parse(line); } catch { out({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); continue; }
      inflight++;
      (async () => {
        try {
          if (Array.isArray(msg)) { const rs = (await Promise.all(msg.map(respond))).filter(Boolean); if (rs.length) out(rs); }
          else { const r = await respond(msg); if (r) out(r); }
        } finally { inflight--; finish(); }
      })();
    }
  });
  process.stdin.on('end', () => { ended = true; finish(); });
  log(`MCP server ready (${BASE || 'MONTE_WO_AGENT_URL not set'}; key ${KEY ? 'present' : 'ABSENT'})`);
}

// ---------- CLI ----------
async function cli(argv) {
  const [cmd, ...rest] = argv;
  const print = o => process.stdout.write(JSON.stringify(o, null, 2) + '\n');
  if (cmd === 'tools') {
    const m = await loadManifest();
    print(m.tools.map(t => ({ name: t.name, method: t.http.method, path: t.http.path, scope: t.scope, roles: t.roles, description: t.description })));
    return 0;
  }
  if (cmd === 'call' || cmd === 'whoami') {
    const name = cmd === 'whoami' ? 'whoami' : rest[0];
    if (!name) { log('usage: call <tool> [json-arguments]'); return 2; }
    let args;
    const rawArgs = cmd === 'whoami' ? undefined : rest[1];
    if (rawArgs !== undefined) { try { args = JSON.parse(rawArgs.startsWith('@') ? readFileSync(rawArgs.slice(1), 'utf8') : rawArgs); } catch (e) { log('arguments must be JSON (or @file.json): ' + e.message); return 2; } }
    const m = await loadManifest();
    let r;
    try { r = await callTool(m, name, args); } catch (e) { if (e instanceof ToolError) { log(e.message); return 2; } throw e; }
    print(r);
    return r.ok ? 0 : 1;
  }
  if (cmd === 'check') {
    // Handover acceptance test: discovery, identity, readiness. Exit 0 only when the agent can actually work.
    const m = await loadManifest();
    const who = m.who;
    if (!who) { log('FAIL: the key was not accepted (see the whoami message above)'); return 1; }
    const status = m.byName.has('get_status') ? await callTool(m, 'get_status', {}) : null;
    print({
      url: BASE, apiVersion: m.version, key: { id: who.key.id, name: who.key.name, scopes: who.key.scopes, effectiveScopes: who.key.effectiveScopes },
      principal: who.principal, policy: who.policy, rateLimit: who.rateLimit, usableTools: m.tools.map(t => t.name),
      status: status ? { http: status.status, storage: status.body?.storage, agentApi: status.body?.features?.agentApi } : 'status:read not granted'
    });
    const degraded = status && status.ok && Object.entries(status.body?.storage || {}).filter(([, v]) => v === 'error');
    if (degraded && degraded.length) { log('WARN: storage in error state: ' + degraded.map(([k]) => k).join(', ')); return 1; }
    log(`OK: key "${who.key.name}" can use ${m.tools.length} tools`);
    return 0;
  }
  log('usage: node scripts/agent-mcp.mjs [check | tools | whoami | call <tool> [json]]   (no arguments = MCP server on stdio)');
  return 2;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.length === 0) serveStdio();
  else cli(argv).then(code => process.exit(code), e => { log(e.message); process.exit(1); });
}
