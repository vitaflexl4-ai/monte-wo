// MONTE WO Intelligence Worker — the scheduled runtime for ARGON, ULTRON and AU.
// Deployed separately from Cloudflare Pages; shares all logic with the Pages API through
// server/intelligence/core.js. Every job records an agent run; failures never fail silently.
//
//   */5 * * * *   ULTRON  website availability/latency/route checks, dedup, escalation, recovery
//   3 * * * *     ARGON   telemetry analysis (24h window) + AU cross-agent correlation
//   17 11 * * *   AU      daily executive briefing + retention sweep (rule-gated)
//   23 11 * * 1   AU      weekly strategic report
//
// Safety: this worker performs MONITORING and ANALYSIS only. It never deploys, never touches
// production data stores other than the intelligence D1 database, and its only reversible
// automated actions are the three rule-gated behaviors defined in intel_automation_rules.
import {
  runUltronChecks, analyzeArgonTelemetry, correlateAu, buildDailyBriefing, buildWeeklyBriefing,
  retentionSweep, recordAgentRun, isRuleEnabled
} from '../../server/intelligence/core.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const safeEqual = (a, b) => {
  const ea = new TextEncoder().encode(String(a)), eb = new TextEncoder().encode(String(b));
  if (ea.length !== eb.length) return false;
  let diff = 0; for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
};

function configured(env) {
  return env.INTELLIGENCE_ENABLED === 'true' && !!env.INTEL_DB;
}

async function ultronCycle(env) {
  return recordAgentRun(env.INTEL_DB, 'ULTRON', 'website-checks', async () => {
    const result = await runUltronChecks(env);
    const summary = result.configured
      ? result.results.length + ' targets checked: ' + result.results.map(c => c.target + '=' + c.status).join(', ')
      : 'SITE_URL not configured; nothing was checked and nothing was reported healthy.';
    return { summary, evidence: { configured: result.configured, results: result.results.map(c => ({ target: c.target, status: c.status, latencyMs: c.latencyMs, httpStatus: c.httpStatus ?? null })) } };
  });
}

async function argonAuCycle(env) {
  return recordAgentRun(env.INTEL_DB, 'ARGON', 'telemetry-analysis', async () => {
    const result = await analyzeArgonTelemetry(env.INTEL_DB, env);
    return { summary: result.analyzed + ' events analyzed across ' + result.versions + ' versions; ' + result.raised.length + ' finding(s); ' + result.note, evidence: result };
  });
}

async function auCorrelationCycle(env) {
  return recordAgentRun(env.INTEL_DB, 'AU', 'correlation', async () => {
    const result = await correlateAu(env.INTEL_DB, env);
    return { summary: result.correlated + ' cross-agent correlation(s) this run.', evidence: result };
  });
}

async function dailyCycle(env) {
  return recordAgentRun(env.INTEL_DB, 'AU', 'daily-briefing', async () => {
    const briefing = await buildDailyBriefing(env.INTEL_DB);
    const retention = await retentionSweep(env.INTEL_DB);
    return {
      summary: 'Daily briefing ' + briefing.id + ' (' + briefing.recommendations + ' recommendations, ' + briefing.challenges + ' challenges). Retention: ' + (retention.skipped ? 'skipped (' + retention.skipped + ')' : 'purged ' + (retention.checks || 0) + ' checks, ' + (retention.telemetry || 0) + ' telemetry rows.'),
      evidence: { briefing, retention }
    };
  });
}

async function weeklyCycle(env) {
  return recordAgentRun(env.INTEL_DB, 'AU', 'weekly-briefing', async () => {
    const briefing = await buildWeeklyBriefing(env.INTEL_DB);
    return { summary: 'Weekly report ' + briefing.id + ' (' + briefing.recurring + ' recurring fingerprints, ' + briefing.recommendations + ' recommendations).', evidence: briefing };
  });
}

export default {
  async scheduled(controller, env, ctx) {
    if (!configured(env)) {
      console.warn('MONTE WO Intelligence is not enabled/configured; no monitoring action was taken. Set INTELLIGENCE_ENABLED=true and bind INTEL_DB.');
      return;
    }
    const cron = controller.cron;
    const jobs = {
      '*/5 * * * *': ultronCycle,
      '3 * * * *': argonAuCycle,
      '17 11 * * *': dailyCycle,
      '23 11 * * 1': weeklyCycle
    };
    const job = jobs[cron];
    if (!job) { console.warn('No job mapped for cron "' + cron + '".'); return; }
    // ARGON's hourly cycle also runs AU correlation: one scheduled entry, two agent runs.
    ctx.waitUntil((async () => {
      try {
        await job(env);
        if (job === argonAuCycle) await auCorrelationCycle(env);
      } catch (error) {
        console.error('MONTE WO Intelligence job failed for cron "' + cron + '":', error);
      }
    })());
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      // Operational smoke test only; never reveals configuration values.
      return json({ service: 'monte-wo-intelligence-worker', enabled: configured(env), dbBound: !!env.INTEL_DB, siteUrlConfigured: /^https:\/\//i.test(env.SITE_URL || '') });
    }
    if (request.method === 'POST' && url.pathname === '/run') {
      // Key-gated manual trigger for testing after deployment. Uses the same jobs as cron.
      if (!configured(env)) return json({ error: 'not-configured' }, 503);
      if (!env.INTEL_WORKER_KEY || !safeEqual(request.headers.get('X-MW-Worker-Key') || '', env.INTEL_WORKER_KEY)) return json({ error: 'invalid-key' }, 401);
      const job = { checks: ultronCycle, analysis: argonAuCycle, correlate: auCorrelationCycle, daily: dailyCycle, weekly: weeklyCycle }[url.searchParams.get('job') || 'checks'];
      if (!job) return json({ error: 'unknown-job' }, 404);
      try { const result = await job(env); return json({ ok: true, summary: result?.summary || 'completed' }); }
      catch (error) { return json({ error: 'job-failed', detail: String(error?.message || error) }, 500); }
    }
    return json({ error: 'not-found' }, 404);
  }
};
