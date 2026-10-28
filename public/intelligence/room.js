// MONTE WO Intelligence — AU ROOM: live 3D operations floor.
//
// WHAT THIS IS: a dependency-free 3D visualization (canvas 2D, perspective projection) of the
// REAL intelligence agents. Every avatar position, animation and screen value is derived from
// the authenticated /api/intelligence endpoints — statuses, run history, targets, findings,
// incidents. Nothing is scripted: an idle agent looks idle, and the HUD explains exactly why
// each avatar is doing what it does, with the real data behind it.
//
// WHAT THIS IS NOT: a claim that the agents are little robots in an office. They are
// server-side programs that run on triggers (manual or scheduled). The room makes their real
// activity visible; the fixed caption in the HUD says so, permanently.
//
// Integration: intelligence.js mounts this via MWRoom.mount(view, {api, el, relTime, dateTime})
// and calls MWRoom.unmount() on route change. All DOM is built with the app's CSP-safe el()
// helper (textContent only, CSSOM styling) — no raw HTML is ever injected.
(() => {
  'use strict';

  const VERSION = '1.0';
  let instance = null;

  // Agent identities — colors match the Command Center palette exactly. Layout per the
  // product brief: ARGON's blue mobile/app station LEFT, ULTRON's red website-health station
  // RIGHT, AU central coordinator, TITAN at a distinct side station (research/proposals only),
  // and the human owner seated at the central command position (never portrayed as an agent).
  const AGENTS = {
    argon: { name: 'ARGON', color: '#5aadff', station: { x: -8.6, z: 0 }, side: 1 },
    ultron: { name: 'ULTRON', color: '#ff444f', station: { x: 8.6, z: 0 }, side: -1 },
    au: { name: 'AU', color: '#e9ba63', station: { x: 0, z: -4.6 }, side: 1 },
    titan: { name: 'TITAN', color: '#7ee0c0', station: { x: -8.6, z: -5.8 }, side: 1 }
  };
  const KEYS = Object.keys(AGENTS);
  const OPERATOR = { name: 'VITAFLEX (SONY)', role: 'Owner / Operator', color: '#c9d7ee', pos: { x: 0, z: 3.6 } };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  // ---------- tiny color helpers ----------
  function hexRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function shade(hex, f, alpha) {
    const [r, g, b] = hexRgb(hex);
    const c = v => Math.round(clamp(v * f, 0, 255));
    return alpha === undefined ? `rgb(${c(r)},${c(g)},${c(b)})` : `rgba(${c(r)},${c(g)},${c(b)},${alpha})`;
  }

  window.MWRoom = {
    version: VERSION,
    unmount() {
      if (instance) instance.destroy();
      instance = null;
    },
    state() { return instance ? instance.state() : null; },
    mount(container, ctx) {
      if (!container || !ctx || typeof ctx.api !== 'function' || typeof ctx.el !== 'function') return null;
      if (instance && instance.container === container) { instance.poll(); return instance; } // re-navigate/refresh: keep the room, refresh data
      window.MWRoom.unmount();
      instance = createRoom(container, ctx);
      return instance;
    }
  };

  function createRoom(container, ctx) {
    const el = ctx.el;
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let destroyed = false;

    // ================= DOM =================
    const canvas = el('canvas', { class: 'room-canvas', 'aria-hidden': 'true' });
    const overlays = el('div', { class: 'room-overlays', 'aria-hidden': 'true' });
    const stage = el('div', { class: 'room-stage' }, canvas, overlays);

    const livePill = el('span', { class: 'room-pill', text: 'CONNECTING' });
    const btnVerify = el('button', { class: 'btn room-act', type: 'button', text: 'Run ULTRON verification' });
    const btnAnalyze = el('button', { class: 'btn room-act', type: 'button', text: 'Run ARGON + AU analysis' });
    const btnImprove = el('button', { class: 'btn room-act', type: 'button', text: 'Run TITAN audit' });
    const btnBriefing = el('button', { class: 'btn room-act', type: 'button', text: 'Generate AU briefing' });
    const btnDemo = el('button', { class: 'btn room-act demo-toggle', type: 'button', text: 'DEMO MODE: OFF', 'aria-pressed': 'false' });
    const hudTop = el('div', { class: 'room-hud room-hud-top' },
      el('div', { class: 'room-hud-title' }, el('strong', { text: 'AU ROOM' }), el('span', { class: 'room-hud-sub', text: 'live operations floor' }), livePill),
      el('p', { class: 'room-note' }, 'The avatars visualize the real server-side agents. Every position, animation and screen value is derived from live API data — motions represent actual run states and events, not a literal office. Idle agents look idle. Click any holographic screen or name tag to open the real records behind it.'),
      el('div', { class: 'room-acts' }, btnVerify, btnAnalyze, btnImprove, btnBriefing, btnDemo));

    const realList = el('div', { class: 'room-real-list' });
    const hudRight = el('div', { class: 'room-hud room-hud-right' },
      el('div', { class: 'room-hud-title' }, el('strong', { text: "What's real right now" }), el('span', { class: 'room-hud-sub', text: 'from the live API' })),
      realList);

    const hudBottom = el('div', { class: 'room-hud room-hud-bottom' },
      el('span', { class: 'room-hint', text: 'Drag to orbit · scroll to zoom · double-click to reset · click a name tag' }),
      el('span', { class: 'room-src', text: 'Values: /api/intelligence/overview · timeline · incidents · improvements' }));

    const toast = el('div', { class: 'room-toast', role: 'status', hidden: true });
    const watermark = el('div', { class: 'room-watermark', 'aria-hidden': 'true' },
      el('span', { text: 'SIMULATION · DEMO · SYNTHETIC EVENTS · NOT PRODUCTION DATA · SIMULATION · DEMO' }),
      el('span', { text: 'SIMULATION · DEMO · SYNTHETIC EVENTS · NOT PRODUCTION DATA · SIMULATION · DEMO' }),
      el('span', { text: 'SIMULATION · DEMO · SYNTHETIC EVENTS · NOT PRODUCTION DATA · SIMULATION · DEMO' }));
    const demoBadge = el('div', { class: 'room-demo-badge', hidden: true },
      el('strong', { text: 'SIMULATION / DEMO' }), ' — synthetic events only. Real data stays on the screens; nothing is written to production records.');
    stage.append(watermark, demoBadge);
    const wrap = el('div', { class: 'room-wrap' }, stage, hudRight, hudTop, hudBottom, toast);
    container.replaceChildren(el('section', { class: 'panel room-panel', 'aria-label': 'AU ROOM — live 3D operations floor' }, wrap));

    const g = canvas.getContext('2d');
    let W = 800, H = 500, DPR = 1, FOCAL = 900;

    // ================= camera + input =================
    const cam = { yaw: -0.18, pitch: 0.62, dist: 25, ty: 1.4 };
    const CAM0 = { ...cam };
    let interactedAt = 0;
    const pointers = new Map();
    let pinchDist = 0;

    function onPointerDown(e) { stage.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); interactedAt = performance.now(); }
    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      interactedAt = performance.now();
      if (pointers.size === 1) {
        cam.yaw -= (e.clientX - prev.x) * 0.005;
        cam.pitch = clamp(cam.pitch + (e.clientY - prev.y) * 0.004, 0.2, 1.25);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) cam.dist = clamp(cam.dist * pinchDist / d, 12, 44);
        pinchDist = d;
      }
    }
    function onPointerUp(e) { pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0; }
    function onWheel(e) { e.preventDefault(); cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.0012), 12, 44); interactedAt = performance.now(); }
    function onDblClick() { Object.assign(cam, CAM0); interactedAt = performance.now(); }
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('dblclick', onDblClick);

    // ================= projection =================
    function project(x, y, z) {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const y1 = (y - cam.ty) * cp - z1 * sp, z2 = (y - cam.ty) * sp + z1 * cp;
      const depth = z2 + cam.dist;
      if (depth < 1) return null;
      const s = FOCAL / depth;
      return { x: W / 2 + x1 * s, y: H / 2 - y1 * s, s, depth };
    }

    // ================= geometry: faces =================
    let faces = [];
    function quad(p1, p2, p3, p4, fill, opts = {}) {
      const a = project(p1[0], p1[1], p1[2]), b = project(p2[0], p2[1], p2[2]), c = project(p3[0], p3[1], p3[2]), d = project(p4[0], p4[1], p4[2]);
      if (!a || !b || !c || !d) return;
      // backface cull (screen-space winding)
      if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) >= 0 === !opts.both) return;
      faces.push({ pts: [a, b, c, d], depth: (a.depth + b.depth + c.depth + d.depth) / 4, fill, stroke: opts.stroke, glow: opts.glow, lw: opts.lw || 1 });
    }
    function box(cx, cy, cz, sx, sy, sz, color, opts = {}) {
      const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
      // optional yaw rotation around the box center (avatars face where they walk;
      // desks face the room center). Same rotation convention as the avatar rig.
      const yaw = opts.yaw || 0;
      const rc = Math.cos(yaw), rs = Math.sin(yaw);
      const R = p => {
        if (!yaw) return p;
        const dx = p[0] - cx, dz = p[2] - cz;
        return [cx + dx * rc + dz * rs, p[1], cz - dx * rs + dz * rc];
      };
      const F = [
        [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 1.0],   // top
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0.62],  // front (+z local)
        [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0.5],   // back
        [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], 0.72],  // left
        [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 0.8],   // right
        [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0.42]   // bottom
      ];
      for (const [a, b, c, d, f] of F) quad(R(a), R(b), R(c), R(d), shade(color, f), opts);
    }
    function line3(x1, y1, z1, x2, y2, z2, color, lw, glow) {
      const a = project(x1, y1, z1), b = project(x2, y2, z2);
      if (!a || !b) return;
      faces.push({ line: [a, b], depth: (a.depth + b.depth) / 2 + 0.01, stroke: color, glow, lw: lw || 1 });
    }

    // Interactive surfaces: clicking a holographic screen / the globe chip / an incident card
    // opens the corresponding REAL application view (the 2D Command Center routes).
    const VIEW_ROUTES = { argon: '#/analysis', ultron: '#/agents', au: '#/briefings', titan: '#/titan', op: '#/briefings', core: '#/overview', incident: '#/incidents' };
    function makeInteractive(node, label, hash) {
      node.classList.add('clickable');
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', label);
      let downAt = null;
      node.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
      node.addEventListener('click', e => {
        if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return; // was an orbit drag
        location.hash = hash;
      });
      node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = hash; } });
    }

    // ================= scene data =================
    const data = { overview: null, timeline: [], incidents: [], improvements: [], briefing: null, at: null, ok: false };
    const seen = new Set();
    let seeded = false;

    // avatars + stations
    const avatars = {};
    for (const key of KEYS) {
      const A = AGENTS[key];
      const toC = Math.atan2(-A.station.x, -A.station.z); // direction station -> center
      const home = {
        x: A.station.x + Math.sin(toC + Math.PI / 2) * 2.6 * A.side * -1,
        z: A.station.z + Math.cos(toC + Math.PI / 2) * 2.6 * A.side * -1
      };
      const approach = { x: A.station.x * 0.32, z: A.station.z * 0.32 }; // walking stop near the central table
      avatars[key] = {
        key, x: home.x, z: home.z, facing: toC, phase: Math.random() * TAU,
        home, approach, toC, path: [], mode: 'working', holdUntil: 0, patrolAt: performance.now() + 15000 + Math.random() * 15000,
        flashUntil: 0, visitCard: null
      };
    }

    // holo screens: geometry + HTML overlay
    const screens = {};
    for (const key of KEYS) {
      const A = AGENTS[key];
      const ang = Math.atan2(-A.station.x, -A.station.z); // normal towards center
      const w = 4.3, h = 2.5, baseY = 1.18;
      const dx = Math.sin(ang), dz = Math.cos(ang);       // facing direction (towards center)
      const rx = Math.cos(ang), rz = -Math.sin(ang);      // right axis along screen width
      const c = A.station;
      const corners = [
        [c.x - rx * w / 2, baseY, c.z - rz * w / 2],
        [c.x + rx * w / 2, baseY, c.z + rz * w / 2],
        [c.x + rx * w / 2, baseY + h, c.z + rz * w / 2],
        [c.x - rx * w / 2, baseY + h, c.z - rz * w / 2]
      ];
      const body = el('div', { class: 'room-holo' });
      const tag = el('button', { class: 'room-tag', type: 'button' });
      tag.addEventListener('click', () => selectAgent(key));
      makeInteractive(body, 'Open the ' + A.name + ' view', VIEW_ROUTES[key]);
      overlays.append(body, tag);
      screens[key] = { corners, ang, body, tag, w };
    }

    // owner/operator station (human — Vitaflex (Sony)) — command console facing the table
    const opAng = Math.atan2(-OPERATOR.pos.x, -OPERATOR.pos.z);
    const opw = 3.6, oph = 2.0, opBase = 1.15;
    const orx = Math.cos(opAng), orz = -Math.sin(opAng);
    const opc = OPERATOR.pos;
    const opScreen = {
      corners: [
        [opc.x - orx * opw / 2, opBase, opc.z - orz * opw / 2],
        [opc.x + orx * opw / 2, opBase, opc.z + orz * opw / 2],
        [opc.x + orx * opw / 2, opBase + oph, opc.z + orz * opw / 2],
        [opc.x - orx * opw / 2, opBase + oph, opc.z - orz * opw / 2]
      ],
      ang: opAng, body: el('div', { class: 'room-holo human' }),
      tag: el('button', { class: 'room-tag human', type: 'button' }), w: opw
    };
    opScreen.tag.addEventListener('click', () => selectAgent('op'));
    makeInteractive(opScreen.body, 'Open the briefings view (owner)', VIEW_ROUTES.op);
    overlays.append(opScreen.body, opScreen.tag);
    screens.op = opScreen;

    // central table + core + incident cards
    const tableCards = [];
    const coreChip = el('div', { class: 'room-core-chip' });
    makeInteractive(coreChip, 'Open the overview view', VIEW_ROUTES.core);
    overlays.append(coreChip);
    let particles = [];
    function seedParticles() {
      particles = [];
      if (reduced) return;
      for (let i = 0; i < 42; i++) particles.push({ x: (Math.random() - 0.5) * 24, y: 0.3 + Math.random() * 4.6, z: (Math.random() - 0.5) * 17, v: 0.08 + Math.random() * 0.2, p: Math.random() * TAU });
    }
    seedParticles();

    // ================= real-data rendering =================
    function healthColor() {
      if (!data.ok || !data.overview) return '#6b7688';
      if (!data.overview.live) return '#6b7688';
      const l = String((data.overview.health || {}).label || '');
      return l === 'HEALTHY' ? '#48e5a0' : l === 'AT RISK' ? '#ffb454' : '#ff5a5f';
    }

    // Reality-mode taxonomy required by the product brief. Derived only from real API state.
    function modeLabel(act) {
      if (!data.ok || !data.overview) return 'NOT CONNECTED';
      if (act.label.includes('FAIL')) return 'FAILED';
      if (act.label.includes('AWAITING')) return 'IDLE / WAITING';
      return 'LIVE';
    }
    const MODE_CLASS = { 'LIVE': 'live', 'IDLE / WAITING': 'idle', 'NOT CONNECTED': 'nc', 'FAILED': 'failed' };

    function activity(key) {
      const d = data.overview && data.overview.agents ? data.overview.agents[key] : null;
      if (!data.ok || !data.overview) return { mode: 'offline', label: 'NO DATA', why: 'The intelligence API could not be reached. The room shows nothing rather than simulate activity.' };
      if (!d) return { mode: 'offline', label: 'UNKNOWN', why: 'No data returned for this agent.' };
      const st = String(d.status || '').toUpperCase();
      const lr = d.lastRun || {};
      const ago = lr.finished_at ? (Date.now() - Date.parse(lr.finished_at)) / 1000 : null;
      if (st.includes('FAIL')) return { mode: 'offline', label: st, why: 'Last run FAILED — ' + (lr.summary || 'unknown error') };
      if (st.includes('AWAITING')) return { mode: 'awaiting', label: st, why: d.detail || 'Awaiting data.' };
      if (ago !== null && ago < 240) return { mode: 'just-ran', label: st, why: 'Real run finished ' + Math.round(ago) + 's ago — ' + (lr.summary || '') };
      return { mode: 'working', label: st, why: 'Last real run ' + ctx.relTime(lr.finished_at) + ' — ' + (lr.summary || 'no runs recorded') };
    }

    function short(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

    function screenContent(key) {
      const A = AGENTS[key] || { name: OPERATOR.name, color: OPERATOR.color };
      const act = activity(key);
      const d = data.ok && data.overview && data.overview.agents ? data.overview.agents[key] : null;
      const rows = [];
      const head = el('div', { class: 'room-holo-head' },
        el('strong', { text: A.name }),
        el('span', { class: 'room-dot', style: 'background:' + (act.mode === 'offline' ? '#6b7688' : A.color) }),
        el('span', { class: 'room-holo-status', text: act.label }));
      rows.push(head);
      const bodyEl = el('div', { class: 'room-holo-body' });
      if (key === 'op') {
        bodyEl.append(el('p', { class: 'room-holo-line', text: 'Owner console — briefings from AU' }));
        if (data.briefing) {
          bodyEl.append(el('div', { class: 'room-holo-line' }, el('span', { class: 'room-holo-mono', text: short(data.briefing.title, 34) })));
          bodyEl.append(el('div', { class: 'room-holo-line' }, el('span', { class: 'room-holo-dim', text: ctx.relTime(data.briefing.created_at) + ' · delivery ' + (data.briefing.delivery_status || '—') })));
        } else bodyEl.append(el('p', { class: 'room-holo-line dim', text: 'No briefing generated yet.' }));
        bodyEl.append(el('p', { class: 'room-holo-line dim', text: 'Automation + TITAN proposals need explicit approval here.' }));
      } else if (!d) {
        bodyEl.append(el('p', { class: 'room-holo-line dim', text: data.ok ? 'No data for this agent.' : 'API unreachable — nothing simulated.' }));
      } else if (key === 'ultron') {
        const tg = Array.isArray(d.targets) ? d.targets : [];
        if (tg.length) for (const t of tg) {
          bodyEl.append(el('div', { class: 'room-holo-line' },
            el('span', { class: 'room-dot ' + (t.lastStatus === 'ok' ? 'ok' : 'bad') }),
            el('span', { class: 'room-holo-mono', text: short(t.target, 14) }),
            el('span', { text: 'up ' + Math.round((t.uptime24h || 0) * 100) + '%' }),
            el('span', { class: 'room-holo-dim', text: Math.round(t.avgLatencyMs || 0) + 'ms · ' + ctx.relTime(t.lastCheckedAt) })));
        } else bodyEl.append(el('p', { class: 'room-holo-line dim', text: 'No targets configured.' }));
        const vf = d.visitorFunnel;
        bodyEl.append(el('p', { class: 'room-holo-line dim', text: vf && vf.status === 'ok'
          ? 'traffic analytics: ' + (vf.pageviews7d || 0) + ' views (7d aggregate)'
          : 'traffic analytics: NOT CONNECTED' }));
      } else if (key === 'argon') {
        const t24 = d.telemetry24h || {};
        if (!t24.sessions && !t24.errors) {
          bodyEl.append(el('p', { class: 'room-holo-line dim', text: 'AWAITING FIRST TELEMETRY' }));
          bodyEl.append(el('p', { class: 'room-holo-line dim', text: short(d.nextAction || 'No telemetry ingested yet.', 46) }));
          bodyEl.append(el('span', { class: 'room-scan' }));
        } else {
          bodyEl.append(el('div', { class: 'room-holo-line' }, el('span', { text: 'sessions ' + (t24.sessions || 0) }), el('span', { class: 'room-holo-dim', text: 'errors ' + (t24.errors || 0) })));
          for (const e of (d.topErrors || []).slice(0, 3)) bodyEl.append(el('div', { class: 'room-holo-line' }, el('span', { class: 'room-holo-mono', text: short(e.name || e.event || '?', 26) }), el('span', { class: 'room-holo-dim', text: String(e.count || e.n || '?') })));
        }
      } else if (key === 'au') {
        const lr = d.lastRun || {};
        bodyEl.append(el('p', { class: 'room-holo-line', text: short(lr.summary || 'No correlation runs recorded.', 60) }));
        const open = data.incidents.length;
        bodyEl.append(el('div', { class: 'room-holo-line' },
          el('span', { text: open + ' open incident' + (open === 1 ? '' : 's') }),
          el('span', { class: 'room-holo-dim', text: 'health ' + ((data.overview.health || {}).score ?? '—') })));
        const u = data.overview.latestUrgent;
        if (u && u.title) bodyEl.append(el('p', { class: 'room-holo-line warn', text: 'URGENT: ' + short(u.title, 44) }));
      } else if (key === 'titan') {
        const items = data.improvements.slice(0, 4);
        if (items.length) for (const it of items) {
          bodyEl.append(el('div', { class: 'room-holo-line' },
            el('span', { class: 'room-holo-chip ' + String(it.status || '').toLowerCase(), text: short(it.status || '?', 4) }),
            el('span', { class: 'room-holo-mono', text: short(it.title || it.id, 34) })));
        } else bodyEl.append(el('p', { class: 'room-holo-line dim', text: 'No findings in the backlog.' }));
        bodyEl.append(el('p', { class: 'room-holo-line dim', text: data.improvements.length + ' finding(s) total · proposals only until owner approval' }));
      }
      rows.push(bodyEl);
      rows.push(el('div', { class: 'room-holo-foot', text: (data.ok ? 'live API · ' + ctx.relTime(data.overview && data.overview.generatedAt) : 'no connection') + ' · click to open ↗' }));
      return rows;
    }

    // Live tag chip: shows the typed lifecycle phase while a task is active (DEMO-prefixed
    // for synthetic tasks), otherwise the reality mode. Updated on every phase transition.
    function updateTagChip(key) {
      const S = screens[key];
      if (!S || !S.tag) return;
      const av = avatars[key];
      const mode = modeLabel(activity(key));
      const task = av.task;
      const chip = task ? (task.isDemo ? 'DEMO · ' : '') + (PHASE_VERB[task.phase] || task.phase) : mode;
      const cls = task ? (task.isDemo ? 'demo' : task.phase === 'task-failed' ? 'failed' : 'live') : (MODE_CLASS[mode] || '');
      S.tag.replaceChildren(
        el('span', { class: 'room-dot on', style: 'background:' + (task ? (task.isDemo ? '#b98cff' : AGENTS[key].color) : mode === 'LIVE' ? AGENTS[key].color : mode === 'FAILED' ? '#ff5a5f' : '#8b97a8') }),
        el('strong', { text: AGENTS[key].name }),
        el('span', { class: 'room-mode ' + cls, text: chip }));
      S.tag.className = 'room-tag' + (task || mode === 'LIVE' ? '' : ' off');
    }

    function rebuildScreens() {
      for (const key of KEYS) {
        const S = screens[key];
        S.body.replaceChildren(...screenContent(key));
        S.body.classList.toggle('off', activity(key).mode === 'offline');
        S.body.classList.toggle('waiting', activity(key).mode === 'awaiting');
        updateTagChip(key);
      }
      // operator console (human — never an AI agent)
      opScreen.body.replaceChildren(...screenContent('op'));
      opScreen.tag.replaceChildren(
        el('span', { class: 'room-dot on', style: 'background:' + OPERATOR.color }),
        el('strong', { text: OPERATOR.name }),
        el('span', { class: 'room-tag-status', text: 'OWNER / OPERATOR' }));
      opScreen.tag.className = 'room-tag human';
      // live pill (simulation state is unmistakable while demo mode is on)
      if (demo) { livePill.textContent = 'SIMULATION / DEMO'; livePill.className = 'room-pill demo'; }
      else if (data.ok && data.overview) {
        livePill.textContent = data.overview.live ? 'LIVE · ' + String((data.overview.health || {}).label || 'MONITORING') : 'NOT LIVE';
        livePill.className = 'room-pill ' + (data.overview.live ? 'on' : '');
      } else { livePill.textContent = 'BACKEND UNAVAILABLE'; livePill.className = 'room-pill bad'; }
      // core chip
      const h = (data.overview && data.overview.health) || null;
      coreChip.replaceChildren(
        el('span', { class: 'room-dot on', style: 'background:' + healthColor() }),
        el('strong', { text: h ? 'HEALTH ' + h.score : 'NO DATA' }),
        el('span', { class: 'room-core-sub', text: h ? (h.label || '') + ' · ' + Math.round((h.uptime || 0) * 100) + '% up' : 'API unreachable' }));
      coreChip.style.color = healthColor();
      rebuildRealList(selected);
    }

    // ================= HUD: what's real =================
    let selected = null;
    function modeVerb(m) { return m === 'working' || m === 'just-ran' ? 'at console — working' : m === 'awaiting' ? 'idle — awaiting data' : m === 'visit' ? 'reviewing a new event at the table' : 'offline'; }
    function rebuildRealList(sel) {
      const nodes = [];
      if (sel === 'op') {
        const back = el('button', { class: 'btn room-back', type: 'button', text: '← all agents' });
        back.addEventListener('click', () => { selected = null; rebuildRealList(null); });
        nodes.push(el('div', { class: 'room-real-row big human' },
          el('div', { class: 'room-real-head' }, el('span', { class: 'room-dot on', style: 'background:' + OPERATOR.color }), el('strong', { text: OPERATOR.name }), el('span', { class: 'room-tag-status', text: 'OWNER / OPERATOR' })),
          back,
          el('p', { class: 'room-why', text: OPERATOR.role + ' — a human, never portrayed as an AI agent. AU correlates ARGON and ULTRON evidence and prepares briefings for this station.' }),
          el('dl', { class: 'room-facts' },
            el('div', {}, el('dt', { text: 'Latest briefing' }), el('dd', { text: data.briefing ? short(data.briefing.title, 60) : 'none generated yet' })),
            el('div', {}, el('dt', { text: 'Generated' }), el('dd', { text: data.briefing ? ctx.dateTime(data.briefing.created_at) : '—' })),
            el('div', {}, el('dt', { text: 'Delivery' }), el('dd', { text: data.briefing ? String(data.briefing.delivery_status || '—') : '—' })),
            el('div', {}, el('dt', { text: 'Approvals' }), el('dd', { text: 'All automation disabled by default; TITAN proposals wait for explicit owner action.' }))),
          el('p', { class: 'room-why dim', text: 'In production this station is the Cloudflare Access-authenticated owner. In this preview the local-operator bypass stands in (gate-free mode by owner request).' })));
      } else if (sel) {
        const A = AGENTS[sel], act = activity(sel);
        const d = data.ok && data.overview && data.overview.agents ? data.overview.agents[sel] : null;
        const lr = (d && d.lastRun) || {};
        const back = el('button', { class: 'btn room-back', type: 'button', text: '← all agents' });
        back.addEventListener('click', () => { selected = null; rebuildRealList(null); });
        nodes.push(el('div', { class: 'room-real-row big' },
          el('div', { class: 'room-real-head' }, el('span', { class: 'room-dot on', style: 'background:' + A.color }), el('strong', { text: A.name }), el('span', { class: 'room-holo-status', text: act.label })),
          back,
          el('p', { class: 'room-why', text: act.why }),
          d && d.detail ? el('p', { class: 'room-why dim', text: d.detail }) : null,
          el('dl', { class: 'room-facts' },
            el('div', {}, el('dt', { text: 'Last run' }), el('dd', { text: (lr.run_type || '—') + ' · ' + (lr.status || '—') })),
            el('div', {}, el('dt', { text: 'Finished' }), el('dd', { text: ctx.dateTime(lr.finished_at) })),
            el('div', {}, el('dt', { text: 'Summary' }), el('dd', { text: lr.summary || '—' })),
            d && d.nextAction ? el('div', {}, el('dt', { text: 'Next action' }), el('dd', { text: d.nextAction })) : null),
          el('p', { class: 'room-why dim', text: 'Avatar is ' + modeVerb(act.mode) + ' because of the above — nothing else.' })));
        const mine = data.timeline.filter(t => String(t.agent || '').toLowerCase() === sel).slice(0, 5);
        if (mine.length) {
          nodes.push(el('div', { class: 'room-real-sub' }, el('strong', { text: 'Recent real events' }),
            ...mine.map(t => el('div', { class: 'room-holo-line' }, el('span', { class: 'room-holo-dim', text: ctx.relTime(t.at) }), el('span', { text: short(t.title, 40) })))));
        }
      } else {
        const opRow = el('button', { class: 'room-real-row human', type: 'button' },
          el('span', { class: 'room-dot on', style: 'background:' + OPERATOR.color }),
          el('strong', { text: OPERATOR.name }),
          el('span', { class: 'room-real-verb', text: 'owner / operator — human' }),
          el('p', { class: 'room-why', text: 'Not an AI agent. AU prepares briefings for the owner; automation rules and TITAN proposals require explicit approval from this station.' + (data.briefing ? ' Latest briefing: ' + short(data.briefing.title, 44) + ' (' + ctx.relTime(data.briefing.created_at) + ').' : '') }));
        opRow.addEventListener('click', () => { selected = 'op'; rebuildRealList('op'); });
        nodes.push(opRow);
        for (const key of KEYS) {
          const A = AGENTS[key], act = activity(key);
          const av = avatars[key];
          const mode = modeLabel(act);
          const row = el('button', { class: 'room-real-row', type: 'button' },
            el('span', { class: 'room-dot on', style: 'background:' + (mode === 'LIVE' ? A.color : '#8b97a8') }),
            el('strong', { text: A.name }),
            el('span', { class: 'room-real-verb room-mode ' + (av.task ? (av.task.isDemo ? 'demo' : 'live') : (MODE_CLASS[mode] || '')), text: av.task ? ((av.task.isDemo ? 'demo — ' : '') + (PHASE_VERB[av.task.phase] || av.task.phase).toLowerCase()) : mode }),
            el('p', { class: 'room-why', text: act.why }));
          row.addEventListener('click', () => { selected = key; rebuildRealList(key); });
          nodes.push(row);
        }
        nodes.push(el('p', { class: 'room-why foot', text: data.ok ? 'Data checked ' + ctx.relTime(data.at) + '. The room re-checks every 12 seconds. Modes: LIVE (real runs recorded), IDLE / WAITING, NOT CONNECTED — never fabricated.' : 'Backend unreachable — nothing is being simulated.' }));
      }
      realList.replaceChildren(...nodes);
    }
    function selectAgent(key) { selected = key; rebuildRealList(key); }

    // ================= task lifecycle (typed, event-driven) =================
    // Phases: task-assigned -> investigating -> evidence-found / reporting -> task-completed
    // (+ presenting-briefing when AU reports to the owner, task-failed on real failures).
    // Every phase is tied to a REAL trigger: a run actually executing server-side (the
    // investigating phase spans the in-flight request — the extra visual hold is pacing only,
    // the run itself is real), or a real persisted timeline event arriving via polling.
    // DEMO tasks are synthetic, labeled, exist only while demo mode is on, and never call
    // the API — see toggleDemo.
    const PHASE_VERB = {
      'task-assigned': 'TASK ASSIGNED',
      'investigating': 'INVESTIGATING',
      'evidence-found': 'EVIDENCE FOUND',
      'reporting': 'REPORTING',
      'task-completed': 'COMPLETED',
      'presenting-briefing': 'PRESENTING BRIEFING',
      'task-failed': 'TASK FAILED'
    };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const cardEls = [];

    function phasePoint(key, phase) {
      const av = avatars[key];
      if (phase === 'evidence-found' || phase === 'reporting') return { ...av.approach };
      if (phase === 'presenting-briefing') return { x: OPERATOR.pos.x + 2.5, z: OPERATOR.pos.z - 0.5 };
      return { ...av.home };
    }
    function startTask(key, script, meta) {
      const av = avatars[key];
      if (av.task) return false; // one task at a time; real tasks are never interrupted by demos
      av.task = { script, step: 0, phase: null, phaseUntil: 0, meta: meta || {}, isDemo: !!(meta && meta.isDemo) };
      enterStep(key, 0);
      return true;
    }
    function enterStep(key, i) {
      const av = avatars[key], task = av.task;
      if (!task) return;
      task.step = i;
      const step = task.script[i];
      task.phase = step[0];
      task.phaseUntil = performance.now() + step[1];
      const point = phasePoint(key, task.phase);
      if (point && (point.x !== av.x || point.z !== av.z)) av.path = [point];
      if (task.phase === 'task-completed') av.flashUntil = performance.now() + 1500;
      if ((task.phase === 'reporting' || task.phase === 'evidence-found' || task.phase === 'presenting-briefing') && task.meta.card) showLifecycleCard(key, task);
      updateTagChip(key);
    }
    function endTask(key) {
      const av = avatars[key];
      av.task = null;
      av.path = [{ ...av.home }];
      updateTagChip(key);
    }
    function showLifecycleCard(key, task) {
      const card = task.isDemo
        ? el('div', { class: 'room-card demo', 'aria-label': 'Simulation card' },
            el('div', { class: 'room-card-head' }, el('span', { class: 'room-demo-tag', text: 'SIMULATION' }), el('strong', { text: AGENTS[key].name })),
            el('p', { text: short(task.meta.card.title, 56) }),
            el('p', { class: 'room-card-sub', text: task.meta.card.sub || 'synthetic event — not production data' }))
        : el('div', { class: 'room-card' },
            el('div', { class: 'room-card-head' }, el('span', { class: 'room-dot on', style: 'background:' + AGENTS[key].color }), el('strong', { text: AGENTS[key].name })),
            el('p', { text: short(task.meta.card.title, 56) }),
            el('p', { class: 'room-card-sub', text: task.meta.card.sub || 'real record' }));
      overlays.append(card);
      cardEls.push({ el: card, anchor: task.phase === 'presenting-briefing' ? 'owner' : 'table', until: performance.now() + 6200 });
      setTimeout(() => card.remove(), 6400);
    }
    // A real persisted timeline event arrived -> the producing agent reviews it at the table.
    function queueVisit(key, item) {
      if (avatars[key].task) return;
      startTask(key, [['evidence-found', 6000], ['task-completed', 1200]],
        { card: { title: item.title || item.kind || 'event', sub: ctx.relTime(item.at) + ' · real timeline event' } });
    }

    function updateAvatars(now, dt) {
      for (const key of KEYS) {
        const av = avatars[key];
        const act = activity(key);
        const task = av.task;

        // advance the typed lifecycle (scripts are data; real actions rewrite them on completion)
        if (task) {
          if (now > task.phaseUntil) {
            if (task.step < task.script.length - 1) enterStep(key, task.step + 1);
            else endTask(key);
          }
        } else if (act.mode === 'just-ran' && !av.flashed) {
          av.flashUntil = now + 1500; av.flashed = true;
          setTimeout(() => { av.flashed = false; }, 1600);
        }

        // AU correlation patrol: only when operational and taskless — represents its real
        // cross-agent correlation job, which is exactly why AU moves the most. The route is a
        // deterministic rotation through the real workstations (never random activity, and
        // never while a lifecycle task owns the avatar).
        if (key === 'au' && !task && act.mode !== 'offline' && !av.path.length && now > av.patrolAt && !reduced) {
          const targets = [{ ...av.approach }, ...KEYS.filter(k => k !== 'au').map(k => ({ x: AGENTS[k].station.x * 0.55, z: AGENTS[k].station.z * 0.55 }))];
          av.patrolIdx = ((av.patrolIdx || 0) + 1) % targets.length;
          av.path = [targets[av.patrolIdx]];
          av.holdUntil = now + 3500;
          av.patrolVisit = true;
        }
        if (av.patrolVisit && !task && !av.path.length && now > av.holdUntil) { av.patrolVisit = false; av.path = [{ ...av.home }]; }

        // walking
        if (av.path.length && !reduced) {
          const t = av.path[0];
          const dx = t.x - av.x, dz = t.z - av.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.08) av.path.shift();
          else {
            const sp = Math.min(2.3 * dt, d);
            av.x += dx / d * sp; av.z += dz / d * sp;
            const want = Math.atan2(dx, dz);
            let dd = want - av.facing;
            while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
            av.facing += dd * Math.min(1, dt * 10);
          }
          av.phase += dt * 7.2;
          av.walking = true;
        } else {
          if (reduced && av.path.length) { const t = av.path.shift(); av.x = t.x; av.z = t.z; }
          // purposeful idle: face the screen, the table, or the owner depending on phase
          const ph = task ? task.phase : null;
          const faceTo = ph === 'presenting-briefing' ? OPERATOR.pos
            : (ph === 'reporting' || ph === 'evidence-found') ? { x: 0, z: 0 }
            : { x: AGENTS[key].station.x, z: AGENTS[key].station.z };
          const want = Math.atan2(faceTo.x - av.x, faceTo.z - av.z);
          let dd = want - av.facing;
          while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
          av.facing += dd * Math.min(1, dt * 6);
          const workish = ph === 'investigating' || ph === 'task-assigned' || (!ph && (act.mode === 'working' || act.mode === 'just-ran'));
          av.phase += dt * (workish ? 5.5 : (!ph && act.mode === 'awaiting') ? 1.1 : 0.7);
          av.walking = false;
        }
        av.mode = task ? (task.isDemo ? 'demo' : task.phase) : (act.mode === 'just-ran' ? 'working' : act.mode);
      }
    }

    // ================= drawing =================
    function drawFloor() {
      const c0 = project(-13, 0, -9.5), c1 = project(13, 0, -9.5), c2 = project(13, 0, 9.5), c3 = project(-13, 0, 9.5);
      if (c0 && c1 && c2 && c3) {
        const grd = g.createLinearGradient(0, Math.min(c0.y, c3.y), 0, Math.max(c1.y, c2.y));
        grd.addColorStop(0, '#0c1424'); grd.addColorStop(1, '#070b13');
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(c0.x, c0.y); g.lineTo(c1.x, c1.y); g.lineTo(c2.x, c2.y); g.lineTo(c3.x, c3.y); g.closePath(); g.fill();
      }
      g.lineWidth = 1;
      for (let x = -12; x <= 12; x += 2) line3(x, 0.01, -9.5, x, 0.01, 9.5, 'rgba(96,150,220,0.12)', 1);
      for (let z = -8; z <= 8; z += 2) line3(-13, 0.01, z, 13, 0.01, z, 'rgba(96,150,220,0.12)', 1);
      // center ring under the table
      const ring = (r, col, lw) => { for (let i = 0; i < 40; i++) { const a1 = i / 40 * TAU, a2 = (i + 1) / 40 * TAU; line3(Math.cos(a1) * r, 0.02, Math.sin(a1) * r, Math.cos(a2) * r, 0.02, Math.sin(a2) * r, col, lw); } };
      ring(3.1, 'rgba(120,180,255,0.22)', 1.5);
      ring(3.35, 'rgba(120,180,255,0.08)', 1);
    }

    function drawStation(key) {
      const A = AGENTS[key], S = screens[key];
      const c = A.station;
      const ang = S.ang; // desks and consoles face the room center
      // desk
      box(c.x, 0.525, c.z, 4.6, 1.05, 1.7, '#1c2740', { yaw: ang, stroke: 'rgba(130,170,230,0.28)' });
      // desk top plate accent
      box(c.x, 1.08, c.z, 4.1, 0.06, 1.3, '#26334e', { yaw: ang });
      // console block on desk (offset towards the room center)
      box(c.x + Math.sin(ang) * 0.22, 1.28, c.z + Math.cos(ang) * 0.22, 1.5, 0.38, 0.7, '#141d30', { yaw: ang });
      // holo screen (translucent quad, both sides visible)
      quad(S.corners[0], S.corners[1], S.corners[2], S.corners[3], shade(A.color, 1, act_alpha(key)), { both: true, stroke: shade(A.color, 1, 0.55), glow: A.color, lw: 1.5 });
      // small base stem
      box(c.x, 1.14, c.z, 0.16, 0.18, 0.16, '#0f1626');
    }
    function act_alpha(key) { const m = activity(key).mode; return m === 'offline' ? 0.03 : m === 'awaiting' ? 0.05 : 0.09; }

    // Owner/operator station: command desk facing the central table + a seated hooded figure.
    // Human — no work animations, no visor; only a subtle breathing bob.
    function drawOperator(t) {
      const c = OPERATOR.pos, ang = screens.op.ang;
      // wide command desk
      box(c.x, 0.55, c.z, 4.4, 1.1, 1.5, '#20304a', { yaw: ang, stroke: 'rgba(150,180,220,0.3)' });
      box(c.x, 1.13, c.z, 3.9, 0.06, 1.15, '#2b3d5c', { yaw: ang });
      // console on the desk
      box(c.x, 1.32, c.z, 1.9, 0.34, 0.5, '#16223a', { yaw: ang });
      // high-backed chair behind (further from the table)
      box(c.x - Math.sin(ang) * 1.05, 1.05, c.z - Math.cos(ang) * 1.05, 1.1, 2.1, 0.28, '#1a2438', { yaw: ang });
      // seated figure: torso, hooded head, forearms on the desk — anonymous silhouette
      const bob = reduced ? 0 : Math.sin(t * 0.9) * 0.012;
      const fx = Math.sin(ang), fz = Math.cos(ang);
      const bx = c.x - fx * 0.55, bz = c.z - fz * 0.55; // seated behind the desk
      box(bx, 1.28 + bob, bz, 0.95, 1.05, 0.62, '#242e46', { yaw: ang });           // torso
      box(bx, 1.98 + bob, bz, 0.55, 0.5, 0.52, '#2c3854', { yaw: ang });            // head
      box(bx, 2.14 + bob, bz, 0.68, 0.34, 0.62, '#1d2740', { yaw: ang });           // hood over the head
      box(c.x + fx * 0.15, 1.22 + bob, c.z + fz * 0.15, 1.3, 0.16, 0.5, '#242e46', { yaw: ang }); // forearms on desk
      // owner console holo screen
      quad(screens.op.corners[0], screens.op.corners[1], screens.op.corners[2], screens.op.corners[3], 'rgba(150,180,225,0.07)', { both: true, stroke: 'rgba(170,195,235,0.5)', glow: '#a9c4ec', lw: 1.5 });
    }

    function drawTable(t) {
      // hexagonal table
      const R = 2.15, h = 1.0, N = 6;
      const top = [], bot = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU + Math.PI / 6;
        top.push([Math.cos(a) * R, h, Math.sin(a) * R]);
        bot.push([Math.cos(a) * R, 0, Math.sin(a) * R]);
      }
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        quad(bot[i], bot[j], top[j], top[i], '#1a2333', { both: true });
      }
      // top face as fan
      for (let i = 1; i < N - 1; i++) quad(top[0], top[i], top[i + 1], top[i + 1], '#232f47', { both: true });
      // central holographic globe (the approved concept's centerpiece): wireframe sphere
      // with latitude rings and rotating meridians, colored by REAL system health.
      const col = healthColor();
      const pulse = data.incidents.length ? 0.10 : 0.04;
      const GR = 1.0 * (1 + Math.sin(t * (data.incidents.length ? 3.2 : 1.4)) * pulse);
      const cy = 2.6, rot = t * 0.35;
      const SP = (lat, lng) => {
        const la = lat * Math.PI / 180, lo = lng * Math.PI / 180 + rot;
        return [GR * Math.cos(la) * Math.sin(lo), cy + GR * Math.sin(la), GR * Math.cos(la) * Math.cos(lo)];
      };
      // meridians (great circles through the poles — rotating = spinning globe)
      for (let m = 0; m < 6; m++) {
        const base = m * 30;
        for (let i = 0; i < 36; i++) {
          const a = SP(-90 + i * 5, base), b = SP(-90 + (i + 1) * 5, base);
          line3(a[0], a[1], a[2], b[0], b[1], b[2], shade(col, 1, 0.5), 1.2, true);
        }
      }
      // latitude rings
      for (const lat of [-60, -30, 0, 30, 60]) {
        for (let i = 0; i < 36; i++) {
          const a = SP(lat, i * 10), b = SP(lat, (i + 1) * 10);
          line3(a[0], a[1], a[2], b[0], b[1], b[2], shade(col, 1, lat === 0 ? 0.75 : 0.35), lat === 0 ? 1.6 : 1, lat === 0);
        }
      }
      // beam from table to globe + under-glow
      line3(0, h, 0, 0, cy - GR, 0, shade(col, 1, 0.3), 1.2, true);
      glowPool(0, 0.03, 0, 2.6, col, 0.16 + Math.sin(t * 1.4) * 0.05);
    }

    // soft colored light pool on the floor (station lighting / under-glow)
    function glowPool(x, y, z, r, color, alpha) {
      const c = project(x, y, z);
      if (!c) return;
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU;
        const p = project(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
        if (!p) return;
        pts.push(p);
      }
      const grd = g.createRadialGradient(c.x, c.y, 1, c.x, c.y, Math.max(4, Math.hypot(pts[0].x - c.x, pts[0].y - c.y)));
      grd.addColorStop(0, shade(color, 1, alpha));
      grd.addColorStop(1, shade(color, 1, 0));
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath(); g.fill();
    }

    // panoramic window wall (back, z = -9.5): frames, night gradient, stars
    const stars = [];
    for (let i = 0; i < 46; i++) stars.push({ x: (Math.random() - 0.5) * 24, y: 2.2 + Math.random() * 3.4, tw: Math.random() * TAU });
    function drawWindows(t) {
      // glass
      quad([-12.5, 0.9, -9.6], [12.5, 0.9, -9.6], [12.5, 6.2, -9.6], [-12.5, 6.2, -9.6], 'rgba(16,28,52,0.55)', { both: true });
      // horizon glow strip
      quad([-12.5, 0.9, -9.55], [12.5, 0.9, -9.55], [12.5, 1.7, -9.55], [-12.5, 1.7, -9.55], 'rgba(70,120,200,0.16)', { both: true });
      // mullions
      for (let x = -12; x <= 12; x += 3) line3(x, 0.9, -9.5, x, 6.2, -9.5, 'rgba(120,160,220,0.22)', 1.5);
      line3(-12.5, 6.2, -9.5, 12.5, 6.2, -9.5, 'rgba(120,160,220,0.28)', 1.5);
      line3(-12.5, 0.9, -9.5, 12.5, 0.9, -9.5, 'rgba(120,160,220,0.28)', 1.5);
      // stars (twinkle only when motion is allowed)
      for (const st of stars) {
        const p = project(st.x, st.y, -9.4);
        if (!p || p.s < 4) continue;
        const a = reduced ? 0.5 : 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + st.tw));
        g.fillStyle = 'rgba(190,215,255,' + a.toFixed(3) + ')';
        const sz = Math.max(1, p.s / 55);
        g.fillRect(p.x, p.y, sz, sz);
      }
    }

    // per-station colored light pools (ARGON blue left, ULTRON red right, AU gold, TITAN green)
    function drawStationLight(t) {
      for (const key of KEYS) {
        const A = AGENTS[key];
        const act = activity(key);
        const a = act.mode === 'offline' ? 0.05 : 0.13 + Math.sin(t * 0.6 + A.station.x) * 0.04;
        glowPool(A.station.x, 0.02, A.station.z, 3.1, A.color, a);
      }
      glowPool(OPERATOR.pos.x, 0.02, OPERATOR.pos.z, 2.6, OPERATOR.color, 0.10 + Math.sin(t * 0.5) * 0.03);
    }

    function drawAvatar(key, t) {
      const av = avatars[key], A = AGENTS[key];
      const act = activity(key);
      const cs = Math.cos(av.facing), sn = Math.sin(av.facing);
      const L = (x, y, z) => [av.x + x * cs + z * sn, y, av.z - x * sn + z * cs]; // local -> world (facing = +z)
      const walking = av.walking;
      const sw = walking ? Math.sin(av.phase) : 0;
      const bob = walking ? Math.abs(Math.cos(av.phase)) * 0.05 : Math.sin(av.phase * 0.5) * 0.015;
      const ph = av.task ? av.task.phase : null;
      const work = ph === 'investigating' || ph === 'task-assigned' || (!ph && (av.mode === 'working' || av.mode === 'just-ran'));
      const presenting = ph === 'reporting' || ph === 'evidence-found' || ph === 'presenting-briefing';
      const failed = ph === 'task-failed';
      const idle = !ph && av.mode === 'awaiting';
      const dark = act.mode === 'offline';
      const accent = dark ? '#4a5262' : A.color;

      const legSwing = walking ? 0.34 : 0;
      const part = (ox, oy, oz, sx, sy, sz, col, opts) => box(...L(ox, oy + bob, oz), sx, sy, sz, col, Object.assign({ yaw: av.facing }, opts));
      // legs
      part(-0.22, 0.48, sw * legSwing, 0.22, 0.96, 0.26, '#222c40');
      part(0.22, 0.48, -sw * legSwing, 0.22, 0.96, 0.26, '#222c40');
      // torso
      part(0, 1.36, 0, 0.82, 0.92, 0.5, '#2a3550');
      // chest stripe (emissive accent)
      part(0, 1.5, 0.27, 0.5, 0.14, 0.04, accent, { glow: accent, stroke: shade(accent, 1, 0.6) });
      // shoulders
      part(-0.52, 1.72, 0, 0.2, 0.16, 0.34, accent, { glow: accent });
      part(0.52, 1.72, 0, 0.2, 0.16, 0.34, accent, { glow: accent });
      // arms: typing while investigating, one arm presenting at the table, low when idle/failed
      const armY = work ? 1.45 : 1.34, armZ = work ? 0.42 : (walking ? -sw * 0.3 : idle ? 0.05 : 0.02);
      const armLen = (work || presenting) ? 0.55 : 0.8;
      const presZ = presenting ? 0.62 : armZ;
      const presY = presenting ? 1.62 : armY;
      const jitter = ph === 'investigating' ? Math.sin(t * 14) * 0.03 : 0;
      part(-0.56, armY, armZ + jitter, 0.16, armLen, 0.2, '#222c40');
      part(0.56, presenting ? presY : armY, presenting ? presZ : armZ - jitter, 0.16, armLen, 0.2, '#222c40');
      // head + visor (lowered when a real task failed)
      part(0, failed ? 1.92 : 2.02, 0.03, 0.46, 0.42, 0.42, '#313d5c');
      part(0, 2.06, 0.245, 0.34, 0.12, 0.03, dark ? '#39415a' : accent, { glow: dark ? null : accent, stroke: shade(accent, 1, 0.5) });
      // task-completed / just-ran flourish: expanding ring at feet
      if (av.flashUntil > performance.now()) {
        const p = 1 - (av.flashUntil - performance.now()) / 1500;
        const r = 0.5 + p * 1.6;
        for (let i = 0; i < 28; i++) {
          const a1 = i / 28 * TAU, a2 = (i + 1) / 28 * TAU;
          line3(av.x + Math.cos(a1) * r, 0.04, av.z + Math.sin(a1) * r, av.x + Math.cos(a2) * r, 0.04, av.z + Math.sin(a2) * r, shade(A.color, 1, 0.7 * (1 - p)), 2, true);
        }
      }
    }

    function drawParticles(dt) {
      for (const p of particles) {
        p.y += p.v * dt; p.p += dt;
        if (p.y > 5.2) { p.y = 0.2; }
        const pr = project(p.x + Math.sin(p.p * 0.4) * 0.3, p.y, p.z);
        if (pr && pr.s > 6) {
          g.fillStyle = 'rgba(150,190,255,' + (0.05 + Math.min(0.16, pr.s / 90)) + ')';
          g.fillRect(pr.x, pr.y, 1.6, 1.6);
        }
      }
    }

    // ================= overlays positioning =================
    function positionOverlays() {
      // holo screens
      for (const key of KEYS) {
        const S = screens[key];
        const pr = S.corners.map(c => project(c[0], c[1], c[2]));
        if (pr.some(p => !p)) { S.body.style.display = 'none'; }
        else {
          S.body.style.display = '';
          const cx = (pr[0].x + pr[1].x + pr[2].x + pr[3].x) / 4, cy = (pr[0].y + pr[1].y + pr[2].y + pr[3].y) / 4;
          const wpx = Math.hypot(pr[1].x - pr[0].x, pr[1].y - pr[0].y);
          const s = clamp(wpx / 320, 0.32, 1.25);
          S.body.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%) scale(${s})`;
        }
        // name tag above head
        const av = avatars[key];
        const hp = project(av.x, 2.75, av.z);
        if (!hp) { S.tag.style.display = 'none'; }
        else {
          S.tag.style.display = '';
          const s = clamp((2.6 * hp.s) / 150, 0.6, 1.05);
          S.tag.style.transform = `translate(${hp.x}px,${hp.y}px) translate(-50%,-50%) scale(${s})`;
        }
      }
      // operator console screen + tag (seated figure, head ~y2.2)
      {
        const pr = opScreen.corners.map(c => project(c[0], c[1], c[2]));
        if (pr.some(p => !p)) opScreen.body.style.display = 'none';
        else {
          opScreen.body.style.display = '';
          const cx = (pr[0].x + pr[1].x + pr[2].x + pr[3].x) / 4, cy = (pr[0].y + pr[1].y + pr[2].y + pr[3].y) / 4;
          const wpx = Math.hypot(pr[1].x - pr[0].x, pr[1].y - pr[0].y);
          opScreen.body.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%) scale(${clamp(wpx / 320, 0.32, 1.25)})`;
        }
        const hp = project(OPERATOR.pos.x, 2.62, OPERATOR.pos.z);
        if (!hp) opScreen.tag.style.display = 'none';
        else {
          opScreen.tag.style.display = '';
          opScreen.tag.style.transform = `translate(${hp.x}px,${hp.y}px) translate(-50%,-50%) scale(${clamp((2.6 * hp.s) / 170, 0.6, 1.05)})`;
        }
      }
      // core chip
      const cp = project(0, 3.6, 0);
      if (!cp) coreChip.style.display = 'none';
      else {
        coreChip.style.display = '';
        const s = clamp((2.4 * cp.s) / 220, 0.5, 1.1);
        coreChip.style.transform = `translate(${cp.x}px,${cp.y}px) translate(-50%,-50%) scale(${s})`;
      }
      // incident cards orbiting the table (real open incidents)
      for (let i = tableCards.length; i < Math.min(data.incidents.length, 3); i++) {
        const inc = data.incidents[i];
        const sev = String(inc.severity || 'info').toLowerCase();
        const card = el('div', { class: 'room-card incident sev-' + sev },
          el('div', { class: 'room-card-head' }, el('span', { class: 'room-sev', text: sev.toUpperCase() }), el('strong', { text: short(inc.agent || '?', 6) })),
          el('p', { text: short(inc.title || inc.fingerprint || 'incident', 54) }));
        makeInteractive(card, 'Open the incidents view', VIEW_ROUTES.incident);
        overlays.append(card);
        tableCards.push({ el: card, idx: i });
      }
      const t = performance.now() / 1000;
      for (const tc of tableCards) {
        const ang = t * 0.12 + tc.idx * (TAU / 3);
        const p = project(Math.cos(ang) * 3.9, 3.05 + Math.sin(t * 1.1 + tc.idx) * 0.12, Math.sin(ang) * 3.9);
        if (!p) { tc.el.style.display = 'none'; continue; }
        tc.el.style.display = '';
        const s = clamp((1.7 * p.s) / 200, 0.4, 1.05);
        tc.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${s})`;
      }
      // transient lifecycle/event cards (table anchor, or the owner station for AU briefings)
      for (const c of cardEls) {
        if (!c.el.isConnected) continue;
        const p = c.anchor === 'owner' ? project(OPERATOR.pos.x, 4.5, OPERATOR.pos.z) : project(0, 4.3, 0);
        if (!p) { c.el.style.display = 'none'; continue; }
        c.el.style.display = '';
        const s = clamp((2 * p.s) / 220, 0.45, 1.1);
        c.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${s})`;
      }
    }

    // ================= render loop =================
    let raf = 0, lastT = performance.now();
    function frame(now) {
      if (destroyed) return;
      const dt = clamp((now - lastT) / 1000, 0, 0.05);
      lastT = now;
      if (!document.hidden) {
        if (!reduced && now - interactedAt > 12000) cam.yaw += dt * 0.05;
        updateAvatars(now, dt);
        faces = [];
        g.clearRect(0, 0, W, H);
        drawFloor();
        drawWindows(now / 1000);
        drawStationLight(now / 1000);
        for (const key of KEYS) drawStation(key);
        drawOperator(now / 1000);
        drawTable(now / 1000);
        for (const key of KEYS) drawAvatar(key, now / 1000);
        drawParticles(dt);
        // painter's algorithm: far to near
        faces.sort((a, b) => b.depth - a.depth);
        for (const f of faces) {
          if (f.line) {
            g.strokeStyle = f.stroke; g.lineWidth = f.lw;
            if (f.glow) { g.shadowColor = f.glow; g.shadowBlur = 8; } else g.shadowBlur = 0;
            g.beginPath(); g.moveTo(f.line[0].x, f.line[0].y); g.lineTo(f.line[1].x, f.line[1].y); g.stroke();
            g.shadowBlur = 0;
          } else {
            g.fillStyle = f.fill;
            g.beginPath();
            g.moveTo(f.pts[0].x, f.pts[0].y);
            for (let i = 1; i < 4; i++) g.lineTo(f.pts[i].x, f.pts[i].y);
            g.closePath(); g.fill();
            if (f.stroke) { g.strokeStyle = f.stroke; g.lineWidth = f.lw; if (f.glow) { g.shadowColor = f.glow; g.shadowBlur = 10; } g.stroke(); g.shadowBlur = 0; }
          }
        }
        positionOverlays();
      }
      raf = requestAnimationFrame(frame);
    }

    // ================= real actions (typed lifecycle over real runs) =================
    // Each button triggers a REAL server-side run. The investigating phase spans the actual
    // in-flight request (plus a minimum visual hold — pacing only); the reporting phase shows
    // the real result card at the central table, or at the owner station for AU briefings.
    const ACTIONS = {
      verify: {
        path: '/api/intelligence/verify', agents: ['ultron'], label: 'ULTRON verification', button: btnVerify,
        card: res => ({ title: 'ULTRON verification — ' + (((res.data && res.data.results) || []).length) + ' target(s) checked', sub: 'real run · ' + (((res.data && res.data.results) || []).map(r => r.target + ' ' + r.status).join(', ') || 'no targets').slice(0, 58) })
      },
      analyze: {
        path: '/api/intelligence/analyze', agents: ['argon', 'au'], label: 'ARGON + AU analysis', button: btnAnalyze,
        card: res => ({ title: 'ARGON — ' + short((res.data && res.data.argon) || 'analysis complete', 42), sub: 'AU — ' + short((res.data && res.data.au) || 'correlation complete', 42) + ' · real run' })
      },
      improve: {
        path: '/api/intelligence/improve', agents: ['titan'], label: 'TITAN audit', button: btnImprove,
        card: res => ({ title: 'TITAN audit — ' + short((res.data && res.data.summary) || 'complete', 46), sub: 'real run · findings upserted by evidence key' })
      },
      briefing: {
        path: '/api/intelligence/briefing', body: { kind: 'daily' }, agents: ['au'], label: 'AU daily briefing', button: btnBriefing, reportPhase: 'presenting-briefing',
        card: res => ({ title: 'AU briefing ' + ((res.data && res.data.id) || '') + ' generated', sub: 'presented to Vitaflex (Sony) · real record' })
      }
    };
    let busy = false;
    async function runAction(kind) {
      const A = ACTIONS[kind];
      if (busy || !data.ok || !A) return;
      busy = true;
      A.button.disabled = true; const old = A.button.textContent; A.button.textContent = A.label + '…';
      try {
        for (const k of A.agents) startTask(k, [['task-assigned', 900], ['investigating', 3600000]], { title: A.label });
        await sleep(850);
        const t0 = performance.now();
        const res = await ctx.api(A.path, { method: 'POST', body: A.body || {} });
        await sleep(Math.max(250, 1300 - (performance.now() - t0)));
        if (res.ok) {
          const card = A.card(res);
          for (const k of A.agents) {
            const task = avatars[k].task;
            if (task) { task.meta.card = card; task.script = [[A.reportPhase || 'reporting', 6000], ['task-completed', 1800]]; enterStep(k, 0); }
          }
          showToast(A.label + ' completed — ' + short(card.title, 62), true);
          await poll();
        } else {
          for (const k of A.agents) {
            const task = avatars[k].task;
            if (task) { task.script = [['task-failed', 2800]]; enterStep(k, 0); }
          }
          showToast(A.label + ' failed: ' + (res.code || res.status) + (res.status === 429 ? ' (real rate limit — try again later)' : ''), false);
        }
      } finally {
        A.button.disabled = false; A.button.textContent = old; busy = false;
      }
    }
    for (const kind of Object.keys(ACTIONS)) ACTIONS[kind].button.addEventListener('click', () => runAction(kind));

    // ================= simulation / demo mode =================
    // Synthetic, labeled, isolated: demo tasks exist only in this client's memory while the
    // mode is on. They never call the API (zero mutations), never write D1, never appear in
    // the 2D views, and never trigger automations. Real data keeps rendering on the screens;
    // every demo artifact is visibly watermarked.
    let demo = false, demoTimer = 0, demoIdx = 0;
    const DEMO_SCRIPTS = [
      { agent: 'ultron', title: 'DEMO · sample latency spike on api-status', sub: 'synthetic event — simulation only, not production data' },
      { agent: 'argon', title: 'DEMO · sample crash cluster (3 sessions)', sub: 'synthetic event — simulation only, not production data' },
      { agent: 'au', title: 'DEMO · sample cross-agent correlation', sub: 'synthetic event — simulation only, not production data' },
      { agent: 'titan', title: 'DEMO · sample unused dependency finding', sub: 'synthetic event — simulation only, not production data' }
    ];
    function demoTick() {
      if (destroyed || !demo) return;
      const script = DEMO_SCRIPTS[demoIdx++ % DEMO_SCRIPTS.length];
      if (avatars[script.agent].task) return; // never interrupt a real task
      startTask(script.agent, [['task-assigned', 900], ['investigating', 2600], ['evidence-found', 5200], ['task-completed', 1400]],
        { isDemo: true, card: { title: script.title, sub: script.sub } });
    }
    function toggleDemo() {
      demo = !demo;
      btnDemo.textContent = demo ? 'DEMO MODE: ON' : 'DEMO MODE: OFF';
      btnDemo.classList.toggle('on', demo);
      btnDemo.setAttribute('aria-pressed', demo ? 'true' : 'false');
      watermark.classList.toggle('show', demo);
      demoBadge.hidden = !demo;
      clearInterval(demoTimer);
      if (demo) { demoTick(); demoTimer = setInterval(demoTick, 9000); }
      else for (const k of KEYS) if (avatars[k].task && avatars[k].task.isDemo) endTask(k);
      rebuildScreens();
    }
    btnDemo.addEventListener('click', toggleDemo);

    let toastTimer = 0;
    function showToast(text, ok) {
      toast.textContent = text;
      toast.className = 'room-toast show' + (ok ? ' ok' : ' bad');
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; toast.className = 'room-toast'; }, 5200);
    }

    // ================= data polling =================
    async function poll() {
      if (destroyed) return;
      const [ov, tl, inc, imp, br] = await Promise.all([
        ctx.api('/api/intelligence/overview'),
        ctx.api('/api/intelligence/timeline?limit=20'),
        ctx.api('/api/intelligence/incidents?status=open&limit=8'),
        ctx.api('/api/intelligence/improvements?limit=12'),
        ctx.api('/api/intelligence/briefings?limit=1')
      ]);
      if (destroyed) return;
      data.overview = ov.ok ? ov.data : null;
      data.ok = ov.ok;
      data.at = new Date().toISOString();
      data.timeline = tl.ok ? (tl.data.items || []) : [];
      data.incidents = inc.ok ? (inc.data.incidents || inc.data.items || []) : [];
      data.improvements = imp.ok ? (imp.data.items || []) : [];
      data.briefing = br.ok ? ((br.data.briefings || [])[0] || null) : null;
      // clear stale incident cards
      for (const tc of tableCards) tc.el.remove();
      tableCards.length = 0;
      // new real events -> the producing agent walks to the table (representational)
      const fresh = [];
      for (const it of data.timeline) {
        const id = it.id || (it.agent + '|' + it.kind + '|' + it.at + '|' + it.title);
        if (!seen.has(id)) { seen.add(id); if (seeded) fresh.push(it); }
      }
      if (!seeded) seeded = true;
      else for (const it of fresh.slice(0, 2)) {
        const ag = String(it.agent || '').toLowerCase();
        if (AGENTS[ag]) queueVisit(ag, it);
      }
      rebuildScreens();
    }
    const pollTimer = setInterval(() => { if (!document.hidden && !destroyed) poll(); }, 12000);
    poll();

    // ================= resize =================
    function resize() {
      const r = stage.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(320, r.width); H = Math.max(300, r.height);
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      FOCAL = Math.min(W, H) * 1.28;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    window.addEventListener('resize', resize);
    resize();

    raf = requestAnimationFrame(frame);

    // Read-only test/inspection hook: current lifecycle phase + reality mode per agent.
    function state() {
      const agents = {};
      for (const k of KEYS) {
        const av = avatars[k];
        agents[k] = {
          phase: av.task ? (av.task.isDemo ? 'demo:' : '') + av.task.phase : 'idle',
          mode: modeLabel(activity(k)),
          x: Math.round(av.x * 10) / 10, z: Math.round(av.z * 10) / 10
        };
      }
      return { demo, agents, ok: data.ok, at: data.at };
    }

    return {
      container, poll, state,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearInterval(pollTimer);
        clearInterval(demoTimer);
        clearTimeout(toastTimer);
        ro.disconnect();
        window.removeEventListener('resize', resize);
        stage.removeEventListener('pointerdown', onPointerDown);
        stage.removeEventListener('pointermove', onPointerMove);
        stage.removeEventListener('pointerup', onPointerUp);
        stage.removeEventListener('pointercancel', onPointerUp);
        stage.removeEventListener('wheel', onWheel);
        stage.removeEventListener('dblclick', onDblClick);
        wrap.remove();
      }
    };
  }
})();
