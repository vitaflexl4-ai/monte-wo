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

  // Agent identities — colors match the Command Center palette exactly.
  const AGENTS = {
    ultron: { name: 'ULTRON', color: '#ff444f', station: { x: -7.6, z: -4.4 }, side: -1 },
    argon: { name: 'ARGON', color: '#5aadff', station: { x: 7.6, z: -4.4 }, side: 1 },
    titan: { name: 'TITAN', color: '#7ee0c0', station: { x: -7.6, z: 4.4 }, side: -1 },
    au: { name: 'AU', color: '#e9ba63', station: { x: 7.6, z: 4.4 }, side: 1 }
  };
  const KEYS = Object.keys(AGENTS);

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
    const btnTitan = el('button', { class: 'btn room-act', type: 'button', text: 'Run TITAN audit' });
    const hudTop = el('div', { class: 'room-hud room-hud-top' },
      el('div', { class: 'room-hud-title' }, el('strong', { text: 'AU ROOM' }), el('span', { class: 'room-hud-sub', text: 'live operations floor' }), livePill),
      el('p', { class: 'room-note' }, 'The avatars visualize the real server-side agents. Every position, animation and screen value is derived from live API data — motions represent actual run states, not a literal office. Idle agents look idle.'),
      el('div', { class: 'room-acts' }, btnVerify, btnTitan));

    const realList = el('div', { class: 'room-real-list' });
    const hudRight = el('div', { class: 'room-hud room-hud-right' },
      el('div', { class: 'room-hud-title' }, el('strong', { text: "What's real right now" }), el('span', { class: 'room-hud-sub', text: 'from the live API' })),
      realList);

    const hudBottom = el('div', { class: 'room-hud room-hud-bottom' },
      el('span', { class: 'room-hint', text: 'Drag to orbit · scroll to zoom · double-click to reset · click a name tag' }),
      el('span', { class: 'room-src', text: 'Values: /api/intelligence/overview · timeline · incidents · improvements' }));

    const toast = el('div', { class: 'room-toast', role: 'status', hidden: true });
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

    function onPointerDown(e) { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); interactedAt = performance.now(); }
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
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);

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

    // ================= scene data =================
    const data = { overview: null, timeline: [], incidents: [], improvements: [], at: null, ok: false };
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
      overlays.append(body, tag);
      screens[key] = { corners, ang, body, tag, w };
    }

    // central table + core + incident cards
    const tableCards = [];
    const coreChip = el('div', { class: 'room-core-chip' });
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
      const A = AGENTS[key];
      const act = activity(key);
      const d = data.ok && data.overview && data.overview.agents ? data.overview.agents[key] : null;
      const rows = [];
      const head = el('div', { class: 'room-holo-head' },
        el('strong', { text: A.name }),
        el('span', { class: 'room-dot', style: 'background:' + (act.mode === 'offline' ? '#6b7688' : A.color) }),
        el('span', { class: 'room-holo-status', text: act.label }));
      rows.push(head);
      const bodyEl = el('div', { class: 'room-holo-body' });
      if (!d) {
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
        bodyEl.append(el('p', { class: 'room-holo-line dim', text: data.improvements.length + ' finding(s) total' }));
      }
      rows.push(bodyEl);
      rows.push(el('div', { class: 'room-holo-foot', text: data.ok ? 'live API · ' + ctx.relTime(data.overview && data.overview.generatedAt) : 'no connection' }));
      return rows;
    }

    function rebuildScreens() {
      for (const key of KEYS) {
        const S = screens[key];
        S.body.replaceChildren(...screenContent(key));
        S.body.classList.toggle('off', activity(key).mode === 'offline');
        S.body.classList.toggle('waiting', activity(key).mode === 'awaiting');
        const act = activity(key);
        S.tag.replaceChildren(
          el('span', { class: 'room-dot ' + (act.mode === 'offline' ? '' : 'on') , style: 'background:' + (act.mode === 'offline' ? '#6b7688' : AGENTS[key].color) }),
          el('strong', { text: AGENTS[key].name }),
          el('span', { class: 'room-tag-status', text: act.label }));
        S.tag.className = 'room-tag' + (act.mode === 'offline' ? ' off' : '');
      }
      // live pill
      if (data.ok && data.overview) {
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
      if (sel) {
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
        for (const key of KEYS) {
          const A = AGENTS[key], act = activity(key);
          const av = avatars[key];
          const row = el('button', { class: 'room-real-row', type: 'button' },
            el('span', { class: 'room-dot on', style: 'background:' + (act.mode === 'offline' ? '#6b7688' : A.color) }),
            el('strong', { text: A.name }),
            el('span', { class: 'room-real-verb', text: (av.visitCard ? 'reviewing event' : modeVerb(act.mode)) }),
            el('p', { class: 'room-why', text: act.why }));
          row.addEventListener('click', () => { selected = key; rebuildRealList(key); });
          nodes.push(row);
        }
        nodes.push(el('p', { class: 'room-why foot', text: data.ok ? 'Data checked ' + ctx.relTime(data.at) + '. The room re-checks every 12 seconds.' : 'Backend unreachable — nothing is being simulated.' }));
      }
      realList.replaceChildren(...nodes);
    }
    function selectAgent(key) { selected = key; rebuildRealList(key); }

    // ================= behavior =================
    function queueVisit(key, item) {
      const av = avatars[key];
      if (av.visitCard) return;
      av.visitCard = item;
      av.path = [{ ...av.approach }];
      av.holdUntil = performance.now() + 6000;
      showTableCard(key, item);
    }
    const cardEls = [];
    function showTableCard(key, item) {
      const card = el('div', { class: 'room-card' },
        el('div', { class: 'room-card-head' }, el('span', { class: 'room-dot on', style: 'background:' + AGENTS[key].color }), el('strong', { text: AGENTS[key].name })),
        el('p', { text: short(item.title || item.kind || 'event', 52) }),
        el('p', { class: 'room-card-sub', text: ctx.relTime(item.at) + ' · real timeline event' }));
      overlays.append(card);
      const entry = { el: card, until: performance.now() + 6000, ang: Math.random() * TAU, r: 4.1, y: 3.1 };
      cardEls.push(entry);
      setTimeout(() => { card.remove(); }, 6100);
    }

    function updateAvatars(now, dt) {
      for (const key of KEYS) {
        const av = avatars[key];
        const act = activity(key);
        let mode = act.mode === 'just-ran' ? 'working' : act.mode;
        if (act.mode === 'just-ran' && now < (av.flashUntil || 0)) mode = 'just-ran';
        if (act.mode === 'just-ran' && now >= (av.flashUntil || 0) && !av.flashed) { av.flashUntil = now + 1500; av.flashed = true; setTimeout(() => { av.flashed = false; }, 1600); }

        if (av.visitCard) {
          mode = 'visit';
          if (!av.path.length && now > av.holdUntil) {
            av.visitCard = null;
            av.path = [{ ...av.home }];
          }
        } else if (!av.path.length && act.mode === 'just-ran') {
          // stay at home; flash handled below
        }

        // AU correlation patrol: only when operational and idle — represents its real
        // cross-agent correlation job, which is exactly why AU moves the most.
        if (key === 'au' && act.mode !== 'offline' && !av.visitCard && !av.path.length && now > av.patrolAt && !reduced) {
          const targets = [{ ...av.approach }, ...KEYS.filter(k => k !== 'au').map(k => ({ x: AGENTS[k].station.x * 0.55, z: AGENTS[k].station.z * 0.55 }))];
          const t = targets[Math.floor(Math.random() * targets.length)];
          av.path = [t];
          av.holdUntil = now + 3500;
          av.patrolVisit = true;
        }
        if (av.patrolVisit && !av.path.length && now > av.holdUntil) { av.patrolVisit = false; av.path = [{ ...av.home }]; }

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
          // face the screen / table when settled
          const faceTo = av.visitCard ? { x: 0, z: 0 } : { x: AGENTS[key].station.x, z: AGENTS[key].station.z };
          const want = Math.atan2(faceTo.x - av.x, faceTo.z - av.z);
          let dd = want - av.facing;
          while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
          av.facing += dd * Math.min(1, dt * 6);
          av.phase += dt * (mode === 'working' ? 5.5 : mode === 'awaiting' ? 1.1 : 0.7);
          av.walking = false;
        }
        av.mode = mode;
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
      // core: rotating wireframe octahedron, colored by real health
      const col = healthColor();
      const pulse = data.incidents.length ? 0.12 : 0.05;
      const sc = 0.85 * (1 + Math.sin(t * (data.incidents.length ? 3.4 : 1.6)) * pulse);
      const cy = 2.5, rot = t * 0.7;
      const P = [];
      for (const [x, y, z] of [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
        const x1 = x * Math.cos(rot) - z * Math.sin(rot), z1 = x * Math.sin(rot) + z * Math.cos(rot);
        P.push([x1 * sc, cy + y * sc, z1 * sc]);
      }
      const E = [[0, 2], [2, 1], [1, 3], [3, 0], [0, 4], [4, 1], [1, 5], [5, 0], [2, 4], [4, 3], [3, 5], [5, 2]];
      for (const [a, b] of E) line3(P[a][0], P[a][1], P[a][2], P[b][0], P[b][1], P[b][2], col, 1.6, true);
      // beam from table to core
      line3(0, h, 0, 0, cy - sc, 0, shade(healthColor(), 1, 0.25), 1, false);
    }

    function drawAvatar(key, t) {
      const av = avatars[key], A = AGENTS[key];
      const act = activity(key);
      const cs = Math.cos(av.facing), sn = Math.sin(av.facing);
      const L = (x, y, z) => [av.x + x * cs + z * sn, y, av.z - x * sn + z * cs]; // local -> world (facing = +z)
      const walking = av.walking;
      const sw = walking ? Math.sin(av.phase) : 0;
      const bob = walking ? Math.abs(Math.cos(av.phase)) * 0.05 : Math.sin(av.phase * 0.5) * 0.015;
      const work = av.mode === 'working' || av.mode === 'just-ran';
      const idle = av.mode === 'awaiting';
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
      // arms: typing/working when at console, swinging when walking, low when idle
      const armY = work ? 1.45 : 1.34, armZ = work ? 0.42 : (walking ? -sw * 0.3 : idle ? 0.05 : 0.02);
      const armLen = work ? 0.55 : 0.8;
      part(-0.56, armY, armZ, 0.16, armLen, 0.2, '#222c40');
      part(0.56, armY, armZ, 0.16, armLen, 0.2, '#222c40');
      // head + visor
      part(0, 2.02, 0.03, 0.46, 0.42, 0.42, '#313d5c');
      part(0, 2.06, 0.245, 0.34, 0.12, 0.03, dark ? '#39415a' : accent, { glow: dark ? null : accent, stroke: shade(accent, 1, 0.5) });
      // just-ran flourish: expanding ring at feet
      if (av.mode === 'just-ran' && av.flashUntil > performance.now()) {
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
      // transient event cards
      for (const c of cardEls) {
        if (!c.el.isConnected) continue;
        const p = project(0, 4.3, 0);
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
        for (const key of KEYS) drawStation(key);
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

    // ================= real actions =================
    let busy = false;
    async function runAction(path, button, label) {
      if (busy || !data.ok) return;
      busy = true;
      button.disabled = true; const old = button.textContent; button.textContent = label + '…';
      try {
        const res = await ctx.api(path, { method: 'POST', body: {} });
        if (res.ok) showToast(label + ' completed — ' + short(res.data && res.data.results ? res.data.results.length + ' target(s) checked' : (res.data && res.data.summary) || 'ok', 70), true);
        else showToast(label + ' failed: ' + (res.code || res.status) + (res.status === 429 ? ' (real rate limit — try again later)' : ''), false);
        await poll();
      } finally {
        button.disabled = false; button.textContent = old; busy = false;
      }
    }
    btnVerify.addEventListener('click', () => runAction('/api/intelligence/verify', btnVerify, 'ULTRON verification'));
    btnTitan.addEventListener('click', () => runAction('/api/intelligence/improve', btnTitan, 'TITAN audit'));

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
      const [ov, tl, inc, imp] = await Promise.all([
        ctx.api('/api/intelligence/overview'),
        ctx.api('/api/intelligence/timeline?limit=20'),
        ctx.api('/api/intelligence/incidents?status=open&limit=8'),
        ctx.api('/api/intelligence/improvements?limit=12')
      ]);
      if (destroyed) return;
      data.overview = ov.ok ? ov.data : null;
      data.ok = ov.ok;
      data.at = new Date().toISOString();
      data.timeline = tl.ok ? (tl.data.items || []) : [];
      data.incidents = inc.ok ? (inc.data.incidents || inc.data.items || []) : [];
      data.improvements = imp.ok ? (imp.data.items || []) : [];
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

    return {
      container, poll,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearInterval(pollTimer);
        clearTimeout(toastTimer);
        ro.disconnect();
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('dblclick', onDblClick);
        wrap.remove();
      }
    };
  }
})();
