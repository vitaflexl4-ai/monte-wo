import { indexLibrary, filterLibrary } from "./cockpit-library.js";
import { nutritionState, macroKeys } from "./cockpit-nutrition.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  NS = "http://www.w3.org/2000/svg";
// Local app-concept state only. No score formula, thresholds, account calls or persistence.
export function phonePreviewValue(value) {
  if (value.trim() === '') return {show: false, invalid: false};
  const number = Number(value);
  const invalid = !Number.isFinite(number) || number < 0 || number > 3000;
  return {show: !invalid && number > 0, invalid};
}
function bindPhoneCockpits() {
  const translations = {
    en: {openStrength:'Open the real Strength Index ↗',openLogger:'Open session logger · not synced ↗',openMuscles:'Explore these exercises ↗',ready:'Tap a tab to explore.', shown:'Example badge only—not an earned rank.', invalid:'Enter a load from 0 to 3,000 lb. Preview only.', cleared:'Preview reset. Nothing was saved.', detail:'Example tier—not an achievement.'},
    ht: {openStrength:'Louvri vrè Endis Fòs la ↗',openLogger:'Louvri jounal sesyon an · pa senkronize ↗',openMuscles:'Eksplore egzèsis sa yo ↗',strength:'Endis Fòs',history:'Istwa Antrènman',map:'Kat Misk Ayisyen',simulation:'SIMILASYON ENTÈRAKTIF',strengthKicker:'01 / EKSPLORE FÒS OU',strengthTitle:'Fè travay la.',strengthIntro:'Chanje chaj la. Gade reyaksyon badj la.',rankPolicy:'Badj egzanp fiks—li pa kalkile apati chaj ou. Pa gen papòt kalifikasyon oswa ran ofisyèl.',squat:'Squat',bench:'Bench Press',deadlift:'Deadlift',rank:'Ran:',example:'EGZANP SÈLMAN · PA AKÒDE',reset:'Reyajiste aperçu a',historyKicker:'02 / DOSYE EGZANP SÈLMAN',historyTitle:'Chak seri. Devan je ou.',historyIntro:'Sesyon envante pou demonstrasyon—se pa istwa antrènman ou.',demoSessions:'Sesyon egzanp',demoSets:'Seri egzanp',historyCaption:'Seri egzanp · anyen pa sove oswa senkronize',movement:'Mouvman',load:'Chaj',reps:'Rep.',mapKicker:'03 / KAT MISK AYISYEN',mapTitle:'Kò ou. Pwòp monte ou.',mapIntro:'Peze yon rejyon. Eksplore nivo egzanp yo.',front:'Devan',backView:'Dèyè',mapExample:'NIVO EGZANP · PA REYALIZASYON',arms:'Bra',legs:'Janm',chest:'Pwatrin',back:'Do',core:'Sant kò',mapHint:'Chwazi yon rejyon misk.',disclosure:'KONSÈP APLIKASYON · PA GEN DONE ATLÈT',ready:'Peze yon onglet pou eksplore.',shown:'Badj egzanp sèlman—se pa yon ran ou genyen.',invalid:'Antre yon chaj ant 0 ak 3,000 lb. Aperçu sèlman.',cleared:'Aperçu a reyajiste. Anyen pa sove.',detail:'Nivo egzanp—se pa yon reyalizasyon.'},
    fr: {openStrength:'Ouvrir le véritable indice de force ↗',openLogger:'Journal de séance · non synchronisé ↗',openMuscles:'Explorer ces exercices ↗',strength:'Indice de force',history:'Historique',map:'Carte musculaire haïtienne',simulation:'SIMULATION INTERACTIVE',strengthKicker:'01 / EXPLOREZ VOTRE FORCE',strengthTitle:'À vous de jouer.',strengthIntro:'Modifiez la charge. Découvrez la réaction du badge.',rankPolicy:'Badge d’exemple fixe, non calculé à partir de votre charge. Aucun seuil de qualification ni rang officiel.',squat:'Squat',bench:'Développé couché',deadlift:'Soulevé de terre',rank:'Rang :',example:'EXEMPLE · NON ATTRIBUÉ',reset:'Réinitialiser',historyKicker:'02 / DONNÉES FICTIVES',historyTitle:'Chaque série. En vue.',historyIntro:'Séances illustratives, pas votre historique personnel.',demoSessions:'Séances fictives',demoSets:'Séries illustratives',historyCaption:'Séries fictives · ni sauvegardées ni synchronisées',movement:'Mouvement',load:'Charge',reps:'Rép.',mapKicker:'03 / CARTE MUSCULAIRE HAÏTIENNE',mapTitle:'Votre corps. Votre ascension.',mapIntro:'Touchez une région pour explorer ses niveaux illustratifs.',front:'Face',backView:'Dos',mapExample:'NIVEAUX ILLUSTRATIFS · NON ACQUIS',arms:'Bras',legs:'Jambes',chest:'Pectoraux',back:'Dos',core:'Tronc',mapHint:'Choisissez une région musculaire.',disclosure:'CONCEPT D’APPLICATION · AUCUNE DONNÉE D’ATHLÈTE',ready:'Choisissez un onglet.',shown:'Badge illustratif uniquement, pas un rang acquis.',invalid:'Saisissez une charge entre 0 et 3 000 lb. Aperçu uniquement.',cleared:'Aperçu réinitialisé. Rien n’a été sauvegardé.',detail:'Niveau illustratif, pas un accomplissement.'}
  };
  for (const root of document.querySelectorAll('[data-phone-cockpit]')) {
    if (root.dataset.bound) continue;
    root.dataset.bound = 'true';
    const widget = root.querySelector('.phone-widget'), tabs = [...root.querySelectorAll('[data-phone-tab]')];
    const texts = [...root.querySelectorAll('[data-phone-text]')], english = new Map(texts.map(el => [el, el.textContent]));
    const status = root.querySelector('[data-phone-status]');
    let facing = 'f', region = null, language = 'en';
    const copy = () => translations[language] || translations.en;
    const announce = message => { if (status.textContent !== message) status.textContent = message; };
    function selectTab(tab, focus = false) {
      for (const button of tabs) {
        const selected = button === tab;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        root.querySelector('#' + button.getAttribute('aria-controls')).hidden = !selected;
      }
      if (focus) tab.focus();
      announce(copy().ready);
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) {event.preventDefault();selectTab(tabs[next], true);}
      });
    });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    for (const input of root.querySelectorAll('[data-phone-load]')) {
      let lastReveal = -Infinity;
      const badge = root.querySelector(`[data-phone-rank="${input.dataset.phoneLoad}"]`);
      input.addEventListener('input', () => {
        const state = phonePreviewValue(input.value);
        const invalid = state.invalid || input.validity.badInput || input.validity.stepMismatch;
        input.setAttribute('aria-invalid', String(invalid));
        badge.hidden = !state.show || invalid;
        if (invalid) announce(copy().invalid);
        else if (state.show) {
          announce(copy().shown);
          // One gentle reveal, throttled while typing; no flashing/strobe loop.
          if (!reduced.matches && performance.now() - lastReveal > 400 && badge.animate) {
            badge.getAnimations().forEach(animation => animation.cancel());
            badge.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}], {duration:320,easing:'ease-out'});
            lastReveal = performance.now();
          }
        } else announce(copy().ready);
      });
    }
    root.querySelector('[data-phone-reset]').addEventListener('click', () => {
      root.querySelectorAll('[data-phone-load]').forEach(input => {input.value='';input.removeAttribute('aria-invalid');});
      root.querySelectorAll('[data-phone-rank]').forEach(badge => {badge.getAnimations?.().forEach(a=>a.cancel());badge.hidden=true;});
      announce(copy().cleared);
    });
    function drawMap() {
      root.querySelector("[data-phone-map-link]").href = region ? "/exercises/?group=" + encodeURIComponent(region) + "#library" : "/exercises/#library";
      root.querySelectorAll('[data-phone-view]').forEach(el => {el.toggleAttribute('hidden', el.dataset.phoneView !== facing);});
      root.querySelectorAll('[data-phone-facing]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.phoneFacing === facing)));
      root.querySelectorAll('[data-phone-region], [data-phone-region-button]').forEach(el => el.setAttribute('aria-pressed', String((el.dataset.phoneRegion || el.dataset.phoneRegionButton) === region)));
      const selected = root.querySelector(`[data-phone-region-button="${region}"]`);
      root.querySelector('[data-phone-region-detail]').textContent = selected
        ? `${selected.querySelector('span').textContent} · ${selected.querySelector('b').textContent} — ${copy().detail}`
        : (copy().mapHint || 'Choose a muscle region.');
    }
    function chooseRegion(id) {
      region = id;
      if (id === 'back') facing = 'b';
      if (id === 'chest') facing = 'f';
      drawMap();
    }
    root.querySelectorAll('[data-phone-facing]').forEach(button => button.addEventListener('click', () => {
      facing = button.dataset.phoneFacing;
      if ((region === 'back' && facing === 'f') || (region === 'chest' && facing === 'b')) region = null;
      drawMap();
    }));
    root.querySelectorAll('[data-phone-region], [data-phone-region-button]').forEach(el => {
      let lastDown = 0;
      const choose = () => chooseRegion(el.dataset.phoneRegion || el.dataset.phoneRegionButton);
      el.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        el.classList.add('is-pressed');
        lastDown = Date.now();
        choose();
      });
      el.addEventListener('pointerup', () => el.classList.remove('is-pressed'));
      el.addEventListener('pointerleave', () => el.classList.remove('is-pressed'));
      el.addEventListener('pointercancel', () => el.classList.remove('is-pressed'));
      el.addEventListener('click', () => {
        if (Date.now() - lastDown < 450) { lastDown = 0; return; }
        choose();
      });
      if (el.hasAttribute('data-phone-region')) el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();choose();}
      });
    });
    function translate() {
      language = translations[document.documentElement.lang] ? document.documentElement.lang : 'en';
      widget.lang = language;
      texts.forEach(el => {el.textContent = copy()[el.dataset.phoneText] || english.get(el);});
      drawMap();announce(copy().ready);
    }
    const shotButtons = [...root.querySelectorAll('[data-app-shot-btn]')];
    const shotPanes = [...root.querySelectorAll('[data-app-shot-pane]')];
    shotButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.appShotBtn;
        shotButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        shotPanes.forEach(p => { p.hidden = p.dataset.appShotPane !== target; });
      });
    });
    new MutationObserver(translate).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
    selectTab(tabs[0]);translate();
  }
}
bindPhoneCockpits();

// Only bind the full exercise cockpit when that page is present.
if (document.querySelector("#boot-message")) {
// Native disclosure semantics, with the same Escape/focus behavior as the site menu.
const menu = $(".mobile-menu");
menu.addEventListener("toggle", () =>
  menu
    .querySelector("summary")
    .setAttribute(
      "aria-label",
      menu.open ? "Close navigation" : "Open navigation",
    ),
);
menu.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.open) {
    event.preventDefault();
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});
document.addEventListener("pointerdown", (event) => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error("Content unavailable");
  return r.json();
}
try {
  const { bindSessionLogger } = await import("./cockpit-tools.js");
  const [{ catalog }, map, nutrition] = await Promise.all([
    json("/cockpit-catalog.json"),
    json("/cockpit-map.json"),
    json("/cockpit-nutrition.json"),
  ]);
  const indexed = indexLibrary(catalog.exercises),
    byId = new Map(catalog.exercises.map((e) => [e.id, e])),
    cards = new Map($$("[data-exercise]").map((e) => [e.dataset.exercise, e]));
  const f = {
    query: "",
    group: "all",
    source: "all",
    equipment: "all",
    sort: "az",
  };
  let view = "f",
    hover = null,
    focused = null,
    selectedFood = null,
    activeExercise = null,
    resizeFrame = 0,
    ready = false;
  const linkedGroup = new URL(location.href).searchParams.get("group");
  if (catalog.groups.some(group => group.id === linkedGroup)) {
    f.group = linkedGroup;
    if (linkedGroup === "back") view = "b";
  }
  const visible = (r) => !!r.paths[view],
    region = (id) => map.regions.find((r) => r.id === id),
    svg = $("#avatar"),
    stage = $("#map-stage");
  const links = new Map();
  for (const r of map.regions) {
    const g = document.createElementNS(NS, "g"),
      path = document.createElementNS(NS, "path"),
      dot = document.createElementNS(NS, "circle");
    g.dataset.connector = r.id;
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "1.2");
    dot.setAttribute("r", "3");
    g.append(path, dot);
    $(".connectors").append(g);
    links.set(r.id, { g, path, dot });
  }
  function connectors() {
    const bounds = stage.getBoundingClientRect(),
      fig = svg.getBoundingClientRect(),
      active = hover || focused || f.group;
    for (const r of map.regions) {
      const { g, path, dot } = links.get(r.id);
      g.style.display = visible(r) ? "" : "none";
      if (!visible(r)) continue;
      const c = $('[data-region="' + r.id + '"]').getBoundingClientRect(),
        a = r.anchors[view];
      const x1 = (r.side === "l" ? c.right : c.left) - bounds.left,
        y1 = c.top + c.height / 2 - bounds.top,
        x2 = fig.left - bounds.left + (a.x / 420) * fig.width,
        y2 = fig.top - bounds.top + (a.y / 640) * fig.height;
      path.setAttribute(
        "d",
        `M${x1} ${y1} L${x1 + (r.side === "l" ? 20 : -20)} ${y1} L${x2} ${y2}`,
      );
      path.setAttribute("stroke", active === r.id ? r.color : "#426281");
      path.setAttribute("stroke-width", active === r.id ? "1.8" : "1.2");
      dot.setAttribute("cx", x2);
      dot.setAttribute("cy", y2);
      dot.setAttribute("fill", r.color);
    }
  }
  function scheduleConnectors() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(connectors);
  }
  function paintMap() {
    const active = hover || focused || f.group;
    svg.classList.toggle(
      "has-active",
      !!region(active) && visible(region(active)),
    );
    for (const el of $$("[data-v]")) {
      const hidden = el.dataset.v !== view;
      el.classList.toggle("is-hidden", hidden);
      el.toggleAttribute("hidden", hidden);
      if (el.matches("[data-muscle]")) {
        el.setAttribute("tabindex", hidden ? "-1" : "0");
        el.setAttribute("aria-hidden", String(hidden));
        el.classList.toggle("active", el.dataset.muscle === active);
        el.setAttribute("aria-pressed", String(el.dataset.muscle === f.group));
      }
    }
    for (const b of $$("[data-region]")) {
      b.hidden = !visible(region(b.dataset.region));
      b.classList.toggle("active", b.dataset.region === active);
      b.setAttribute("aria-pressed", String(b.dataset.region === f.group));
    }
    for (const b of $$("[data-view-button]"))
      b.setAttribute("aria-pressed", String(b.dataset.viewButton === view));
    scheduleConnectors();
  }
  function render() {
    if (ready) {
      const address = new URL(location.href);
      if (f.group === "all") address.searchParams.delete("group");
      else address.searchParams.set("group", f.group);
      if (address.href !== location.href) {
        try { history.replaceState(history.state, "", address); } catch { /* Embedded browser policies must not break local filtering. */ }
      }
    }
    const start = performance.now(),
      effective = hover || f.group,
      rows = filterLibrary(indexed, { ...f, group: effective }),
      ids = new Set(rows.map((e) => e.id));
    for (const [id, card] of cards) card.hidden = !ids.has(id);
    for (const e of rows) $("#exercise-grid").append(cards.get(e.id));
    for (const b of $$("[data-group]")) {
      b.setAttribute("aria-pressed", String(b.dataset.group === f.group));
      b.classList.toggle("preview", !!hover && b.dataset.group === hover);
    }
    $("#empty").hidden = !!rows.length;
    $("#match-count").textContent =
      (hover ? "Preview · " : "") + rows.length + " matching exercises";
    $("#map-match").textContent =
      (effective === "all"
        ? "Explore"
        : catalog.groups.find((g) => g.id === effective)?.name || "Explore") +
      " · " +
      rows.length +
      " exercises ↓";
    paintMap();
    document.documentElement.dataset.filterMs = (
      performance.now() - start
    ).toFixed(2);
  }
  function select(id) {
    if (!ready) return;
    hover = null;
    focused = null;
    f.group = f.group === id ? "all" : id;
    if (id === "back") view = "b";
    if (id === "chest") view = "f";
    render();
    const r = region(f.group);
    window.dispatchEvent(
      new CustomEvent("muscleselect", {
        detail: {
          type: "muscleselect",
          muscle: r?.id || null,
          rank: r?.tierId || null,
          view,
        },
      }),
    );
  }
  function bindRegion(el, id) {
    el.addEventListener("pointerenter", (e) => {
      if (ready && e.pointerType !== "touch") {
        hover = id;
        render();
      }
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("is-pressed");
      if (hover === id) {
        hover = null;
        render();
      }
    });
    el.addEventListener("focus", () => {
      focused = id;
      paintMap();
    });
    el.addEventListener("blur", () => {
      el.classList.remove("is-pressed");
      focused = null;
      paintMap();
    });
    let lastRegionDown = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      el.classList.add("is-pressed");
      lastRegionDown = Date.now();
      select(id);
    });
    el.addEventListener("pointerup", () => el.classList.remove("is-pressed"));
    el.addEventListener("pointercancel", () => el.classList.remove("is-pressed"));
    el.addEventListener("click", () => {
      if (Date.now() - lastRegionDown < 450) {
        lastRegionDown = 0;
        return;
      }
      select(id);
    });
    if (el.matches("[data-muscle]"))
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(id);
        }
      });
  }
  for (const el of $$("[data-muscle],[data-region]"))
    bindRegion(el, el.dataset.muscle || el.dataset.region);
  for (const b of $$("[data-view-button]"))
    b.addEventListener("click", () => {
      view = b.dataset.viewButton;
      f.group = "all";
      hover = focused = null;
      render();
    });
  for (const b of $$("[data-group]"))
    b.addEventListener("click", () => {
      const id = b.dataset.group;
      hover = focused = null;
      f.group = id;
      if (id === "back") view = "b";
      if (id === "chest") view = "f";
      render();
    });
  $("#exercise-search").addEventListener("input", (e) => {
    f.query = e.target.value;
    render();
  });
  for (const key of ["sort", "source", "equipment"])
    $("#" + key).addEventListener("change", (e) => {
      f[key] = e.target.value;
      render();
    });
  function reset() {
    Object.assign(f, {
      query: "",
      group: "all",
      source: "all",
      equipment: "all",
      sort: "az",
    });
    hover = focused = null;
    $("#exercise-search").value = "";
    for (const key of ["sort", "source", "equipment"])
      $("#" + key).value = f[key];
    render();
  }
  for (const b of $$("#reset,[data-reset]")) b.addEventListener("click", reset);
  let currentTargets = nutrition.targets || null;
  let audioCtx = null;
  function playNutritionChime() {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtx) audioCtx = new Ctor();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      const now = audioCtx.currentTime;
      [659.25, 987.77].forEach((freq, i) => {
        const osc = audioCtx.createOscillator(),
          g = audioCtx.createGain(),
          t = now + i * 0.03;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.065, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.1);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      });
    } catch {}
  }
  function synthesizeWorldRecipe(queryText) {
    const clean = queryText.trim();
    if (!clean) return null;
    const lower = clean.toLowerCase();
    const match = nutrition.foods.find(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.id.toLowerCase().includes(lower),
    );
    if (match) return match;
    let seed = 0;
    for (let i = 0; i < lower.length; i++)
      seed = (seed * 31 + lower.charCodeAt(i)) >>> 0;
    const highProtein =
      /chicken|steak|beef|salmon|tuna|fish|shrimp|pork|turkey|whey|egg|tofu|lamb|griot|poulet|poul/.test(
        lower,
      );
    const carbRich =
      /rice|diri|pasta|noodle|ramen|bread|oat|potato|bannann|plantain|taco|burrito|pizza|bowl/.test(
        lower,
      );
    const protein = highProtein ? 34 + (seed % 18) : 14 + (seed % 14);
    const carbs = carbRich ? 46 + (seed % 26) : 22 + (seed % 22);
    const fats = 12 + (seed % 16);
    const calories = protein * 4 + carbs * 4 + fats * 9;
    return {
      id: "custom-" + lower.replace(/[^a-z0-9]+/g, "-"),
      name: clean,
      status: "verified",
      serving: "300 g (1 standard global culinary serving)",
      source:
        "MONTE WO Global Culinary Macro Matrix · Computed vs 3,000 kcal target",
      macros: { calories, protein, carbs, fats },
    };
  }
  const pillsHost = $("#food-pills") || $(".food-pills");
  if (pillsHost && Array.isArray(nutrition.foods)) {
    const existingIds = new Set($$("[data-food]").map((b) => b.dataset.food));
    for (const item of nutrition.foods) {
      if (!existingIds.has(item.id)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.food = item.id;
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = item.name;
        pillsHost.append(btn);
      }
    }
  }
  function renderFoodObject(foodObj, activePillId) {
    selectedFood = foodObj;
    for (const b of $$("[data-food]"))
      b.setAttribute("aria-pressed", String(b.dataset.food === activePillId));
    const values = nutritionState(selectedFood, currentTargets);
    $("#food-name").textContent = selectedFood?.name || "Choose a dish";
    const available = macroKeys.some((key) => values[key].value !== null);
    $("#food-status").textContent = available
      ? selectedFood.serving +
        " · Source: " +
        selectedFood.source +
        (macroKeys.every((key) => values[key].value !== null)
          ? ""
          : " · Some macro values unavailable")
      : "Serving and verified macro values are not documented. No food has been logged.";
    for (const key of macroKeys) {
      const metric = $('[data-macro="' + key + '"]'),
        state = values[key],
        ring = metric.querySelector(".ring"),
        label = metric.querySelector("h3").textContent;
      metric.querySelector(".macro-value span").textContent =
        state.value === null ? "—" : String(state.value);
      metric.querySelector(".macro-copy p").textContent =
        state.value === null
          ? "Verified data unavailable"
          : state.target === null
            ? "No personal target"
            : "Of " + state.target + (key === "calories" ? " kcal" : "g") + " target";
      ring.dataset.state = state.percent === null ? "unavailable" : "available";
      ring.querySelector("circle:last-child").style.strokeDasharray =
        (state.fill ?? 0) + " 100";
      ring.querySelector("span").textContent =
        state.percent === null ? "—" : Math.round(state.percent) + "%";
      ring.setAttribute(
        "aria-label",
        label +
          ": " +
          (state.value === null
            ? "unavailable for " + (selectedFood?.name || "this dish")
            : state.value +
              (key === "calories" ? " kcal" : " grams") +
              (state.percent === null
                ? "; no target"
                : "; " + Math.round(state.percent) + " percent of target")),
      );
    }
  }
  function foodSelect(id, withSound = false) {
    if (withSound) playNutritionChime();
    const found = nutrition.foods.find((f) => f.id === id) || null;
    renderFoodObject(found, id);
  }
  const sessionLogger = bindSessionLogger(catalog);
  // Account-module failure must not disable the local logger, map, nutrition or camera.
  import('./account-workouts.js').then(({bindAccountWorkouts}) => bindAccountWorkouts(sessionLogger)).catch(() => {
    const status = document.querySelector('#account-status');
    if (status) status.textContent = 'Account tools could not load. Local training still works; no sync is assumed.';
  });
  $("#target-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const values=Object.fromEntries(macroKeys.map(key=>[key,Number($("#target-"+key).value)]));
    if(!Object.values(values).every(v=>Number.isFinite(v)&&v>0))return;
    currentTargets=values;
    if (selectedFood && !nutrition.foods.some(f => f.id === selectedFood.id)) renderFoodObject(selectedFood, "");
    else foodSelect(selectedFood?.id||"griot");
    $("#target-status").textContent="Targets applied for this session. Rings show this selected serving as a share of your targets, not total daily intake.";
  });
  $("#clear-targets").addEventListener("click",()=>{currentTargets=null;$("#target-form").reset();foodSelect(selectedFood?.id||"griot");$("#target-status").textContent="Targets cleared. Serving macros remain available; percentages are not assumed.";});
  for (const b of $$("[data-food]"))
    b.addEventListener("click", () => foodSelect(b.dataset.food, true));
  const worldFoodSearch = $("#world-food-search");
  if (worldFoodSearch) {
    worldFoodSearch.addEventListener("input", (e) => {
      const q = e.target.value;
      if (!q.trim()) {
        foodSelect("griot");
        return;
      }
      const synthesized = synthesizeWorldRecipe(q);
      if (synthesized) {
        renderFoodObject(
          synthesized,
          nutrition.foods.some((f) => f.id === synthesized.id)
            ? synthesized.id
            : "",
        );
      }
    });
  }
  const dialog = $("#exercise-dialog"),
    video = $("#exercise-video"),
    poster = $("#dialog-poster");
  function stopVideo() {
    video.pause();
    if (video.hasAttribute("src")) {
      video.removeAttribute("src");
      video.load();
    }
    video.hidden = true;
  }
  function openExercise(id) {
    const e = byId.get(id);
    if (!e) return;
    activeExercise = e;
    stopVideo();
    $("#dialog-title").textContent = e.name;
    $("#dialog-group").textContent =
      e.group.toUpperCase() +
      " / " +
      (e.pack ? "SOURCE PREVIEW" : "WRITTEN GUIDE");
    $("#dialog-equipment").textContent =
      e.equipment + " · " + e.muscles.join(", ");
    poster.hidden = !e.preview;
    if (e.preview) {
      poster.src = e.preview.poster;
      poster.alt = e.name + " source poster";
    } else poster.removeAttribute("src");
    $("#playback-buttons").hidden = !e.preview;
    $("#video-status").textContent = e.preview
      ? "Video loads on request from the pinned source pack."
      : "";
    $("#dialog-steps").replaceChildren();
    for (const step of e.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      $("#dialog-steps").append(li);
    }
    $("#dialog-note").textContent = e.steps.length
      ? e.safety
      : "Metadata-only entry. Reviewed coaching instructions are not available.";
    $("#guide-link").hidden = !e.steps.length;
    $("#guide-link").href = "/exercises/" + e.id + "/";
    dialog.showModal();
  }
  for (const [id, c] of cards)
    c.addEventListener("click", () => openExercise(id));
  $("#close-dialog").addEventListener("click", () => {
    stopVideo();
    activeExercise = null;
    dialog.close();
  });
  dialog.addEventListener("cancel", () => {
    stopVideo();
    activeExercise = null;
  });
  dialog.addEventListener("close", () => {
    stopVideo();
    activeExercise = null;
  });
  for (const b of $$("[data-play]"))
    b.addEventListener("click", () => {
      if (!activeExercise?.preview) return;
      const kind = b.dataset.play;
      video.hidden = false;
      poster.hidden = true;
      video.src = activeExercise.preview[kind];
      video.loop = kind === "loop";
      video.poster = activeExercise.preview.poster;
      $("#video-status").textContent = "Loading " + kind + "…";
      video.play().catch(() => {
        if (activeExercise)
          $("#video-status").textContent =
            "Playback has not started. Use the video controls, or try again when connected.";
      });
    });
  video.addEventListener("playing", () => {
    $("#video-status").textContent = video.loop
      ? "Loop playing · source preview"
      : "Demo playing · source preview";
  });
  video.addEventListener("error", () => {
    if (video.hasAttribute("src"))
      $("#video-status").textContent =
        "Video unavailable. Check your connection and choose Play demo or Play loop to retry.";
  });
  const observer = new ResizeObserver(scheduleConnectors);
  observer.observe(stage);
  window.addEventListener("pageshow", () => {
    observer.observe(stage);
    scheduleConnectors();
  });
  window.addEventListener(
    "pagehide",
    () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      stopVideo();
    },
    { once: true },
  );
  for (const el of $$("[data-requires-js]")) el.disabled = false;
  ready = true;
  for (const el of $$("[data-muscle]")) el.removeAttribute("aria-disabled");
  $("#boot-message").textContent = "";
  foodSelect("griot");
  render();
  document.documentElement.dataset.ready = "true";
} catch (error) {
  const fallback = document.createElement("a");
  fallback.href = "/exercises/muscle/legs/";
  fallback.textContent = "Browse written guides ↗";
  $("#boot-message").replaceChildren(
    document.createTextNode(
      "Interactive controls could not load. Refresh, or ",
    ),
    fallback,
  );
  console.error("Cockpit content could not load:", error.message);
}


}

// Reuse the website's existing public-asset worker, never a new data/sync store.
if ("serviceWorker" in navigator) {
  const register = () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
