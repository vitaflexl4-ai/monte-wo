const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
});
const id = () => crypto.randomUUID();

async function recordCheck(db, check) {
  await db.prepare(`INSERT INTO intel_checks (id,agent,target,status,latency_ms,http_status,detail,evidence_json,checked_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`)
    .bind(id(), check.agent, check.target, check.status, check.latencyMs ?? null, check.httpStatus ?? null,
      check.detail || "", JSON.stringify(check.evidence || {}), new Date().toISOString()).run();
}
async function recordIncident(db, incident) {
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO intel_incidents (id,fingerprint,agent,severity,title,summary,evidence_json,confidence,status,first_seen,last_seen)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'open',?9,?9)
    ON CONFLICT(fingerprint) DO UPDATE SET last_seen=excluded.last_seen, summary=excluded.summary, evidence_json=excluded.evidence_json,
    severity=excluded.severity, confidence=excluded.confidence, status=CASE WHEN intel_incidents.status='resolved' THEN 'open' ELSE intel_incidents.status END`)
    .bind(id(), incident.fingerprint, incident.agent, incident.severity, incident.title, incident.summary,
      JSON.stringify(incident.evidence || {}), incident.confidence, now).run();
}
async function websiteCheck(env) {
  const url = env.SITE_URL;
  if (!url || !/^https:\/\//i.test(url) || !env.INTEL_DB) {
    if (env.INTEL_DB) await recordCheck(env.INTEL_DB, {agent:"ULTRON",target:"website-home",status:"not_configured",detail:"SITE_URL or D1 binding is not configured"});
    return;
  }
  const start = Date.now();
  try {
    const response = await fetch(url, { method:"GET", redirect:"manual", signal:AbortSignal.timeout(12000), headers:{"user-agent":"MONTE-WO-ULTRON-HealthCheck/1.0"} });
    const latencyMs = Date.now() - start;
    const status = response.status >= 200 && response.status < 400 ? "ok" : "degraded";
    await recordCheck(env.INTEL_DB, {agent:"ULTRON",target:"website-home",status,latencyMs,httpStatus:response.status,detail:"HTTP availability check only; no visitor identities collected",evidence:{url,redirect:response.headers.get("location") ? "redirect-present" : "none"}});
    if (response.status >= 500) await recordIncident(env.INTEL_DB, {fingerprint:"website-home-http-5xx",agent:"ULTRON",severity:"high",title:"Website returned a server error",summary:"The configured website health check returned HTTP "+response.status+".",confidence:0.99,evidence:{url,httpStatus:response.status,latencyMs}});
    else if (response.status >= 400) await recordIncident(env.INTEL_DB, {fingerprint:"website-home-http-4xx",agent:"ULTRON",severity:"medium",title:"Website health check returned a client error",summary:"The configured website health check returned HTTP "+response.status+". Verify the intended public health endpoint.",confidence:0.95,evidence:{url,httpStatus:response.status,latencyMs}});
  } catch (error) {
    const detail = error?.name === "TimeoutError" ? "Website request timed out" : "Website request failed; see worker logs for diagnostic details";
    await recordCheck(env.INTEL_DB, {agent:"ULTRON",target:"website-home",status:"down",latencyMs:Date.now()-start,detail,evidence:{url}});
    await recordIncident(env.INTEL_DB, {fingerprint:"website-home-fetch-failed",agent:"ULTRON",severity:"critical",title:"Website health check failed",summary:detail+". Confirm this is not a monitor/network issue before declaring an outage.",confidence:0.85,evidence:{url}});
  }
}
async function createBriefing(env, kind) {
  if (!env.INTEL_DB) return;
  const since = new Date(Date.now() - (kind === "weekly" ? 7 : 1) * 86400000).toISOString();
  const rows = await env.INTEL_DB.prepare("SELECT agent,severity,title,summary,status,confidence,first_seen,last_seen,evidence_json FROM intel_incidents WHERE last_seen >= ?1 ORDER BY CASE severity WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END DESC LIMIT 100").bind(since).all();
  const checks = await env.INTEL_DB.prepare("SELECT agent,target,status,latency_ms,http_status,checked_at FROM intel_checks WHERE checked_at >= ?1 ORDER BY checked_at DESC LIMIT 200").bind(since).all();
  const title = kind === "weekly" ? "AU weekly strategic briefing" : "AU daily executive summary";
  const body = [
    "Evidence-based automated summary; no generative model is configured in this foundation.",
    "Window start: " + since,
    "Incidents observed: " + (rows.results || []).length,
    "Health checks recorded: " + (checks.results || []).length,
    ...(rows.results || []).slice(0,20).map(r => "["+r.severity.toUpperCase()+"] "+r.title+" — "+r.summary+" (source: "+r.agent+", confidence: "+Math.round(r.confidence*100)+"%)"),
    ...(checks.results || []).length ? ["Latest check status: "+checks.results[0].target+" = "+checks.results[0].status] : ["No health-check records in this window."]
  ].join("\n");
  await env.INTEL_DB.prepare("INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status) VALUES (?1,?2,?3,?4,?5,'not_configured')")
    .bind(id(),kind,title,body,JSON.stringify({since,incidents:rows.results||[],checks:checks.results||[]})).run();
}
export default {
  async scheduled(controller, env, ctx) {
    if (env.INTELLIGENCE_ENABLED !== "true" || !env.INTEL_DB) {
      console.warn("MONTE WO Intelligence is not configured; no production monitoring action taken.");
      return;
    }
    if (controller.cron === "*/5 * * * *") ctx.waitUntil(websiteCheck(env));
    else if (controller.cron === "17 11 * * *") ctx.waitUntil(createBriefing(env,"daily"));
    else if (controller.cron === "23 11 * * 1") ctx.waitUntil(createBriefing(env,"weekly"));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({service:"MONTE WO Intelligence Worker",configured:env.INTELLIGENCE_ENABLED==="true" && !!env.INTEL_DB,live:false,detail:"Private admin/API integrations and notification delivery still require configuration."});
    return json({error:"Not found"},404);
  }
};
