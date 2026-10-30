// TITAN — the MONTE WO continuous app-improvement agent.
//
// Mission: make the app simpler, faster, more reliable, easier to understand and cheaper to
// operate — preferring REMOVAL of complexity over addition of features. TITAN audits the mobile
// app source (static analysis, no network) and the ARGON telemetry already collected, and turns
// verified evidence into a prioritized backlog. It never edits code by itself: low-risk items are
// marked auto-eligible for an operator, and anything touching ranking standards, major redesigns,
// migrations, destructive operations, sensitive data or production is HARD-FLAGGED
// approval-required and can never be auto-eligible.
//
// Evidence rules (no fabrication):
//  - every finding carries machine evidence: file:line references, counts, or telemetry keys;
//  - evidence_type records how it was verified: 'static-analysis' | 'telemetry' | 'manual-review';
//  - confidence reflects evidence strength, not enthusiasm;
//  - if a check finds nothing, no finding is emitted. Silence is a result, not a gap.
import { nowIso } from './core.js';

export const TITAN_AGENT = 'titan';

// ---------------------------------------------------------------- priority model
// Deterministic and documented: impact x confidence / effort, minus a risk damper.
// impact/effort are 1..5 from the check; confidence is 0..1; risk low=1.0 medium=0.7 high=0.4.
export function priorityOf({ impact, effort, confidence, risk }) {
  const damper = risk === 'high' ? 0.4 : risk === 'medium' ? 0.7 : 1.0;
  return Math.round(((impact * confidence * damper) / Math.max(effort, 1)) * 100) / 100;
}

export function approvalFlagsFor(area, { rankingAffecting = false, redesign = false, migration = false, destructive = false, sensitiveData = false } = {}) {
  const flags = [];
  if (rankingAffecting) flags.push('ranking-affecting');
  if (redesign) flags.push('major-redesign');
  if (migration) flags.push('migration');
  if (destructive) flags.push('destructive');
  if (sensitiveData) flags.push('sensitive-data');
  if (area === 'ranking' || area === 'strength') flags.push('ranking-affecting');
  return flags;
}

// ---------------------------------------------------------------- source loading
async function readText(fetcher, path) {
  // One retry: local source servers can drop keep-alive connections mid-loop; a dropped
  // fetch must never silently shrink the evidence base.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetcher(path);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

// Reading the app source at runtime only works where the repo is reachable (local dev / CI).
// In production the check runs in CI or the worker with bundled sources; missing files are
// reported as 'sources-unavailable', never as findings.
async function loadAppSources(env, fetcher) {
  const base = env.TITAN_SOURCES_URL || '';
  if (!base) return { ok: false, reason: 'TITAN_SOURCES_URL not configured' };
  const root = base.replace(/\/$/, '');
  const files = [
    'apps/mobile/App.tsx',
    'apps/mobile/package.json',
    'apps/mobile/app.config.ts',
    'apps/mobile/index.ts'
  ];
  // Discover every module in src/ via a directory listing when the source server provides
  // one; otherwise fall back to the known core files. A missing file is silence, never evidence.
  try {
    const listing = await readText(fetcher, root + '/apps/mobile/src/');
    if (listing) for (const m of listing.matchAll(/href="([^"]+\.(?:ts|tsx))"/g)) files.push('apps/mobile/src/' + m[1]);
  } catch { /* listing unavailable */ }
  for (const fallback of ['apps/mobile/src/api.ts', 'apps/mobile/src/telemetry.ts', 'apps/mobile/src/catalog.ts', 'apps/mobile/src/workout-library.ts']) {
    if (!files.includes(fallback)) files.push(fallback);
  }
  const sources = {};
  for (const f of files) {
    const text = await readText(fetcher, root + '/' + f);
    if (text != null) sources[f] = text;
  }
  if (!Object.keys(sources).length) return { ok: false, reason: 'no sources readable at TITAN_SOURCES_URL', attempted: files.length };
  return { ok: true, sources, attempted: files.length };
}

function countMatches(text, pattern) {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

function lineOf(text, pattern) {
  const idx = text.search(pattern);
  if (idx < 0) return null;
  return text.slice(0, idx).split('\n').length;
}

// ---------------------------------------------------------------- static checks
// Each check returns { findings: [...] } — see priorityOf/approvalFlagsFor shapes.
function auditAppMonolith(sources, findings) {
  const app = sources['apps/mobile/App.tsx'];
  if (!app) return;
  const lines = app.split('\n').length;
  const screens = countMatches(app, /<Stack\.Screen/g);
  if (lines > 1500) {
    findings.push({
      evidence_key: `monolith-app-tsx-${Math.round(lines / 500) * 500}`,
      title: `App.tsx is a ${lines.toLocaleString()}-line monolith (${screens} stack screens)`,
      area: 'screens',
      problem: 'Every screen lives in one file. Changes to one screen risk breaking unrelated screens; review and testing are slow; merge conflicts are frequent.',
      evidence: { file: 'apps/mobile/App.tsx', lines, stackScreens: screens, tabs: countMatches(app, /<Tab\.Screen/g) },
      evidence_type: 'static-analysis',
      confidence: 0.95,
      proposed_change: 'Split App.tsx into one file per screen (screens/*.tsx) with a shared navigation module. No behavior change; pure extraction.',
      benefit: 'Faster reviews, safer changes, smaller mental load, no runtime cost (same bundle content).',
      cost: 'Medium — mechanical extraction + full test pass',
      risk: 'low',
      impact: 4, effort: 3,
      test_plan: 'npm test (mobile suite) + manual smoke of every tab and stack screen before/after; diff of navigation graph must be empty.',
      rollback_plan: 'Revert the extraction commit; navigation graph is unchanged so no data risk.'
    });
  }
}

function auditAccessibility(sources, findings) {
  const app = sources['apps/mobile/App.tsx'];
  if (!app) return;
  const touchables = countMatches(app, /<TouchableOpacity|<Pressable|<TouchableHighlight/g);
  const labelled = countMatches(app, /accessibilityLabel=/g);
  const unlabelled = Math.max(touchables - labelled, 0);
  // Only flag when a meaningful share of controls lack labels — avoid noise on tiny deltas.
  if (touchables >= 10 && unlabelled / touchables >= 0.5) {
    findings.push({
      evidence_key: 'a11y-unlabelled-touchables',
      title: `${unlabelled} of ${touchables} touchable controls have no accessibilityLabel`,
      area: 'accessibility',
      problem: 'Screen readers announce unlabeled buttons as "button" only. Athletes using TalkBack cannot distinguish Record from History, etc.',
      evidence: { file: 'apps/mobile/App.tsx', touchables, labelled, unlabelled, coveragePct: Math.round((labelled / touchables) * 100) },
      evidence_type: 'static-analysis',
      confidence: 0.9,
      proposed_change: 'Add accessibilityLabel (and accessibilityRole) to every interactive control, starting with tab actions, workout recording and verification screens.',
      benefit: 'Usable with screen readers; wider athlete reach; low risk since labels do not change layout.',
      cost: 'Low — additive props',
      risk: 'low',
      impact: 4, effort: 2,
      test_plan: 'Static re-count (coverage 100%) + manual TalkBack/VoiceOver pass on Home, Train, Performance.',
      rollback_plan: 'Labels are additive props; revert the commit or remove individual labels.'
    });
  }
}

function auditNetworkCalls(sources, findings) {
  const api = sources['apps/mobile/src/api.ts'];
  if (!api) return;
  const fetches = countMatches(api, /await fetch\(|fetch\(/g);
  const noCache = countMatches(api, /cache:|stale-while|ETag|If-None-Match/g);
  if (fetches >= 3 && noCache === 0) {
    findings.push({
      evidence_key: 'api-no-cache-headers',
      title: `API layer makes ${fetches} fetch calls with no cache/ETag handling`,
      area: 'performance',
      problem: 'On unreliable or metered connections (common for our athletes) every screen re-downloads unchanged catalog data.',
      evidence: { file: 'apps/mobile/src/api.ts', fetchCalls: fetches, cacheMechanisms: noCache },
      evidence_type: 'static-analysis',
      confidence: 0.8,
      proposed_change: 'Serve catalog/library responses with ETag and send If-None-Match from the app; 304 responses cost near-zero bytes. Also cache last-good payload in storage for offline.',
      benefit: 'Fewer bytes on metered connections, faster screens, resilience when offline.',
      cost: 'Low-Medium',
      risk: 'low',
      impact: 4, effort: 2,
      test_plan: 'Unit test ETag revalidation (304 path) + measured payload sizes before/after; telemetry should show session_bytes trend down.',
      rollback_plan: 'Remove If-None-Match header; server keeps serving full responses.'
    });
  }
}

function auditDependencies(sources, findings) {
  const pkgRaw = sources['apps/mobile/package.json'];
  if (!pkgRaw) return;
  let pkg; try { pkg = JSON.parse(pkgRaw); } catch { return; }
  const deps = Object.keys(pkg.dependencies || {});
  if (!sources['apps/mobile/App.tsx']) return;
  const allSource = Object.values(sources).join('\n');
  const unused = deps.filter(d => !new RegExp(`from ["']${d.replace('/', '\\/')}["']|require\\(["']${d.replace('/', '\\/')}["']\\)`).test(allSource));
  // Note: expo/react plugins and config deps appear in app.json — only flag clearly unused runtime deps.
  // Peer-required packages (e.g. react-native-screens for react-navigation) are excluded from
  // the claim: import scans cannot see peer contracts or Expo build-time use.
  const allowlist = ['expo', 'expo-status-bar', 'expo-secure-store', 'expo-crypto', 'react', 'react-native',
    'react-native-screens', 'react-native-safe-area-context'];
  const removable = unused.filter(d => !allowlist.includes(d));
  if (removable.length) {
    findings.push({
      evidence_key: 'deps-unused-runtime',
      title: `${removable.length} installed runtime dependencies are never imported`,
      area: 'dependencies',
      problem: 'Unused dependencies inflate install time, audit surface and upgrade risk for zero athlete value.',
      evidence: { file: 'apps/mobile/package.json', unusedDependencies: removable, totalDependencies: deps.length, scannedFiles: Object.keys(sources).length, assumption: 'Import scan cannot detect peer-dependency contracts or Expo build-time use; verify with npm ls and an Expo build before removal.' },
      evidence_type: 'static-analysis',
      confidence: 0.6,
      proposed_change: `Remove ${removable.join(', ')} from dependencies after confirming none are Expo config plugins.`,
      benefit: 'Smaller install/CI footprint, less upgrade risk, clearer dependency story.',
      cost: 'Low',
      risk: 'low',
      impact: 2, effort: 1,
      test_plan: 'npm install + full mobile test suite + app boots to Home; grep app.json for config plugin references before removal.',
      rollback_plan: 'Re-add the dependency lines (pure package.json change).'
    });
  }
}

function auditNavigationDepth(sources, findings) {
  const app = sources['apps/mobile/App.tsx'];
  if (!app) return;
  // Only flag recording depth when NO direct entry to the Performance screen exists:
  // a quick action on a tab screen makes the deep path optional, not the default.
  const perfScreen = /<Stack\.Screen[^>]*name="Performance"/.test(app);
  const exerciseScreen = /<Stack\.Screen[^>]*name="Exercise"/.test(app);
  const directEntries = countMatches(app, /navigate\(["']Performance["']\)/g);
  if (perfScreen && exerciseScreen && directEntries === 0) {
    findings.push({
      evidence_key: 'nav-recording-depth',
      title: 'Logging a workout takes 3 taps through the Exercise guide screen',
      area: 'recording',
      problem: 'The performance log sits behind Train → Exercise → Performance. For a strength app the log is the highest-frequency action; every extra tap is friction on the core loop.',
      evidence: { navigation: 'Tabs(Train) → Exercise → Performance', stackScreens: countMatches(app, /<Stack\.Screen/g), directPerformanceEntries: directEntries, evidence_type_note: 'Derived from the navigation graph in App.tsx; no direct navigate("Performance") entry found' },
      evidence_type: 'static-analysis',
      confidence: 0.85,
      proposed_change: 'Add a direct "Log performance" action on the Train tab (and/or a floating action on Home) that opens Performance with the last-used exercise pre-selected. No screens removed yet; measure before deciding bigger changes.',
      benefit: 'One tap less on the most frequent action; faster sessions; less abandonment mid-workout.',
      cost: 'Low-Medium',
      risk: 'low',
      impact: 5, effort: 2,
      test_plan: 'UI test: action visible on Train, opens Performance with pre-selected exercise; manual smoke both entry paths.',
      rollback_plan: 'Remove the action; existing Exercise → Performance path stays intact as the default.'
    });
  }
}

// ---------------------------------------------------------------- telemetry checks
function auditTelemetry(env, telemetry, findings) {
  if (!telemetry || !telemetry.length) return;
  const byFingerprint = {};
  for (const e of telemetry) {
    if (e.type !== 'js_error' && e.type !== 'app_crash' && e.type !== 'login_failed') continue;
    const key = `${e.type}:${e.fingerprint || 'unknown'}`;
    byFingerprint[key] = (byFingerprint[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(byFingerprint)) {
    const [type, fingerprint] = key.split(':');
    if (count < 3) continue; // single occurrences are noise, not evidence
    if (type === 'login_failed' && count >= 5) {
      findings.push({
        evidence_key: `telemetry-${key}`,
        title: `${count} failed sign-ins share fingerprint "${fingerprint}"`,
        area: 'login',
        problem: 'Repeated failures at one stage suggest a real friction point (bad error copy, expired-token handling, or a broken flow) rather than user mistakes.',
        evidence: { telemetryFingerprint: fingerprint, events: count, type, sampleCount: telemetry.filter(e => e.type === type && e.fingerprint === fingerprint).length },
        evidence_type: 'telemetry',
        confidence: 0.7,
        proposed_change: 'Reproduce the failing stage locally, fix the root cause, and make the error message state the exact next step. Track the fingerprint to zero in ARGON before closing.',
        benefit: 'Fewer lockouts, less support load, more trust in sign-in.',
        cost: 'Medium',
        risk: 'low',
        impact: 5, effort: 3,
        test_plan: 'Repro test for the failing stage + ARGON fingerprint count must trend to 0 after release.',
        rollback_plan: 'Error-message changes are safe; flow changes revert per commit.'
      });
    }
    if (type === 'js_error' && count >= 5) {
      findings.push({
        evidence_key: `telemetry-${key}`,
        title: `${count} JS errors share fingerprint "${fingerprint}"`,
        area: 'errors',
        problem: 'A clustered error fingerprint is a reproducible defect. In our seeded regression scenario v1.5.0 regressed on /library — the cluster is the signal.',
        evidence: { telemetryFingerprint: fingerprint, events: count, type, appVersions: [...new Set(telemetry.filter(e => e.fingerprint === fingerprint).map(e => e.appVersion))] },
        evidence_type: 'telemetry',
        confidence: 0.9,
        proposed_change: 'Reproduce with the recorded error class and screen, fix, and add a regression test. Track the fingerprint to zero in ARGON.',
        benefit: 'Directly removes crashes users already experience.',
        cost: 'Medium',
        risk: 'low',
        impact: 5, effort: 3,
        test_plan: 'Regression test referencing the error class + screen; fingerprint count must be zero after release.',
        rollback_plan: 'Standard commit revert; no data or ranking surface touched.'
      });
    }
    if (type === 'app_crash' && count >= 3) {
      findings.push({
        evidence_key: `telemetry-${key}`,
        title: `${count} crashes share fingerprint "${fingerprint}"`,
        area: 'errors',
        problem: 'Crash clusters are the top reliability defect; they also poison every other metric (sessions cut short, recordings lost).',
        evidence: { telemetryFingerprint: fingerprint, events: count, type, isFatal: true },
        evidence_type: 'telemetry',
        confidence: 0.95,
        proposed_change: 'Symbolicate the crash, fix the root cause, ship a regression test. Gate the release on ARGON crash-free sessions >= 99%.',
        benefit: 'Reliability is the app\'s foundation; every other improvement compounds on it.',
        cost: 'Medium-High',
        risk: 'medium',
        impact: 5, effort: 4,
        test_plan: 'Crash regression test + crash-free session rate in ARGON over 7 days.',
        rollback_plan: 'Standard commit revert; no data or ranking surface touched.'
      });
    }
  }
}

// ---------------------------------------------------------------- agent run
export async function runTitanAudit(env, db, { fetcher, correlationId } = {}) {
  const started = nowIso();

  // Telemetry evidence: only what ARGON actually collected (aggregate, consented events).
  const telemetry = await db.prepare(
    `SELECT event_type AS type, fingerprint, app_version AS appVersion FROM intel_telemetry_events ORDER BY occurred_at DESC LIMIT 500`
  ).all().then(r => r.results || []).catch(() => []);

  const findings = [];
  const sourceState = await loadAppSources(env, fetcher);
  if (sourceState.ok) {
    auditAppMonolith(sourceState.sources, findings);
    auditAccessibility(sourceState.sources, findings);
    auditNetworkCalls(sourceState.sources, findings);
    auditDependencies(sourceState.sources, findings);
    auditNavigationDepth(sourceState.sources, findings);
  }
  auditTelemetry(env, telemetry, findings);

  // Persist: upsert by evidence_key; never overwrite a human decision.
  const persisted = [];
  for (const f of findings) {
    const flags = approvalFlagsFor(f.area, f.flags || {});
    const priority = priorityOf(f);
    const id = `titan-${f.evidence_key}`;
      const existing = await db.prepare('SELECT id, status, decided_by, decision_note FROM intel_improvement_items WHERE evidence_key = ?').bind(f.evidence_key).first();
      if (existing) {
        // A machine-parked item (decided_by='titan') that is re-detected returns to proposed;
        // human decisions (any other decided_by) are never overwritten.
        const restoreProposed = existing.status === 'parked' && existing.decided_by === 'titan';
        await db.prepare(
          `UPDATE intel_improvement_items SET title=?, area=?, problem=?, evidence_json=?, evidence_type=?, confidence=?, proposed_change=?, benefit=?, cost=?, risk=?, approval_flags_json=?, test_plan=?, rollback_plan=?, priority=?, updated_at=?${restoreProposed ? ", status='proposed', decision_note=NULL, decided_by=NULL, decided_at=NULL" : ''} WHERE evidence_key=?`
        ).bind(f.title, f.area, f.problem, JSON.stringify(f.evidence), f.evidence_type, f.confidence, f.proposed_change, f.benefit, f.cost, f.risk, JSON.stringify(flags), f.test_plan, f.rollback_plan, priority, nowIso(), f.evidence_key).run();
        persisted.push({ id: existing.id, evidenceKey: f.evidence_key, status: restoreProposed ? 'proposed' : existing.status, priority, updated: true });
      } else {
      await db.prepare(
        `INSERT INTO intel_improvement_items (id, evidence_key, title, area, problem, evidence_json, evidence_type, confidence, proposed_change, benefit, cost, risk, approval_flags_json, test_plan, rollback_plan, status, priority, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'proposed', ?, ?, ?)`
      ).bind(id, f.evidence_key, f.title, f.area, f.problem, JSON.stringify(f.evidence), f.evidence_type, f.confidence, f.proposed_change, f.benefit, f.cost, f.risk, JSON.stringify(flags), f.test_plan, f.rollback_plan, priority, nowIso(), nowIso()).run();
      persisted.push({ id, evidenceKey: f.evidence_key, status: 'proposed', priority, updated: false });
    }
  }

  // Findings that a fresh audit no longer detects: if still merely 'proposed', park them
  // with an honest note. Human decisions (approved/rejected/implemented/...) are never touched.
  const detectedKeys = new Set(findings.map(f => f.evidence_key));
  const allItems = await db.prepare('SELECT id, evidence_key, status FROM intel_improvement_items').all().then(r => r.results || []).catch(() => []);
  let parked = 0;
  for (const row of allItems) {
    // Source-based items can only be parked when sources were actually readable this run:
    // an unavailable source is silence, not evidence of a fix.
    const isSourceItem = !row.evidence_key.startsWith('telemetry-');
    if (isSourceItem && !sourceState.ok) continue;
    if (row.status === 'proposed' && !detectedKeys.has(row.evidence_key)) {
      await db.prepare(`UPDATE intel_improvement_items SET status='parked', decision_note=?, decided_by='titan', decided_at=?, updated_at=? WHERE id=? AND status='proposed'`)
        .bind('Detector no longer fires against current sources; parked pending manual review.', nowIso(), nowIso(), row.id).run();
      parked++;
    }
  }

  const summary = {
    agent: TITAN_AGENT,
    startedAt: started,
      sourcesAvailable: sourceState.ok,
      sourcesReason: sourceState.ok ? null : sourceState.reason,
      sourcesAttempted: sourceState.attempted || 0,
      sourcesLoaded: sourceState.ok ? Object.keys(sourceState.sources || {}).length : 0,
    telemetryEventsReviewed: telemetry.length,
    findings: persisted.length,
    parkedUndetected: parked,
    byRisk: persisted.reduce((a, x) => { a[x.risk || 'low'] = (a[x.risk || 'low'] || 0) + 1; return a; }, {}),
    correlationId
  };
  return { ok: true, summary, items: persisted };
}

// Overview entry for the TITAN agent, shaped like the other agents (camelCase lastRun row).
export async function titanOverview(db, lastRun, lastSuccess) {
  const rows = await db.prepare(
    `SELECT id, status, risk, priority, approval_flags_json, decided_by, updated_at FROM intel_improvement_items ORDER BY priority DESC, updated_at DESC`
  ).all().then(r => r.results || []).catch(() => []);
  const counts = { proposed: 0, approved: 0, implemented: 0, rejected: 0, parked: 0, 'in-progress': 0, rechecked: 0, failed: 0 };
  let approvalPending = 0;
  for (const row of rows) {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
    let flags = []; try { flags = JSON.parse(row.approval_flags_json || '[]'); } catch { }
    if (row.status === 'proposed' && flags.length) approvalPending += 1;
  }
  const minutesSince = iso => iso ? Math.round((Date.now() - Date.parse(iso)) / 60000) : null;
  const age = minutesSince(lastRun?.started_at);
  const runFailed = lastRun && lastRun.status === 'failed';
  let status = 'NOT CONFIGURED';
  let detail = 'No TITAN improvement audit has run yet.';
  let nextAction = 'Run an audit with POST /api/intelligence/improve (or the TITAN view) to build the improvement backlog.';
  if (runFailed) {
    status = 'FAILED';
    detail = 'The last TITAN audit failed: ' + (lastRun.summary || 'unknown error');
    nextAction = 'Inspect the Worker logs and TITAN_SOURCES_URL, then re-run the audit.';
  } else if (lastRun) {
    if (age !== null && age > 7 * 24 * 60) {
      status = 'STALE';
      detail = `Last audit ran ${age} minutes ago; the backlog may not reflect current code.`;
      nextAction = 'Re-run the TITAN audit after app changes ship.';
    } else {
      status = 'OPERATIONAL';
      detail = `${rows.length} backlog item(s): ${counts.proposed} proposed, ${counts.approved} approved, ${counts.implemented} implemented.`;
      nextAction = counts.proposed
        ? `Review ${counts.proposed} proposed item(s) in the TITAN view and record decisions.`
        : 'Backlog is current; re-audit after the next app release.';
    }
  }
  return { status, detail, nextAction, lastRun: lastRun || null, lastSuccess: lastSuccess || null, counts, approvalPending, total: rows.length, topProposed: rows.filter(r => r.status === 'proposed').slice(0, 3) };
}
