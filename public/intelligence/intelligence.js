// MONTE WO Intelligence Command Center — client application.
// Rules: every displayed value comes from the authenticated API; missing data is labelled,
// never substituted. All dynamic content is DOM-built (textContent), never innerHTML.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, ...children) => {
    const node = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  };
  const relTime = iso => {
    if (!iso) return '—';
    const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (mins < 2880) return Math.round(mins / 60) + 'h ago';
    return Math.round(mins / 1440) + 'd ago';
  };
  const dateTime = iso => iso ? new Date(iso).toLocaleString() : '—';
  const pct = x => (x === null || x === undefined) ? '—' : (x * 100).toFixed(2) + '%';
  const ms = x => (x === null || x === undefined) ? '—' : Math.round(x) + ' ms';
  const dash = x => (x === null || x === undefined || x === '') ? '—' : x;
  const confPct = c => Math.round((Number(c) || 0) * 100) + '%';
  const agentIco = (agent, label) => el('span', { class: 'agent-ico ' + String(agent || '').toLowerCase(), 'aria-hidden': 'true' }, label || (agent === 'AU' ? 'AU' : String(agent || '?').charAt(0)));
  const sevChip = s => el('span', { class: 'sev-chip sev-' + (s || 'info'), text: String(s || 'info').toUpperCase() });
  const statusChip = s => el('span', { class: 'status-chip ' + String(s || '').toLowerCase(), text: String(s || '—') });
  const agentChip = a => el('span', { class: 'agent-chip ' + String(a || '').toLowerCase(), text: String(a || '—') });
  const confidenceBar = c => el('span', { class: 'confidence' }, el('span', { class: 'bar' }, el('span', { style: 'width:' + Math.round((Number(c) || 0) * 100) + '%' })), confPct(c));
  const agentStatusClass = st => 'st-' + String(st || '').toLowerCase().replace(/\s+/g, '-');

  // ---------- API ----------
  async function api(path, options = {}) {
    const init = { headers: { accept: 'application/json' }, cache: 'no-store', credentials: 'same-origin' };
    if (options.method) { init.method = options.method; }
    if (options.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(options.body); }
    let response;
    try { response = await fetch(path, init); }
    catch { return { ok: false, status: 0, code: 'network-unreachable' }; }
    let data = null;
    try { data = await response.json(); } catch { /* non-JSON */ }
    return { ok: response.ok, status: response.status, code: data && data.error ? data.error : null, data };
  }

  // ---------- shared state ----------
  const state = { overview: null, overviewCode: null, briefKind: 'daily', briefSelected: null, incidentFilters: { status: 'open', agent: '', severity: '' } };
  const setRail = (text, cls, sub) => {
    $('rail-status').textContent = text;
    $('rail-dot').className = 'dot ' + (cls || '');
    $('rail-sub').textContent = sub || '';
  };
  function systemPill(overview) {
    const pill = $('system-status');
    if (!overview) { pill.innerHTML = ''; pill.append(el('span', { class: 'dot amber' }), 'NOT LIVE'); pill.style.color = ''; return; }
    const label = overview.live ? (overview.health && overview.health.label === 'HEALTHY' ? 'LIVE · HEALTHY' : 'LIVE · ' + (overview.health ? overview.health.label : 'MONITORING')) : 'NOT LIVE';
    const cls = !overview.live ? 'amber' : overview.health && overview.health.label === 'HEALTHY' ? 'green' : overview.health && overview.health.label === 'AT RISK' ? 'red' : 'amber';
    pill.innerHTML = '';
    pill.append(el('span', { class: 'dot ' + cls }), label);
    pill.style.color = cls === 'green' ? 'var(--green)' : cls === 'red' ? 'var(--red)' : 'var(--amber)';
    setRail(overview.live ? 'PIPELINE LIVE' : 'NOT LIVE', cls, overview.live ? 'Telemetry is flowing and jobs are recorded.' : 'No live telemetry has been verified yet.');
  }

  async function loadOverview(force) {
    if (state.overview && !force && Date.now() - state.overviewAt < 30000) return state.overview;
    const res = await api('/api/intelligence/overview');
    if (res.ok) { state.overview = res.data; state.overviewAt = Date.now(); state.overviewCode = null; }
    else { state.overviewCode = res.code || 'error-' + res.status; }
    systemPill(res.ok ? res.data : null);
    if (!res.ok) setRail('BACKEND UNAVAILABLE', 'red', 'The intelligence API returned an error (' + (res.code || res.status) + ').');
    return res.ok ? res.data : null;
  }

  // ---------- error / setup panels ----------
  function errorPanel(code, status) {
    if (code === 'authentication-required' || code === 'invalid-token' || code === 'authentication-failed' || status === 401) {
      return panel(el('div', { class: 'empty' },
        el('span', { class: 'empty-ico' }, '🔒'),
        el('strong', {}, 'Cloudflare Access authentication required'),
        el('p', {}, 'This command center and its API are protected. Open this page through your Access-protected deployment URL and sign in with an authorized identity. The API also verifies every request server-side.')));
    }
    if (code === 'operator-not-provisioned') {
      return panel(el('div', { class: 'empty' },
        el('span', { class: 'empty-ico' }, '⛔'),
        el('strong', {}, 'Identity not provisioned as an operator'),
        el('p', {}, 'You authenticated successfully, but this identity has no active row in the intel_operators table. Ask the administrator to add your Access subject with a role, then reload.')));
    }
    if (code === 'intelligence-not-configured' || status === 503) {
      return panel(el('div', { class: 'empty' },
        el('span', { class: 'empty-ico' }, '⚙'),
        el('strong', {}, 'Intelligence backend is not configured'),
        el('p', {}, 'The API failed closed. Nothing is simulated. To go live: bind the INTEL_DB D1 database, apply migrations 0003 and 0004, set the Cloudflare Access variables, and deploy the scheduled Worker.'),
        el('ul', { class: 'setup-list' },
          ['INTEL_DB D1 binding on Pages (dedicated database)', 'Migrations 0003_intelligence.sql + 0004_intelligence_ops.sql applied', 'INTELLIGENCE_ACCESS_ISSUER / INTELLIGENCE_ACCESS_AUD set; Access app covers /intelligence/ and /api/intelligence/*', 'Cloudflare Access application + intel_operators provisioning', 'Scheduled Worker deployed with INTELLIGENCE_ENABLED=true'].map(s => el('li', {}, s))),
        el('p', { class: 'subtle', style: 'margin-top:12px' }, 'Full checklist: docs/INTELLIGENCE-COMMAND-CENTER.md')));
    }
    return panel(el('div', { class: 'empty' },
      el('span', { class: 'empty-ico' }, '⚠'),
      el('strong', {}, 'The intelligence API is unavailable'),
      el('p', {}, 'Error: ' + dash(code) + ' (HTTP ' + dash(status) + '). No fallback data is shown. Check the deployment and retry.')));
  }
  const panel = (...children) => el('section', { class: 'panel panel-pad' }, ...children);

  // ---------- canvas charts ----------
  function setupCanvas(canvas, height) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 300;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return { ctx: null, width, height }; // no 2D context: skip drawing, never break the view
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  }
  function sparkline(canvas, values, color) {
    const { ctx, width, height } = setupCanvas(canvas, 56);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const pts = (values || []).filter(v => typeof v === 'number');
    if (pts.length < 2) {
      ctx.strokeStyle = '#2a3442'; ctx.setLineDash([4, 4]); ctx.beginPath();
      ctx.moveTo(6, height / 2); ctx.lineTo(width - 6, height / 2); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#66778d'; ctx.font = '10px Inter, Arial';
      ctx.fillText(pts.length ? 'insufficient samples' : 'no data', 8, height / 2 - 8);
      return;
    }
    const min = Math.min(...pts), max = Math.max(...pts), span = (max - min) || 1;
    const x = i => 4 + (i / (pts.length - 1)) * (width - 8);
    const y = v => height - 8 - ((v - min) / span) * (height - 16);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, (color || '#5aadff') + '33'); grad.addColorStop(1, (color || '#5aadff') + '00');
    ctx.beginPath(); ctx.moveTo(x(0), y(pts[0]));
    pts.forEach((v, i) => ctx.lineTo(x(i), y(v)));
    ctx.lineTo(x(pts.length - 1), height); ctx.lineTo(x(0), height); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x(0), y(pts[0]));
    pts.forEach((v, i) => ctx.lineTo(x(i), y(v)));
    ctx.strokeStyle = color || '#5aadff'; ctx.lineWidth = 1.6; ctx.stroke();
  }
  function gauge(canvas, score, label) {
    const { ctx, width, height } = setupCanvas(canvas, 76);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height - 8, r = Math.min(width / 2 - 10, height - 16);
    const arc = (from, to, color, widthPx) => { ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * to); ctx.strokeStyle = color; ctx.lineWidth = widthPx; ctx.lineCap = 'round'; ctx.stroke(); };
    arc(0, 1, '#1d2836', 8);
    if (score === null || score === undefined) {
      ctx.fillStyle = '#66778d'; ctx.font = '700 15px Inter, Arial'; ctx.textAlign = 'center';
      ctx.fillText('no data', cx, cy - 8);
      return;
    }
    const color = score >= 97 ? '#75d7b0' : score >= 90 ? '#ffc46b' : '#ff444f';
    arc(0, Math.max(0.02, score / 100), color, 8);
    ctx.fillStyle = color; ctx.font = '900 24px Inter, Arial'; ctx.textAlign = 'center';
    ctx.fillText(String(score), cx, cy - 12);
    ctx.fillStyle = '#929cab'; ctx.font = '700 8px Inter, Arial';
    ctx.fillText(label || '', cx, cy - 1);
  }
  function statusStrip(canvas, checks) {
    const { ctx, width, height } = setupCanvas(canvas, 34);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const list = (checks || []).slice(-48);
    if (!list.length) { ctx.fillStyle = '#66778d'; ctx.font = '10px Inter, Arial'; ctx.fillText('no checks recorded', 8, height / 2 + 3); return; }
    const bw = Math.max(2, (width - 8) / 48 - 2);
    list.forEach((c, i) => {
      ctx.fillStyle = c.status === 'ok' ? '#2f7d5c' : c.status === 'degraded' ? '#8a6a2f' : '#8a2f3a';
      const x = 4 + i * ((width - 8) / 48);
      ctx.fillRect(x, 6, bw, height - 12);
    });
  }

  // ---------- overview ----------
  async function renderOverview() {
    const view = $('view');
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading verified intelligence…')));
    const data = await loadOverview(true);
    if (!data) { view.replaceChildren(errorPanel(state.overviewCode, state.overviewCode ? 503 : 0)); return; }
    const h = data.health || {};
    const open = data.incidents || { countsBySeverity: {}, open: [] };
    const critical = (open.countsBySeverity.critical || 0) + (open.countsBySeverity.high || 0);
    // urgent banner: latest urgent briefing within 48h, or open critical incidents
    const urgent = data.latestUrgent && (Date.now() - Date.parse(data.latestUrgent.created_at) < 48 * 3600000) ? data.latestUrgent : null;
    const banner = $('urgent-banner');
    if (urgent || (open.countsBySeverity.critical || 0) > 0) {
      banner.hidden = false;
      banner.replaceChildren(
        el('span', { class: 'u-ico', 'aria-hidden': 'true' }, '▲'),
        el('div', {},
          el('strong', {}, urgent ? urgent.title : 'Critical incident open — immediate attention required'),
          el('p', {}, urgent ? urgent.body.split('\n').slice(1, 4).join(' · ') : (open.countsBySeverity.critical || 0) + ' critical incident(s) are currently open. Review evidence and decide on action.')),
        el('button', { class: 'btn danger', onclick: () => { location.hash = '#/incidents'; } }, 'Review incidents'));
    } else { banner.hidden = true; }
    const kpis = el('div', { class: 'grid grid-4' },
      el('section', { class: 'panel kpi' },
        el('div', { class: 'kpi-top' }, el('span', {}, 'SYSTEM HEALTH'), el('span', { class: 'status-chip ' + (h.label === 'HEALTHY' ? 'resolved' : h.label === 'DEGRADED' ? 'investigating' : h.label === 'AT RISK' ? 'open' : '') }, h.label || '—')),
        el('div', { class: 'kpi-value ' + (h.score === null ? 's-off' : h.score >= 97 ? 's-ok' : h.score >= 90 ? 's-warn' : 's-bad') }, h.score === null || h.score === undefined ? '—' : h.score + '/100'),
        el('p', { class: 'kpi-note' }, h.basis || '')),
      el('section', { class: 'panel kpi' },
        el('div', { class: 'kpi-top' }, el('span', {}, 'AVAILABILITY · 24H'), el('span', { class: 'subtle' }, (data.checks ? data.checks.total24h : 0) + ' checks')),
        el('div', { class: 'kpi-value ' + (h.uptime === null ? 's-off' : h.uptime >= 0.99 ? 's-ok' : h.uptime >= 0.9 ? 's-warn' : 's-bad') }, pct(h.uptime)),
        el('p', { class: 'kpi-note' }, 'Share of ULTRON checks that returned healthy in the last 24 hours.')),
      el('section', { class: 'panel kpi' },
        el('div', { class: 'kpi-top' }, el('span', {}, 'LATENCY · P95 / AVG'), el('span', { class: 'subtle' }, 'website checks')),
        el('div', { class: 'kpi-value' }, ms(h.p95LatencyMs)),
        el('p', { class: 'kpi-note' }, 'Average ' + ms(h.avgLatencyMs) + '. Computed from recorded checks only.')),
      el('section', { class: 'panel kpi' },
        el('div', { class: 'kpi-top' }, el('span', {}, 'OPEN INCIDENTS'), el('span', { class: 'subtle' }, critical + ' high/critical')),
        el('div', { class: 'kpi-value ' + (open.open ? (open.countsBySeverity.critical ? 's-bad' : open.countsBySeverity.high ? 's-warn' : 's-info') : 's-ok') }, String(open.open ? open.open.length : 0)),
        el('p', { class: 'kpi-note' }, Object.entries(open.countsBySeverity || {}).filter(([, n]) => n > 0).map(([s, n]) => n + ' ' + s).join(' · ') || 'none open')));
    const agents = data.agents || {};
    const agentCard = (key, name, role, desc, agent) => {
      const a = agents[key] || {};
      const stats = key === 'ultron'
        ? [el('div', { class: 'agent-stat' }, el('b', {}, String((a.targets || []).length)), el('span', {}, 'targets')), el('div', { class: 'agent-stat' }, el('b', {}, relTime(a.lastRun ? a.lastRun.started_at : null)), el('span', {}, 'last run'))]
        : key === 'argon'
          ? [el('div', { class: 'agent-stat' }, el('b', {}, String((a.telemetry24h && a.telemetry24h.sessions) || 0)), el('span', {}, 'sessions 24h')), el('div', { class: 'agent-stat' }, el('b', {}, String((a.telemetry24h && a.telemetry24h.errors) || 0)), el('span', {}, 'error events'))]
          : [el('div', { class: 'agent-stat' }, el('b', {}, relTime(a.lastRun ? a.lastRun.started_at : null)), el('span', {}, 'last run')), el('div', { class: 'agent-stat' }, el('b', {}, String(a.openUrgent || 0)), el('span', {}, 'urgent 48h'))];
      return el('section', { class: 'panel agent-card ' + key },
        el('div', { class: 'agent-head' }, agentIco(agent, key === 'au' ? 'AU' : key.charAt(0).toUpperCase()),
          el('div', {}, el('h3', {}, name), el('small', {}, role)),
          el('span', { class: 'status-pill ' + agentStatusClass(a.status) }, a.status || '—')),
        el('p', { class: 'agent-desc' }, desc),
        el('div', { class: 'agent-stat-row' }, ...stats),
        el('p', { class: 'subtle' }, a.detail || ''));
    };
    const agentGrid = el('div', { class: 'grid grid-3' },
      agentCard('argon', 'ARGON', 'MOBILE APP INTELLIGENCE', 'Monitors app crashes, failed requests, login problems, release regressions and unusual usage patterns from privacy-bounded, untrusted telemetry.', 'argon'),
      agentCard('ultron', 'ULTRON', 'WEBSITE INTELLIGENCE', 'Runs scheduled availability, latency and route checks against the production website and verifies recovery after failures.', 'ultron'),
      agentCard('au', 'AU', 'INTELLIGENCE COORDINATION', 'Correlates ARGON and ULTRON findings, challenges weak conclusions, preserves history and briefs the executive with evidence-linked recommendations.', 'au'));
    // priority incidents + timeline
    const incidentsPanel = panel(
      el('div', { class: 'section-head' },
        el('div', {}, el('div', { class: 'eyebrow' }, 'LIVE EVIDENCE FEED'), el('h2', {}, 'Priority incidents')),
        el('button', { class: 'btn ghost', onclick: () => { location.hash = '#/incidents'; } }, 'All incidents →')),
      open.open && open.open.length ? incidentRows(open.open.slice(0, 5)) :
        el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '◎'), el('strong', {}, 'No open incidents recorded'),
          el('p', {}, 'This is a database query result, not a health claim. Check the agent statuses and job history above for monitoring coverage.')));
    const tl = await api('/api/intelligence/timeline?limit=14');
    const timelinePanel = panel(
      el('div', { class: 'section-head' }, el('div', {}, el('div', { class: 'eyebrow' }, 'AGENT ACTIVITY'), el('h2', {}, 'Recent activity'))),
      tl.ok && tl.data.items && tl.data.items.length ? el('div', { class: 'timeline' }, ...tl.data.items.map(tlItem)) :
        el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '…'), el('strong', {}, 'No recorded activity yet'),
          el('p', {}, 'Agent runs, incidents, briefings and audit events will appear here once the scheduled Worker is deployed and running.')));
    const auLatest = (agents.au && agents.au.latestDaily) || null;
    const briefingTeaser = panel(
      el('div', { class: 'section-head' },
        el('div', {}, el('div', { class: 'eyebrow' }, 'EXECUTIVE INTELLIGENCE'), el('h2', {}, 'Latest daily briefing')),
        el('button', { class: 'btn ghost', onclick: () => { location.hash = '#/briefings'; } }, 'Briefings →')),
      auLatest ? el('div', {},
        el('p', { class: 'subtle' }, dateTime(auLatest.created_at) + ' · delivery: ' + auLatest.delivery_status),
        el('p', { style: 'margin-top:8px;font-size:12.5px;color:#c3d1e2;line-height:1.7' }, 'Open the Briefings view for the full evidence-linked summary with recommendations and AU challenges.'))
        : el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '▤'), el('strong', {}, 'No briefing has been generated'),
          el('p', {}, 'AU produces the daily executive summary automatically once the scheduled Worker runs its daily job.')));
    view.replaceChildren(kpis, agentGrid, el('div', { class: 'split' }, incidentsPanel, el('div', { style: 'display:grid;gap:13px' }, timelinePanel, briefingTeaser)));
  }
  const incidentRows = list => el('div', {}, ...list.map(i => el('div', {
    class: 'tl-item', style: 'cursor:pointer', onclick: () => openIncident(i.id), role: 'button', tabindex: '0',
    onkeydown: e => { if (e.key === 'Enter') openIncident(i.id); }
  },
    el('span', { class: 'tl-dot', style: 'background:' + (i.severity === 'critical' ? 'var(--red)' : i.severity === 'high' ? '#ff7a45' : i.severity === 'medium' ? 'var(--gold)' : 'var(--blue)') }),
    el('div', { class: 'tl-body' }, el('strong', {}, i.title), el('small', {}, (i.summary || '').slice(0, 140) + ((i.summary || '').length > 140 ? '…' : ''))),
    el('span', { class: 'tl-time' }, relTime(i.last_seen)))));
  const tlItem = t => {
    const color = t.kind === 'incident-opened' ? 'var(--red)' : t.kind === 'incident-resolved' ? 'var(--green)' : t.kind === 'briefing' ? 'var(--gold)' : t.kind === 'agent-run' ? (t.title.includes('ok') ? 'var(--green)' : 'var(--red)') : 'var(--blue)';
    return el('div', { class: 'tl-item' },
      el('span', { class: 'tl-dot', style: 'background:' + color }),
      el('div', { class: 'tl-body' }, el('strong', {}, t.title), el('small', {}, (t.agent ? t.agent + ' · ' : '') + (t.detail || ''))),
      el('span', { class: 'tl-time' }, relTime(t.at)));
  };

  // ---------- incidents ----------
  async function renderIncidents() {
    const view = $('view');
    const f = state.incidentFilters;
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading incidents…')));
    const params = new URLSearchParams({ status: f.status, limit: '100' });
    if (f.agent) params.set('agent', f.agent);
    if (f.severity) params.set('severity', f.severity);
    const res = await api('/api/intelligence/incidents?' + params);
    if (!res.ok) { view.replaceChildren(errorPanel(res.code, res.status)); return; }
    const select = (label, value, options, onchange) => el('label', { class: 'subtle', style: 'display:flex;align-items:center;gap:7px' }, label,
      el('select', { onchange: e => onchange(e.target.value) }, ...options.map(o => el('option', { value: o[0], selected: value === o[0] ? '' : null }, o[1]))));
    const filters = el('div', { class: 'filters' },
      select('Status', f.status, [['open', 'Open'], ['investigating', 'Investigating'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['all', 'All']], v => { f.status = v; renderIncidents(); }),
      select('Agent', f.agent, [['', 'All agents'], ['ARGON', 'ARGON'], ['ULTRON', 'ULTRON'], ['AU', 'AU']], v => { f.agent = v; renderIncidents(); }),
      select('Severity', f.severity, [['', 'All'], ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['info', 'Info']], v => { f.severity = v; renderIncidents(); }));
    const rows = res.data.incidents || [];
    const table = el('table', { class: 'incident-table' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'Severity'), el('th', {}, 'Incident'), el('th', { class: 'hide-sm' }, 'Source'), el('th', { class: 'hide-sm' }, 'Evidence'),
        el('th', { class: 'hide-sm' }, 'Occurrences'), el('th', { class: 'hide-sm' }, 'Last seen'), el('th', {}, 'Status'))),
      el('tbody', {}, ...rows.map(i => el('tr', { onclick: () => openIncident(i.id), tabindex: '0', onkeydown: e => { if (e.key === 'Enter') openIncident(i.id); } },
        el('td', {}, sevChip(i.severity)),
        el('td', {}, el('div', { class: 't-title' }, i.title), el('div', { class: 't-sub' }, i.fingerprint)),
        el('td', { class: 'hide-sm' }, agentChip(i.agent)),
        el('td', { class: 'hide-sm' }, confidenceBar(i.confidence)),
        el('td', { class: 'hide-sm' }, String(i.occurrence_count ?? 1) + (i.correlation_group ? ' · linked' : '')),
        el('td', { class: 'hide-sm' }, relTime(i.last_seen)),
        el('td', {}, statusChip(i.status))))));
    view.replaceChildren(
      panel(el('div', { class: 'section-head' },
        el('div', {}, el('div', { class: 'eyebrow' }, 'INCIDENT REGISTER'), el('h2', {}, 'Incidents'),
          el('p', { class: 'subtle', style: 'margin-top:6px' }, 'Every incident is deduplicated by fingerprint, counts its observations, and carries evidence and confidence. Click a row for the full investigation workspace.')),
        el('span', { class: 'status-pill' }, rows.length + ' shown')), filters,
        rows.length ? table : el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '◎'), el('strong', {}, 'No incidents match this filter'), el('p', {}, 'This is the queried result — not an assertion that nothing happened. Adjust filters or check agent coverage in the overview.'))));
  }

  // ---------- incident drawer ----------
  async function openIncident(id) {
    const drawer = $('drawer'), overlay = $('drawer-overlay');
    drawer.hidden = false; overlay.hidden = false;
    drawer.replaceChildren(el('div', { class: 'loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading investigation workspace…')));
    const res = await api('/api/intelligence/incidents/' + id);
    if (!res.ok) { drawer.replaceChildren(drawerHead(null), errorPanel(res.code, res.status)); return; }
    const { incident: i, correlated, activity, relatedChecks } = res.data;
    const note = el('textarea', { placeholder: 'Investigation note (required when dismissing; recorded in the audit trail)', 'aria-label': 'Investigation note' });
    const act = async status => {
      const btn = el('button', { class: 'btn ' + (status === 'resolved' ? 'primary' : status === 'dismissed' ? 'danger' : ''), onclick: async e => {
        e.target.disabled = true;
        const r = await api('/api/intelligence/incidents/' + id, { method: 'POST', body: { status, note: note.value } });
        e.target.disabled = false;
        if (r.ok) { await openIncident(id); renderIncidents(); } else { alert('Action failed: ' + (r.code || r.status) + '. The note may be required for dismissals.'); }
      } }, status === 'investigating' ? 'Start investigating' : status === 'resolved' ? 'Resolve incident' : 'Dismiss (reason required)');
      return btn;
    };
    drawer.replaceChildren(
      drawerHead(i),
      el('div', { class: 'd-meta' }, sevChip(i.severity), agentChip(i.agent), statusChip(i.status),
        el('span', { class: 'status-chip' }, 'seen ' + (i.occurrence_count ?? 1) + '×'),
        i.auto_resolve ? el('span', { class: 'status-chip' }, 'auto-resolvable') : null,
        i.updated_by ? el('span', { class: 'status-chip' }, 'by ' + i.updated_by) : null),
      el('h3', {}, i.title),
      el('p', { class: 'subtle' }, 'Fingerprint ' + i.fingerprint),
      el('section', {}, el('h4', {}, 'Assessment'), el('p', { class: 'd-summary' }, i.summary || '')),
      el('section', {}, el('h4', {}, 'Evidence'),
        el('div', { class: 'evidence-block' }, JSON.stringify(i.evidence, null, 2)),
        el('p', { class: 'subtle', style: 'margin-top:8px' }, 'Classification labels inside evidence: fact = directly measured · hypothesis = plausible, unverified · missing-data = cannot conclude.')),
      correlated && correlated.length ? el('section', {}, el('h4', {}, 'Correlated findings'),
        el('div', {}, ...correlated.map(c => el('div', { class: 'tl-item', style: 'cursor:pointer', onclick: () => openIncident(c.id) },
          el('span', { class: 'tl-dot', style: 'background:var(--gold)' }),
          el('div', { class: 'tl-body' }, el('strong', {}, c.title), el('small', {}, c.agent + ' · ' + c.status)), el('span', { class: 'tl-time' }, sevChip(c.severity)))))) : null,
      relatedChecks && relatedChecks.length ? el('section', {}, el('h4', {}, 'Recent checks around first observation'),
        el('table', { class: 'mini-table' }, ...relatedChecks.slice(0, 8).map(c => el('tr', {}, el('td', {}, relTime(c.checked_at)), el('td', {}, c.target + ' · ' + c.status + (c.http_status ? ' · HTTP ' + c.http_status : '') + (c.latency_ms != null ? ' · ' + c.latency_ms + 'ms' : '')))))) : null,
      activity && activity.length ? el('section', {}, el('h4', {}, 'Audit trail'),
        el('table', { class: 'mini-table' }, ...activity.slice(0, 10).map(a => el('tr', {}, el('td', {}, relTime(a.created_at)), el('td', {}, a.actor + ' — ' + a.action + ' (' + a.outcome + ')'))))) : null,
      el('section', {}, el('h4', {}, 'Actions'),
        el('div', { class: 'd-actions' }, note,
          el('div', { class: 'action-row' }, act('investigating'), act('resolved'), act('dismissed')),
          el('p', { class: 'subtle' }, 'Status changes are audited with your operator identity. Reopened incidents preserve their history.'))));
  }
  const drawerHead = i => el('div', { class: 'drawer-head' },
    el('div', {}, el('div', { class: 'eyebrow' }, 'INVESTIGATION WORKSPACE'), i ? null : el('h3', {}, 'Incident')),
    el('button', { class: 'drawer-close', 'aria-label': 'Close panel', onclick: closeDrawer }, '✕'));
  function closeDrawer() { $('drawer').hidden = true; $('drawer-overlay').hidden = true; }

  // ---------- agents ----------
  async function renderAgents() {
    const view = $('view');
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading agent workspaces…')));
    const data = await loadOverview(true);
    if (!data) { view.replaceChildren(errorPanel(state.overviewCode, 503)); return; }
    const a = data.agents || {};
    const u = a.ultron || {}, g = a.argon || {}, au = a.au || {};
    const latencySeries = (data.checks && data.checks.series ? data.checks.series : []).map(c => c.latency_ms).filter(v => typeof v === 'number');
    const ultronPanel = panel(
      el('div', { class: 'section-head' }, el('div', {}, el('div', { class: 'eyebrow' }, 'WEBSITE INTELLIGENCE'), el('h2', {}, 'ULTRON'), el('p', { class: 'subtle' }, u.detail || '')),
        el('div', { class: 'action-row' },
          el('button', { class: 'btn', onclick: async e => { e.target.disabled = true; e.target.textContent = 'Verifying…'; const r = await api('/api/intelligence/verify', { method: 'POST', body: {} }); e.target.disabled = false; e.target.textContent = 'Verify all targets now'; if (r.ok) { await renderAgents(); } else { alert('Verification failed: ' + (r.code || r.status)); } } }, 'Verify all targets now'))),
      el('div', { class: 'grid grid-2', style: 'margin-top:6px' },
        el('div', {},
          el('p', { class: 'subtle', style: 'margin-bottom:6px' }, 'Monitored targets · 24h uptime'),
          (u.targets || []).length ? el('div', {}, ...u.targets.map(t => el('div', { class: 'target-row' },
            el('span', { class: 't-name' }, t.target),
            el('span', { class: 'status-chip ' + (t.lastStatus === 'ok' ? 'resolved' : t.lastStatus === 'degraded' ? 'investigating' : 'open') }, t.lastStatus || '—'),
            el('span', { class: 'uptime-bar' + (t.uptime24h === null ? ' bad' : t.uptime24h >= 0.99 ? '' : t.uptime24h >= 0.9 ? ' warn' : ' bad') }, el('span', { style: 'width:' + (t.uptime24h === null ? 0 : Math.max(3, t.uptime24h * 100)) + '%' })),
            el('span', { class: 'subtle', style: 'text-align:right' }, pct(t.uptime24h) + ' · ' + ms(t.avgLatencyMs)))))
            : el('p', { class: 'subtle' }, 'No targets have been checked yet.'),
          el('div', { class: 'chart-holder', style: 'margin-top:14px' },
            el('p', { class: 'subtle', style: 'margin-bottom:6px' }, 'Latency across recent checks'),
            (() => { const c = el('canvas', { class: 'chart', 'aria-label': 'Website latency sparkline' }); setTimeout(() => sparkline(c, latencySeries, '#ff444f')); return c; })())),
        el('div', {},
          el('p', { class: 'subtle', style: 'margin-bottom:6px' }, 'Check status strip (latest 48)'),
          (() => { const c = el('canvas', { class: 'chart', 'aria-label': 'Check status strip' }); setTimeout(() => statusStrip(c, data.checks ? data.checks.series : [])); return c; })(),
          el('p', { class: 'subtle', style: 'margin-top:12px' }, 'Scope: availability, latency, broken routes, deployment-visible regressions. Visitor behaviour is aggregate-only and imported as daily rollups when configured — never per-visitor tracking.'))));
    const argonPanel = panel(
      el('div', { class: 'section-head' }, el('div', {}, el('div', { class: 'eyebrow' }, 'MOBILE APP INTELLIGENCE'), el('h2', {}, 'ARGON'), el('p', { class: 'subtle' }, g.detail || '')), el('span', { class: 'status-pill ' + agentStatusClass(g.status) }, g.status || '—')),
      el('div', { class: 'agent-stat-row', style: 'margin:10px 0' },
        el('div', { class: 'agent-stat' }, el('b', {}, String((g.telemetry24h && g.telemetry24h.sessions) || 0)), el('span', {}, 'sessions 24h')),
        el('div', { class: 'agent-stat' }, el('b', {}, String((g.telemetry24h && g.telemetry24h.errors) || 0)), el('span', {}, 'error events')),
        el('div', { class: 'agent-stat' }, el('b', {}, relTime(g.lastRun ? g.lastRun.started_at : null)), el('span', {}, 'last analysis'))),
      (g.topErrors && g.topErrors.length) ? el('table', { class: 'mini-table' }, ...g.topErrors.map(e => el('tr', {}, el('td', {}, e.event_type), el('td', { class: 'mono' }, e.fingerprint), el('td', {}, e.n + ' events')))) : el('p', { class: 'subtle' }, 'No error fingerprints observed in the last 24h.'),
      el('div', { class: 'notice', style: 'margin-top:12px' }, 'Telemetry is strictly bounded: event type, app version, platform, error fingerprint and whitelisted details. Identifiers, free-form text and message contents are rejected at intake. All ARGON conclusions are labelled hypotheses and confidence-capped.'));
    const auPanel = panel(
      el('div', { class: 'section-head' }, el('div', {}, el('div', { class: 'eyebrow' }, 'INTELLIGENCE COORDINATION'), el('h2', {}, 'AU'), el('p', { class: 'subtle' }, au.detail || '')), el('span', { class: 'status-pill ' + agentStatusClass(au.status) }, au.status || '—')),
      el('div', { class: 'action-row', style: 'margin-top:12px' },
        el('button', { class: 'btn', onclick: async e => { e.target.disabled = true; const r = await api('/api/intelligence/analyze', { method: 'POST', body: {} }); e.target.disabled = false; if (r.ok) { await renderAgents(); } else { alert('Analysis failed: ' + (r.code || r.status)); } } }, 'Run ARGON analysis + AU correlation now'),
        el('button', { class: 'btn ghost', onclick: async e => { e.target.disabled = true; const r = await api('/api/intelligence/briefing', { method: 'POST', body: { kind: 'daily' } }); e.target.disabled = false; if (r.ok) { location.hash = '#/briefings'; state.briefKind = 'daily'; state.briefSelected = (await (await api('/api/intelligence/briefings?kind=daily&limit=1')).json()).briefings[0]?.id || null; renderBriefings(); } else { alert('Briefing failed: ' + (r.code || r.status)); } } }, 'Generate daily briefing now')),
      el('table', { class: 'kv-table' },
        el('tr', {}, el('td', {}, 'Last correlation run'), el('td', {}, relTime(au.lastRun ? au.lastRun.started_at : null))),
        el('tr', {}, el('td', {}, 'Latest daily briefing'), el('td', {}, au.latestDaily ? dateTime(au.latestDaily.created_at) : 'none generated')),
        el('tr', {}, el('td', {}, 'Latest weekly report'), el('td', {}, au.latestWeekly ? dateTime(au.latestWeekly.created_at) : 'none generated')),
        el('tr', {}, el('td', {}, 'Urgent alerts (48h)'), el('td', {}, String(au.openUrgent || 0)))),
      el('div', { class: 'notice', style: 'margin-top:12px' }, 'AU is deterministic and evidence-first: it correlates only temporally co-occurring findings, challenges every conclusion below the 0.6 confidence threshold, and never invents agent conversations. Every recommendation links to its evidence.'));
    view.replaceChildren(ultronPanel, argonPanel, auPanel);
  }

  // ---------- analysis room ----------
  async function renderAnalysis() {
    const view = $('view');
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading cross-agent analysis…')));
    const [correlated, briefings] = await Promise.all([
      api('/api/intelligence/incidents?agent=AU&status=all&limit=20'),
      api('/api/intelligence/briefings?kind=daily&limit=1')
    ]);
    if (!correlated.ok) { view.replaceChildren(errorPanel(correlated.code, correlated.status)); return; }
    let challenges = [], recommendations = [];
    if (briefings.ok && briefings.data.briefings && briefings.data.briefings.length) {
      const detail = await api('/api/intelligence/briefings/' + briefings.data.briefings[0].id);
      if (detail.ok) { challenges = detail.data.briefing.evidence.challenges || []; recommendations = (detail.data.briefing.evidence.recommendations || []).filter(r => r.decisionRequired); }
    }
    const au = correlated.data.incidents || [];
    view.replaceChildren(
      panel(el('div', { class: 'section-head' },
        el('div', {}, el('div', { class: 'eyebrow' }, 'AU · SECURE ANALYSIS ROOM'), el('h2', {}, 'Cross-agent correlations'),
          el('p', { class: 'subtle', style: 'margin-top:6px' }, 'Correlations are created only when ULTRON and ARGON report within a 30-minute window. They cite their members and resolve only when every member resolves.')),
        el('span', { class: 'status-pill' }, au.length + ' records')),
        au.length ? el('div', {}, ...au.map(i => el('div', { class: 'tl-item', style: 'cursor:pointer', onclick: () => openIncident(i.id), tabindex: '0', onkeydown: e => { if (e.key === 'Enter') openIncident(i.id); } },
          el('span', { class: 'tl-dot', style: 'background:var(--gold)' }),
          el('div', { class: 'tl-body' }, el('strong', {}, i.title), el('small', {}, 'members: ' + (i.correlation_group || '—') + ' · seen ' + (i.occurrence_count ?? 1) + '× · confidence ' + confPct(i.confidence))),
          el('span', { class: 'tl-time' }, relTime(i.last_seen)))))
          : el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '⟷'), el('strong', {}, 'No correlations recorded'),
            el('p', {}, 'This means no temporally co-occurring website + app failures have been observed — it is not a claim that systems are correlated or healthy.'))),
      el('div', { class: 'grid grid-2' },
        panel(el('div', {}, el('div', { class: 'eyebrow' }, 'AU CHALLENGES'), el('h2', {}, 'Contested conclusions'), el('p', { class: 'subtle', style: 'margin:6px 0 4px' }, 'Findings below the 0.6 confidence threshold. AU refuses to endorse action on these without verification.')),
          challenges.length ? el('div', {}, ...challenges.map(c => el('div', { class: 'challenge-card' },
            el('strong', {}, c.title), el('p', {}, c.challenge),
            el('p', { class: 'subtle', style: 'margin-top:5px' }, 'confidence ' + confPct(c.confidence) + ' · '),
            el('button', { class: 'btn ghost', style: 'margin-top:6px', onclick: () => openIncident(c.incidentId) }, 'Review evidence'))))
            : el('p', { class: 'subtle', style: 'margin-top:10px' }, 'No open findings are below the confidence threshold right now.')),
        panel(el('div', {}, el('div', { class: 'eyebrow' }, 'DECISIONS WAITING ON YOU'), el('h2', {}, 'Open decisions'), el('p', { class: 'subtle', style: 'margin:6px 0 4px' }, 'Recommendations from the latest daily briefing that require an executive decision.')),
          recommendations.length ? el('div', {}, ...recommendations.map(r => el('div', { class: 'rec-card' },
            el('div', { class: 'rec-head' }, el('strong', {}, r.title), el('span', { class: 'rec-decision' }, 'DECISION REQUIRED')),
            el('p', { class: 'subtle', style: 'margin-top:7px' }, r.rationale),
            el('div', { class: 'rec-meta' }, el('span', {}, 'confidence ', el('b', {}, confPct(r.confidence))), el('span', {}, 'impact ', el('b', {}, r.impact))))))
            : el('p', { class: 'subtle', style: 'margin-top:10px' }, 'No decision-required recommendations in the latest briefing.'))),
      panel(el('div', {}, el('div', { class: 'eyebrow' }, 'EVIDENCE STANDARDS'), el('h2', {}, 'How AU labels intelligence')),
        el('table', { class: 'kv-table', style: 'margin-top:8px' },
          el('tr', {}, el('td', {}, el('b', { class: 's-info' }, 'fact')), el('td', {}, 'Directly measured by a server-side check or recorded by an audited process.')),
          el('tr', {}, el('td', {}, el('b', { class: 's-warn' }, 'hypothesis')), el('td', {}, 'Plausible pattern (e.g. from untrusted client telemetry or temporal co-occurrence). Must be verified before irreversible action.')),
          el('tr', {}, el('td', {}, el('b', { class: 's-off' }, 'missing-data')), el('td', {}, 'The question cannot be answered with available data. AU reports the gap instead of guessing.'))),
        el('p', { class: 'subtle', style: 'margin-top:10px' }, 'Confidence values are deterministic functions of sample size and source trust — never decorative.')));
  }

  // ---------- briefings ----------
  async function renderBriefings() {
    const view = $('view');
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading briefings…')));
    const kind = state.briefKind;
    const list = await api('/api/intelligence/briefings?kind=' + kind + '&limit=30');
    if (!list.ok) { view.replaceChildren(errorPanel(list.code, list.status)); return; }
    const briefings = list.data.briefings || [];
    const tabs = el('div', { class: 'brief-tabs' }, ...[['urgent', 'Urgent alerts'], ['daily', 'Daily executive summary'], ['weekly', 'Weekly strategic report']].map(([k, label]) =>
      el('button', { class: 'brief-tab' + (kind === k ? ' active' : ''), onclick: () => { state.briefKind = k; state.briefSelected = null; renderBriefings(); } }, label)));
    const listCol = el('div', { class: 'brief-list' },
      briefings.length ? briefings.map(b => el('button', { class: 'brief-item' + (state.briefSelected === b.id ? ' selected' : ''), onclick: () => { state.briefSelected = b.id; renderBriefings(); } },
        el('strong', {}, b.title), el('small', {}, dateTime(b.created_at) + ' · delivery: ' + b.delivery_status)))
        : el('p', { class: 'subtle', style: 'padding:12px' }, 'No ' + kind + ' briefings recorded yet. ' + (kind === 'urgent' ? 'Urgent alerts are created when an incident escalates to critical.' : kind === 'daily' ? 'The daily job runs at 11:17 UTC in the scheduled Worker.' : 'The weekly job runs Mondays at 11:23 UTC.')));
    let detailCol;
    if (state.briefSelected) {
      const d = await api('/api/intelligence/briefings/' + state.briefSelected);
      if (!d.ok) detailCol = errorPanel(d.code, d.status);
      else {
        const b = d.data.briefing, ev = b.evidence || {};
        detailCol = panel(
          el('div', { class: 'section-head' }, el('div', {}, el('div', { class: 'eyebrow' }, b.kind.toUpperCase() + ' BRIEFING'), el('h2', {}, b.title)),
            el('span', { class: 'status-pill ' + (b.delivery_status === 'sent' ? 'st-operational' : b.delivery_status === 'failed' ? 'st-risk' : 'st-not-configured') }, 'delivery: ' + b.delivery_status)),
          el('p', { class: 'subtle' }, dateTime(b.created_at) + (d.data.notifications && d.data.notifications.length ? ' · ' + d.data.notifications.length + ' delivery attempt(s) logged' : '')),
          el('div', { class: 'brief-body' }, b.body),
          ...renderRecommendations(ev.recommendations),
          ...renderChallenges(ev.challenges));
      }
    } else {
      detailCol = panel(el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '▤'),
        el('strong', {}, 'Select a briefing'),
        el('p', {}, 'Briefings are generated from recorded evidence only. Recommendations link to their evidence, state confidence and impact, and flag the decisions that require you.')));
    }
    view.replaceChildren(panel(el('div', { class: 'section-head' },
      el('div', {}, el('div', { class: 'eyebrow' }, 'EXECUTIVE INTELLIGENCE'), el('h2', {}, 'Briefings'),
        el('p', { class: 'subtle', style: 'margin-top:6px' }, 'Three reporting levels: urgent alerts for critical incidents, daily executive summaries, and weekly strategic reports.')), tabs)),
      el('div', { class: 'brief-layout' }, listCol, detailCol));
  }
  const renderRecommendations = recs => !recs || !recs.length ? [] : [
    el('section', { style: 'margin-top:16px' }, el('h4', { class: 'eyebrow', style: 'margin-bottom:4px' }, 'RECOMMENDED ACTIONS'),
      ...recs.map(r => el('div', { class: 'rec-card' },
        el('div', { class: 'rec-head' }, el('strong', {}, r.title), r.decisionRequired ? el('span', { class: 'rec-decision' }, 'DECISION REQUIRED') : null),
        el('p', { class: 'subtle', style: 'margin-top:7px' }, r.rationale),
        el('div', { class: 'rec-meta' },
          el('span', {}, 'confidence ', el('b', {}, confPct(r.confidence))), el('span', {}, 'impact ', el('b', {}, r.impact)),
          el('span', {}, 'required from you: ', el('b', {}, r.decisionRequired ? 'a decision or approval' : 'review only'))),
        el('div', { class: 'rec-evidence' }, ...(r.evidence || []).map(e => e.type === 'incident'
          ? el('button', { onclick: () => openIncident(e.ref) }, '◈ evidence: ' + (e.summary || e.ref))
          : el('span', { class: 'subtle' }, '◇ evidence: ' + (e.summary || e.ref)))))))]
  const renderChallenges = challenges => !challenges || !challenges.length ? [] : [
    el('section', { style: 'margin-top:16px' }, el('h4', { class: 'eyebrow', style: 'margin-bottom:4px' }, 'AU CHALLENGES — VERIFY BEFORE ACTING'),
      ...challenges.map(c => el('div', { class: 'challenge-card' }, el('strong', {}, c.title), el('p', {}, c.challenge),
        el('button', { class: 'btn ghost', style: 'margin-top:6px', onclick: () => openIncident(c.incidentId) }, 'Review evidence'))))];

  // ---------- automation ----------
  async function renderAutomation() {
    const view = $('view');
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading automation governance…')));
    const res = await api('/api/intelligence/automation');
    if (!res.ok) { view.replaceChildren(errorPanel(res.code, res.status)); return; }
    const rules = res.data.rules || [];
    view.replaceChildren(
      panel(el('div', { class: 'section-head' },
        el('div', {}, el('div', { class: 'eyebrow' }, 'CONTROL & GOVERNANCE'), el('h2', {}, 'Bounded automation'),
          el('p', { class: 'subtle', style: 'margin-top:6px' }, res.data.policy)),
        el('span', { class: 'status-pill' }, rules.filter(r => r.enabled).length + ' of ' + rules.length + ' enabled'))),
      el('div', { class: 'grid' }, ...rules.map(r => {
        const confirmInput = el('input', { placeholder: 'Type "' + r.id + '" to confirm approval', 'aria-label': 'Confirmation for ' + r.id });
        return el('section', { class: 'panel rule-card' },
          el('div', { class: 'rule-head' }, el('div', {}, el('h3', {}, r.name), el('p', { class: 'subtle', style: 'margin-top:4px' }, 'action: ' + r.action_type)),
            el('span', { class: 'status-pill ' + (r.enabled ? 'rule-enabled' : 'rule-disabled') }, r.enabled ? 'ENABLED' : 'DISABLED')),
          el('p', { class: 'rule-desc' }, r.description),
          el('div', { class: 'rule-meta' },
            el('span', {}, 'approved by ', el('b', {}, r.explicitly_approved_by || '—')),
            el('span', {}, 'approved at ', el('b', {}, r.approved_at ? dateTime(r.approved_at) : '—')),
            el('span', {}, 'last run ', el('b', {}, relTime(r.last_run_at)))),
          el('p', { class: 'subtle' }, 'Rollback: ' + r.rollback_plan),
          el('div', { class: 'rule-actions' },
            r.enabled
              ? el('button', { class: 'btn danger', onclick: async e => { e.target.disabled = true; const out = await api('/api/intelligence/automation/' + r.id + '/revoke', { method: 'POST', body: {} }); e.target.disabled = false; if (out.ok) renderAutomation(); else alert('Revoke failed: ' + (out.code || out.status)); } }, 'Revoke approval')
              : el('div', { class: 'rule-confirm' }, confirmInput,
                el('button', { class: 'btn primary', onclick: async e => {
                  e.target.disabled = true;
                  const out = await api('/api/intelligence/automation/' + r.id + '/approve', { method: 'POST', body: { confirm: confirmInput.value } });
                  e.target.disabled = false;
                  if (out.ok) renderAutomation(); else alert('Approval failed: ' + (out.code || out.status) + '. The typed confirmation must match the rule id exactly.');
                } }, 'Approve rule'))));
      })),
      panel(el('div', {}, el('div', { class: 'eyebrow' }, 'AUTOMATION AUDIT'), el('h2', {}, 'Recent automation events'),
        (res.data.recentAudit && res.data.recentAudit.length)
          ? el('table', { class: 'mini-table', style: 'margin-top:8px' }, ...res.data.recentAudit.map(a => el('tr', {}, el('td', {}, relTime(a.created_at)), el('td', {}, a.actor + ' — ' + a.action + ' → ' + a.outcome + ' (' + a.target + ')'))))
          : el('p', { class: 'subtle', style: 'margin-top:8px' }, 'No automation events recorded yet.'))));
  }

  // ---------- audit ----------
  async function renderAudit() {
    const view = $('view');
    view.replaceChildren(el('section', { class: 'panel loading-panel' }, el('span', { class: 'spin' }), el('p', {}, 'Loading audit trail…')));
    const res = await api('/api/intelligence/audit?limit=100');
    if (!res.ok) { view.replaceChildren(errorPanel(res.code, res.status)); return; }
    const events = res.data.events || [];
    view.replaceChildren(panel(el('div', { class: 'section-head' },
      el('div', {}, el('div', { class: 'eyebrow' }, 'ACCOUNTABILITY'), el('h2', {}, 'Audit trail'),
        el('p', { class: 'subtle', style: 'margin-top:6px' }, 'Every operator action, automation decision, escalation and recovery is recorded with actor, target, outcome and timestamp.')),
      el('span', { class: 'status-pill' }, events.length + ' events')),
      events.length ? el('table', { class: 'incident-table' },
        el('thead', {}, el('tr', {}, el('th', {}, 'When'), el('th', {}, 'Actor'), el('th', {}, 'Action'), el('th', { class: 'hide-sm' }, 'Target'), el('th', {}, 'Outcome'))),
        el('tbody', {}, ...events.map(e => el('tr', {},
          el('td', { class: 'subtle', style: 'white-space:nowrap' }, dateTime(e.created_at)),
          el('td', { class: 'mono', style: 'font-size:11px' }, e.actor),
          el('td', {}, e.action),
          el('td', { class: 'hide-sm mono', style: 'font-size:11px' }, String(e.target).slice(0, 60)),
          el('td', {}, el('span', { class: 'status-chip' + (e.outcome === 'resolved' || e.outcome === 'enabled' || e.outcome === 'ok' ? ' resolved' : e.outcome === 'failed' || e.outcome === 'denied' ? ' open' : '') }, e.outcome))))))
        : el('div', { class: 'empty' }, el('span', { class: 'empty-ico' }, '▦'), el('strong', {}, 'No audit events yet'), el('p', {}, 'Events appear as operators act and automation runs.'))));
  }

  // ---------- router ----------
  const routes = { overview: renderOverview, incidents: renderIncidents, agents: renderAgents, analysis: renderAnalysis, briefings: renderBriefings, automation: renderAutomation, audit: renderAudit };
  function navigate() {
    const name = (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0];
    const route = routes[name] || renderOverview;
    document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.nav === (routes[name] ? name : 'overview')));
    closeDrawer();
    route();
  }
  window.addEventListener('hashchange', navigate);

  // ---------- refresh ----------
  let refreshing = false;
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    const button = $('refresh');
    button.disabled = true; button.textContent = 'Checking…';
    try { await navigate(); } finally {
      button.disabled = false; button.textContent = '↻ Refresh';
      $('last-updated').textContent = 'Last checked ' + new Date().toLocaleTimeString() + (state.overview ? '' : ' · backend unavailable');
      refreshing = false;
    }
  }
  $('refresh').addEventListener('click', refresh);
  $('drawer-overlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  // Auto-refresh only when the tab is visible; honours reduced-motion preferences.
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) setInterval(() => { if (!document.hidden && !refreshing) refresh(); }, 60000);
  navigate();
})();
