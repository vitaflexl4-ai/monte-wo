"""MONTE WO application foundation (Step 1): generates /dashboard/ from content sources.

Standard library only. Reads content/dashboard/en.json plus the existing discipline, rulebook,
rank and exercise-group sources so the shell never hard-codes product facts. It creates no
accounts, data, thresholds or integrations; every panel renders honest demo / not-connected states.
Run after build_website.py (the dashboard has its own application chrome and is deliberately
excluded from the public-website route list, navigation and sitemap).
"""
from pathlib import Path
import json, html, re

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / 'public'
C = ROOT / 'content'

copy = json.loads((C / 'dashboard/en.json').read_text())
disciplines = json.loads((C / 'strength/disciplines.json').read_text())
rulebooks = {d['id']: json.loads((C / f'strength/{d["rulebookId"]}.json').read_text()) for d in disciplines}
ranks = json.loads((P / 'ranks.json').read_text())
groups = json.loads((C / 'exercises.json').read_text())['groups']
S = copy['status']


def esc(value):
    return html.escape(str(value), quote=True)


# Inline stroke icons: crisp at any size and independent of the device's glyph coverage.
ICONS = {
    'grid': '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    'bar': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    'rule': '<path d="M5 3h14v18H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    'peak': '<path d="M3 20 10 7l4 7 2-3 5 9Z"/><path d="M10 7l2.5 4"/>',
    'book': '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19V5M8 7h7"/>',
    'leaf': '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z"/><path d="M5 19 14 10"/>',
    'shield': '<path d="M12 3 20 6v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    'cog': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'camera': '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
    'close': '<path d="M6 6l12 12M18 6 6 18"/>',
    'arrow': '<path d="M7 17 17 7M9 7h8v8"/>',
}


def icon(name, cls='app-icon'):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


def badge(kind):
    cls = {'notConnected': 'badge', 'demo': 'badge badge-demo', 'draft': 'badge badge-draft',
           'planned': 'badge', 'available': 'badge badge-ok'}[kind]
    return f'<span class="{cls}">{esc(S[kind])}</span>'


def links(items):
    return '<ul class="link-list">' + ''.join(
        f'<li><a href="{esc(x["href"])}">{esc(x["label"])} <b aria-hidden="true">↗</b></a></li>' for x in items) + '</ul>'


# ---------------------------------------------------------------- navigation
nav_items = copy['navigation']
nav = '<nav id="app-nav" class="app-nav" aria-label="Application">' + ''.join(
    f'<a href="#{esc(x["id"])}" data-view-link="{esc(x["id"])}"' + (' aria-current="page"' if i == 0 else '') +
    f'>{icon(x["icon"])}<span>{esc(x["label"])}</span></a>' for i, x in enumerate(nav_items)) + '</nav>'

brand = ('<a class="app-brand" href="#dashboard" aria-label="MONTE WO · Dashboard">'
         '<img src="/assets/monte-wo-emblem.webp" alt="" width="60" height="30" decoding="async">'
         f'<span class="app-brand-text">MONTE <span class="brand-word-wo">WO</span><small>{esc(copy["brandTag"])}</small></span></a>')

topbar = ('<header class="app-topbar">'
          f'{brand}<p class="app-crumb">APP <span aria-hidden="true">/</span> <b id="app-crumb-view">{esc(nav_items[0]["label"])}</b></p>'
          f'<div class="app-topbar-right"><span class="app-chip" title="{esc(copy["account"]["note"])}"><i aria-hidden="true"></i>{esc(copy["account"]["label"])} · {esc(copy["account"]["value"])}</span></div>'
          '</header>')

# Native-style bottom tab bar (phones/tablets): four primary destinations + "More" opening the full navigation drawer.
tabs = copy['tabs']
tab_items = [x for x in nav_items if x['id'] in tabs['primary']]
assert [x['id'] for x in tab_items] == tabs['primary'], 'tab order must follow the navigation order'
CURRENT = ' aria-current="page"'
tabbar = ('<nav class="app-tabbar" aria-label="Primary">' + ''.join(
    f'<a class="app-tab" href="#{esc(x["id"])}" data-view-link="{esc(x["id"])}"{CURRENT if x["id"] == "dashboard" else ""}>{icon(x["icon"])}<span>{esc(x["label"])}</span></a>'
    for x in tab_items) +
    f'<button type="button" class="app-tab app-tab-more" data-drawer-toggle aria-expanded="false" aria-controls="app-sidebar" aria-label="{esc(tabs["moreLabel"])}">{icon("menu")}<span>{esc(tabs["more"])}</span></button></nav>')

sidebar = ('<aside class="app-sidebar" id="app-sidebar">'
           f'<div class="app-sidebar-brand">{brand}</div>{nav}'
           f'<div class="app-sidebar-foot"><span class="app-chip"><i aria-hidden="true"></i>{esc(copy["account"]["label"])} · {esc(copy["account"]["value"])}</span>'
           f'<p>{esc(copy["account"]["note"])}</p><a href="/about/">{esc(copy["aboutLabel"])} <b aria-hidden="true">↗</b></a></div>'
           '</aside>')

# ---------------------------------------------------------------- discipline cards (real sources, no awards)
labels = copy['disciplineLabels']
d = copy['dashboard']
tiles = ''
for i, disc in enumerate(disciplines):
    rule = rulebooks[disc['id']]
    tiles += (f'<article class="discipline-tile" data-discipline="{esc(disc["id"])}">'
              f'<div class="tile-top"><span>DISCIPLINE 0{i + 1}</span>{badge("draft")}</div>'
              f'<h3>{esc(labels[disc["id"]])}</h3><small>{esc(disc["name"])} · {esc(rule["id"])}</small>'
              f'<div class="tile-rank"><span class="unranked-mark" aria-hidden="true">—</span><div><strong>{esc(d["noRank"])}</strong><p>{esc(d["noRankText"])}</p></div></div>'
              f'<dl class="tile-meta"><div><dt>{esc(d["standardLabel"])}</dt><dd>{esc(rule["status"])}</dd></div>'
              f'<div><dt>{esc(d["athleteLabel"])}</dt><dd>{esc(S["notConnected"])}</dd></div></dl>'
              f'<a href="/methodology/#{esc(disc["id"])}">{esc(d["standardLabel"])} <b aria-hidden="true">↗</b></a></article>')
disciplines_section = (f'<section class="disciplines" aria-labelledby="disciplines-title"><div class="section-head">'
                       f'<span class="eyebrow" id="disciplines-title">{esc(d["disciplinesEyebrow"])}</span>{badge("notConnected")}</div>'
                       f'<div class="discipline-grid">{tiles}</div><p class="section-note">{esc(d["disciplinesNote"])}</p></section>')

# ---------------------------------------------------------------- panel 1: muscle character view
m = copy['muscle']
regions = m['regions']
BASE = ('<g class="mf-base">'
        '<circle cx="120" cy="44" r="27"/><rect x="106" y="66" width="28" height="26" rx="8"/>'
        '<path d="M68 98 C92 91 148 91 172 98 L163 178 C160 204 158 230 156 256 L84 256 C82 230 80 204 77 178 Z" stroke-width="14" stroke-linejoin="round"/>'
        '<circle cx="64" cy="108" r="16"/><circle cx="176" cy="108" r="16"/>'
        '<path d="M60 116 L48 196 L42 278" stroke-width="26" stroke-linecap="round" fill="none"/>'
        '<path d="M180 116 L192 196 L198 278" stroke-width="26" stroke-linecap="round" fill="none"/>'
        '<circle cx="41" cy="292" r="11"/><circle cx="199" cy="292" r="11"/>'
        '<path d="M100 258 L96 352 L92 446" stroke-width="36" stroke-linecap="round" fill="none"/>'
        '<path d="M140 258 L144 352 L148 446" stroke-width="36" stroke-linecap="round" fill="none"/>'
        '<ellipse cx="88" cy="458" rx="18" ry="9"/><ellipse cx="152" cy="458" rx="18" ry="9"/></g>')
SHAPES = {
    'chest': '<path d="M80 102 C92 98 106 98 118 100 L118 158 C104 170 88 166 82 154 Z"/><path d="M122 100 C134 98 148 98 160 102 L158 154 C152 166 136 170 122 158 Z"/>',
    'core': '<path d="M84 168 L156 168 L154 252 L86 252 Z"/><path class="mf-detail" d="M120 172 V248 M88 196 H152 M87 224 H153"/>',
    'arms': '<path d="M60 122 L48 196 L42 272" stroke-width="24" stroke-linecap="round" fill="none"/>'
            '<path d="M180 122 L192 196 L198 272" stroke-width="24" stroke-linecap="round" fill="none"/>',
    'legs': '<path d="M100 262 L96 352 L92 440" stroke-width="34" stroke-linecap="round" fill="none"/>'
            '<path d="M140 262 L144 352 L148 440" stroke-width="34" stroke-linecap="round" fill="none"/>',
}
figure = ''.join(
    f'<g class="muscle-region" data-region="{esc(r["id"])}" role="button" tabindex="0" aria-pressed="false" '
    f'aria-label="{esc(r["name"])}: {esc(S[r["status"]].lower())}"><title>{esc(r["name"])} — {esc(S[r["status"]])}</title>{SHAPES[r["id"]]}</g>'
    for r in regions)
svg = (f'<svg class="muscle-figure" viewBox="0 0 240 480" role="group" aria-label="{esc(m["figureLabel"])}" focusable="false">'
       f'{BASE}{figure}</svg>')
chips = '<div class="muscle-chips" role="group" aria-label="Regions">' + ''.join(
    f'<button type="button" class="muscle-chip" data-region="{esc(r["id"])}" aria-pressed="false">{esc(r["name"])}</button>' for r in regions) + '</div>'
muscle_panel = (
    '<section class="app-panel muscle-panel" aria-labelledby="muscle-title">'
    f'<header class="panel-head"><div class="panel-eyebrow"><span class="eyebrow">{esc(m["eyebrow"])}</span>{badge("notConnected")}</div>'
    f'<h2 id="muscle-title">{esc(m["title"])}</h2><p>{esc(m["intro"])}</p></header>'
    '<div class="muscle-layout"><div class="muscle-stage">'
    f'<p class="muscle-preview" id="muscle-preview" aria-live="polite">{esc(m["previewIdle"])}</p>{svg}{chips}</div>'
    f'<div class="muscle-detail" id="muscle-detail" aria-live="polite"><div class="muscle-detail-top"><h3 id="muscle-detail-title">{esc(m["detailIdle"])}</h3>'
    f'<span class="badge" id="muscle-detail-badge" hidden></span></div><p id="muscle-detail-text">{esc(m["detailIdleText"])}</p>'
    f'<dl class="muscle-detail-meta" id="muscle-detail-meta" hidden><div><dt>{esc(m["disciplinesLabel"])}</dt><dd id="muscle-detail-disciplines"></dd></div>'
    f'<div><dt>{esc(m["guideLabel"])}</dt><dd><a id="muscle-detail-guide" href="/exercises/">{esc(m["guideCta"])} <b aria-hidden="true">↗</b></a></dd></div></dl>'
    f'<p class="panel-note" id="muscle-detail-status" hidden>{esc(m["statusText"])}</p></div></div></section>')

# ---------------------------------------------------------------- panel 2: food scan & macro logger (demo)
f = copy['food']
pills = '<div class="food-filters" role="group" aria-label="' + esc(f['filtersLabel']) + '">' + ''.join(
    f'<button type="button" class="pill" data-food="{esc(x["id"])}" aria-pressed="false">{esc(x["name"])}</button>' for x in f['items']) + '</div>'
macros = '<div class="macro-grid">' + ''.join(
    f'<div class="macro" data-macro="{esc(x["id"])}"><span class="macro-name">{esc(x["name"])}</span>'
    f'<strong class="macro-value"><span data-macro-value>—</span><small>g</small></strong>'
    f'<div class="macro-bar" aria-hidden="true"><i style="width:0%"></i></div>{badge("notConnected")}</div>' for x in f['macros']) + '</div>'
food_panel = (
    '<section class="app-panel food-panel" aria-labelledby="food-title">'
    f'<header class="panel-head"><div class="panel-eyebrow"><span class="eyebrow">{esc(f["eyebrow"])}</span><span class="badge-row">{badge("demo")}{badge("notConnected")}</span></div>'
    f'<h2 id="food-title">{esc(f["title"])}</h2><p>{esc(f["intro"])}</p></header>'
    f'<form class="food-search" role="search" id="food-search-form"><label for="food-search">{esc(f["searchLabel"])}</label>'
    f'<div class="food-search-box"><input id="food-search" name="q" type="search" placeholder="{esc(f["searchPlaceholder"])}" autocomplete="off" '
    f'maxlength="60" aria-describedby="food-search-help"><span class="badge badge-demo">{esc(S["demo"])}</span></div>'
    f'<p class="field-help" id="food-search-help">{esc(f["searchHelp"])}</p></form>'
    f'<span class="group-label">{esc(f["filtersLabel"])}</span>{pills}'
    f'<div class="food-scan"><button type="button" class="button button-scan" id="scan-food">{icon("camera")} {esc(f["scanButton"])}</button>'
    f'<p class="field-help">{esc(f["scanHelp"])}</p></div>'
    f'<div class="food-results-wrap"><span class="group-label">{esc(f["resultsLabel"])}</span>'
    f'<div class="food-results" id="food-results" aria-live="polite"><p class="food-empty">{esc(f["emptyResults"])}</p></div></div>'
    f'<div class="food-log"><div class="food-log-head"><h3>{esc(f["logLabel"])}</h3><span class="badge" id="food-log-count">0 items</span></div>'
    f'<ul class="food-log-list" id="food-log"></ul><p class="food-empty" id="food-log-empty">{esc(f["logEmpty"])}</p></div>'
    f'<div class="macros"><div class="food-log-head"><h3>{esc(f["macrosLabel"])}</h3>{badge("notConnected")}</div>{macros}<p class="panel-note">{esc(f["macroNote"])}</p></div>'
    f'<noscript><p class="panel-note">The demo search, quick filters and camera mockup need JavaScript. Nothing is collected either way.</p></noscript>'
    '</section>')

# ---------------------------------------------------------------- camera viewfinder mockup
c = copy['camera']
viewfinder = (
    f'<div class="viewfinder" role="img" aria-label="{esc(c["frameLabel"])}">'
    '<svg viewBox="0 0 320 200" aria-hidden="true" focusable="false">'
    '<defs><pattern id="vf-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#5aadff" stroke-opacity=".12"/></pattern></defs>'
    '<rect width="320" height="200" fill="url(#vf-grid)"/>'
    '<path d="M24 56V32a8 8 0 0 1 8-8h24M264 24h24a8 8 0 0 1 8 8v24M296 144v24a8 8 0 0 1-8 8h-24M56 176H32a8 8 0 0 1-8-8v-24" fill="none" stroke="#8ac6ff" stroke-width="3" stroke-linecap="round"/>'
    '<circle cx="160" cy="100" r="22" fill="none" stroke="#ff4356" stroke-opacity=".8" stroke-width="2"/><path d="M160 70v12M160 118v12M130 100h12M178 100h12" stroke="#ff4356" stroke-opacity=".8" stroke-width="2"/>'
    '<text x="160" y="160" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" letter-spacing="2" fill="#9fb8d4">NO LIVE FEED</text></svg>'
    f'<span class="viewfinder-tag">{esc(S["demo"])} · NO CAMERA ACCESS</span></div>')
camera_dialog = (
    '<dialog id="camera-mockup" class="camera-dialog" aria-labelledby="camera-title" aria-describedby="camera-text">'
    f'<div class="dialog-top"><span class="eyebrow">{esc(c["eyebrow"])}</span><button type="button" class="dialog-close" data-close-camera aria-label="{esc(c["close"])}">{icon("close")}</button></div>'
    f'{viewfinder}<h2 id="camera-title">{esc(c["title"])}</h2><p id="camera-text">{esc(c["text"])}</p>'
    f'<div class="dialog-actions"><button type="button" class="button" data-close-camera>{esc(c["close"])}</button></div></dialog>')

# ---------------------------------------------------------------- views
def view_head(vid, eyebrow, title, text, h='h1', status=None):
    # Every destination that is not built yet carries one uniform, explicit placeholder status in its header.
    status_html = f'<span class="badge badge-placeholder">{esc(S[status])}</span>' if status else ''
    return (f'<header class="view-head"><div class="view-eyebrow-row"><span class="eyebrow">{esc(eyebrow)}</span>{status_html}</div>'
            f'<{h} id="{vid}-title" class="view-title" tabindex="-1">{title}</{h}><p class="view-intro">{esc(text)}</p></header>')


def placeholder(vid, v, extra=''):
    planned = (f'<section class="app-panel"><div class="panel-eyebrow">{badge("planned")}</div><h2>{esc(copy["plannedLabel"])}</h2>'
               '<ul class="plain-list">' + ''.join(f'<li>{esc(x)}</li>' for x in v['planned']) + '</ul></section>') if v.get('planned') else ''
    available = (f'<section class="app-panel"><div class="panel-eyebrow">{badge("available")}</div><h2>{esc(copy["availableLabel"])}</h2>{links(v["links"])}</section>') if v.get('links') else ''
    return (f'<section class="app-view" id="{vid}" aria-labelledby="{vid}-title" data-title="{esc(v["title"])}">'
            f'{view_head(vid, v["eyebrow"], esc(v["title"]), v["text"], status="placeholder")}{extra}<div class="view-grid">{planned}{available}</div></section>')


views = copy['views']
status_strip = '<ul class="status-strip" aria-label="Connection status">' + ''.join(
    f'<li><span>{esc(x["label"])}</span>{badge(x["status"])}</li>' for x in d['statusStrip']) + '</ul>'
app_head = (f'<header class="view-head view-head-app"><div><span class="eyebrow">{esc(d["eyebrow"])}</span>'
            f'<h1 id="dashboard-title" class="view-title" tabindex="-1">{esc(d["title"])}</h1><p class="view-intro">{esc(d["subtitle"])}</p></div>{status_strip}</header>')
dashboard_view = (
    f'<section class="app-view is-active" id="dashboard" aria-labelledby="dashboard-title" data-title="Dashboard">'
    f'{app_head}'
    f'{disciplines_section}<div class="dashboard-grid">{muscle_panel}{food_panel}</div></section>')

standards_rows = ''.join(
    f'<article class="standard-row"><div><span class="eyebrow">DISCIPLINE 0{i + 1} · {esc(rulebooks[x["id"]]["version"].upper())}</span>'
    f'<h3>{esc(rulebooks[x["id"]]["title"])}</h3><p>Variation: <code>{esc(rulebooks[x["id"]]["variation"])}</code> · Equipment: {esc(", ".join(rulebooks[x["id"]]["equipment"]))} · '
    f'{len(rulebooks[x["id"]]["checks"])} validity checks</p></div><div class="standard-row-side">{badge("draft")}<a href="/methodology/#{esc(x["id"])}">Read the standard <b aria-hidden="true">↗</b></a></div></article>'
    for i, x in enumerate(disciplines))
standards_extra = f'<section class="app-panel standards-panel"><div class="panel-eyebrow"><span class="eyebrow">MONTE STANDARD / RULEBOOK STATUS</span>{badge("draft")}</div>{standards_rows}</section>'

rank_tiles = ''.join(
    f'<li class="app-rank-tile" style="--rank-color:{esc(r["color"])}"><img loading="lazy" decoding="async" class="rank-emblem" src="{esc(r["icon"])}" alt="{esc(r["name"])} rank emblem" width="288" height="288">'
    f'<span>0{r["ordinal"]}</span><b>{esc(r["name"])}</b></li>' for r in ranks)
rankings_extra = (f'<section class="app-panel rank-panel"><div class="panel-eyebrow"><span class="eyebrow">NINE RANK IDENTITIES / SAME ORDER IN EVERY DISCIPLINE</span>{badge("draft")}</div>'
                  f'<ol class="app-rank-gallery">{rank_tiles}</ol><p class="panel-note">No threshold tables are approved. These are identities, not awards; no athlete holds a rank and no MONTE Climb Scale percentage exists yet.</p></section>')

group_tiles = ''.join(
    f'<a class="group-tile" href="/exercises/muscle/{esc(g["id"])}/"><span>{esc(g["number"])}</span><h3>{esc(g["name"])}</h3><p>{esc(g["description"])}</p></a>' for g in groups)
library_extra = f'<section class="app-panel"><div class="panel-eyebrow"><span class="eyebrow">SEVEN GROUPS / WRITTEN GUIDES</span>{badge("available")}</div><div class="group-grid">{group_tiles}</div></section>'

extras = {'standards': standards_extra, 'rankings': rankings_extra, 'library': library_extra}
other_views = ''.join(placeholder(vid, views[vid], extras.get(vid, '')) for vid in [x['id'] for x in nav_items if x['id'] != 'dashboard'])


# Client data: region and demo-item metadata only (no nutrition values exist to ship).
data = {'status': S, 'regions': regions, 'foods': f['items'], 'copy': {
    'previewIdle': m['previewIdle'], 'detailIdle': m['detailIdle'], 'detailIdleText': m['detailIdleText'],
    'emptyResults': f['emptyResults'], 'noMatch': f['noMatch'], 'addButton': f['addButton'], 'removeButton': f['removeButton'],
    'valuesUnavailable': f['valuesUnavailable'], 'logEmpty': f['logEmpty'], 'none': 'None — supports all four disciplines'}}
data_script = '<script type="application/json" id="dashboard-data">' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + '</script>'

meta = (f'<meta property="og:type" content="website"><meta property="og:site_name" content="MONTE WO"><meta property="og:title" content="{esc(copy["title"])}">'
        f'<meta property="og:description" content="{esc(copy["description"])}"><meta property="og:image" content="/assets/monte-wo-social.jpg">'
        '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
        '<meta property="og:image:alt" content="MONTE WO. Lift. Rank. Climb high. Free tools available; ranking standards draft, not official.">'
        f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(copy["title"])}">'
        f'<meta name="twitter:description" content="{esc(copy["description"])}"><meta name="twitter:image" content="/assets/monte-wo-social.jpg">'
        '<meta name="robots" content="noindex, nofollow">')

doc = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
       f'<meta name="theme-color" content="#090c13"><title>{esc(copy["title"])}</title><meta name="description" content="{esc(copy["description"])}">'
       '<link rel="icon" type="image/png" href="/assets/icon-32.png"><link rel="manifest" href="/dashboard/manifest.webmanifest">'
       f'<meta name="application-name" content="{esc(copy["appName"])}"><meta name="apple-mobile-web-app-title" content="{esc(copy["appName"])}">'
       '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
       '<link rel="apple-touch-icon" href="/assets/icon-180.png">'
       '<link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/dashboard.css">'
       f'<script src="/dashboard.js" type="module"></script>{meta}</head>'
       '<body class="dashboard-page"><a class="skip" href="#main">Skip to content</a>'
       f'<div class="app-shell">{topbar}{tabbar}{sidebar}<div class="app-backdrop" hidden></div>'
       f'<main id="main" class="app-main" tabindex="-1"><div class="app-views">{dashboard_view}{other_views}</div></main></div>'
       f'{camera_dialog}{data_script}</body></html>')

out = P / 'dashboard/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(doc)

# Web app manifest scoped to the app shell (reuses the existing brand icons; the public site keeps /manifest.json).
manifest = {
    'id': '/dashboard/', 'name': copy['appName'], 'short_name': copy['appName'], 'description': copy['description'],
    'start_url': '/dashboard/', 'scope': '/dashboard/', 'display': 'standalone', 'background_color': '#090c13', 'theme_color': '#090c13',
    'categories': ['fitness', 'health', 'sports'],
    'icons': [{'src': '/assets/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
              {'src': '/assets/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}]}
for icon_entry in manifest['icons']:
    assert (P / icon_entry['src'].lstrip('/')).exists(), icon_entry['src']
(P / 'dashboard/manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

# Offline shell: register the route and its two source files, like the other build steps do.
sw = P / 'sw.js'
text = sw.read_text()
assets = [copy['route'], '/dashboard.css', '/dashboard.js']
if 'const DASHBOARD_ASSETS=' in text:
    text = re.sub(r'const DASHBOARD_ASSETS=.*?;', 'const DASHBOARD_ASSETS=' + json.dumps(assets) + ';', text)
else:
    text = text.replace('const ASSETS=[', 'const DASHBOARD_ASSETS=' + json.dumps(assets) + ';\nconst ASSETS=[...DASHBOARD_ASSETS,')
# The cache name (CORE) is owned by the website build (build_cockpit.py sets it last); adding DASHBOARD_ASSETS changes the
# service-worker bytes, which is what triggers browsers to re-install and re-cache. Do not rewrite CORE here.
sw.write_text(text)
print('Built /dashboard/ application foundation: 9 views, 4 discipline cards (no awards), muscle view, demo food logger. No data, accounts or integrations.')
