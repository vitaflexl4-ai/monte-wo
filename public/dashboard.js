// MONTE WO application foundation (Step 1). Local UI state only: no fetch, storage, cookies,
// camera access, athlete data or ranking logic. Views are hash routes; CSS :target keeps them
// reachable without JavaScript, this module adds aria state, focus, the drawer and the demo panels.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const data=JSON.parse($('#dashboard-data')?.textContent||'{}'),copy=data.copy||{},status=data.status||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------------------------------------------------------------- view router
const views=$$('.app-view'),links=$$('[data-view-link]'),DEFAULT='dashboard',baseTitle=document.title;
const viewId=()=>{const id=decodeURIComponent(location.hash.slice(1));return views.some(v=>v.id===id)?id:DEFAULT};
function render(focus=false){
 const id=viewId();
 for(const v of views)v.classList.toggle('is-active',v.id===id);
 for(const a of links){const on=a.dataset.viewLink===id;if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}
 const view=views.find(v=>v.id===id),suffix=baseTitle.includes(' | ')?baseTitle.slice(baseTitle.indexOf(' | ')):'';document.title=id===DEFAULT||!view?.dataset.title?baseTitle:view.dataset.title+suffix;
 const crumb=$('#app-crumb-view');if(crumb&&view?.dataset.title)crumb.textContent=view.dataset.title;
 if(focus)view?.querySelector('.view-title')?.focus({preventScroll:true});
}
let fromNav=false;
for(const a of links)a.addEventListener('click',()=>{fromNav=true;closeDrawer();if(a.getAttribute('href')===location.hash){render(true);fromNav=false}});
window.addEventListener('hashchange',()=>{render(fromNav);fromNav=false});
render();

// ---------------------------------------------------------------- mobile drawer
// Any control marked data-drawer-toggle (the "More" tab) opens the full navigation; focus returns to the control that opened it.
const toggles=$$('[data-drawer-toggle]'),sidebar=$('#app-sidebar'),backdrop=$('.app-backdrop'),wide=matchMedia('(min-width:1024px)');let drawerOpener=null;
function setDrawer(open,restore=false){
 document.body.classList.toggle('nav-open',open);for(const t of toggles)t.setAttribute('aria-expanded',String(open));if(backdrop)backdrop.hidden=!open;
 if(open)(sidebar?.querySelector('#app-nav a[aria-current="page"]')||sidebar?.querySelector('#app-nav a'))?.focus();else if(restore)(drawerOpener||toggles[0])?.focus();
 if(!open)drawerOpener=null;
}
function closeDrawer(restore=false){if(document.body.classList.contains('nav-open'))setDrawer(false,restore)}
for(const t of toggles)t.addEventListener('click',()=>{const open=t.getAttribute('aria-expanded')!=='true';drawerOpener=open?t:null;setDrawer(open)});
backdrop?.addEventListener('click',()=>closeDrawer());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('nav-open')){e.preventDefault();closeDrawer(true)}});
document.addEventListener('focusin',e=>{if(document.body.classList.contains('nav-open')&&!e.target.closest('#app-sidebar,[data-drawer-toggle]'))closeDrawer()});
wide.addEventListener('change',()=>closeDrawer());

// ---------------------------------------------------------------- panel 1: muscle character view
const regions=new Map((data.regions||[]).map(r=>[r.id,r]));
const regionEls=$$('[data-region]'),preview=$('#muscle-preview');
const detail={title:$('#muscle-detail-title'),badge:$('#muscle-detail-badge'),text:$('#muscle-detail-text'),meta:$('#muscle-detail-meta'),disciplines:$('#muscle-detail-disciplines'),guide:$('#muscle-detail-guide'),status:$('#muscle-detail-status')};
let selected=null,hovered=null;
const label=r=>r?`${r.name} · ${status[r.status]||status.notConnected}`:copy.previewIdle||'';
function paint(){
 for(const el of regionEls){const id=el.dataset.region;el.classList.toggle('is-hover',id===hovered);el.classList.toggle('is-selected',id===selected);el.setAttribute('aria-pressed',String(id===selected))}
 if(preview)preview.textContent=label(regions.get(hovered||selected));
 const r=regions.get(selected);
 if(!detail.title)return;
 if(!r){detail.title.textContent=copy.detailIdle||'';detail.text.textContent=copy.detailIdleText||'';detail.badge.hidden=true;detail.meta.hidden=true;detail.status.hidden=true;return}
 detail.title.textContent=r.name;detail.badge.textContent=status[r.status]||status.notConnected;detail.badge.hidden=false;
 detail.text.textContent=r.text;detail.disciplines.textContent=r.disciplines.length?r.disciplines.join(' · '):copy.none;
 detail.guide.setAttribute('href',r.guide);detail.meta.hidden=false;detail.status.hidden=false;
}
for(const el of regionEls){
 const id=el.dataset.region;
 el.addEventListener('mouseenter',()=>{hovered=id;paint()});el.addEventListener('mouseleave',()=>{hovered=null;paint()});
 el.addEventListener('focus',()=>{hovered=id;paint()});el.addEventListener('blur',()=>{hovered=null;paint()});
 const toggle=()=>{selected=selected===id?null:id;paint()};// aria-pressed semantics: activating the selected region clears it
 el.addEventListener('click',toggle);
 el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
}
paint();

// ---------------------------------------------------------------- panel 2: food scan & macro logger (demo)
const foods=data.foods||[],search=$('#food-search'),results=$('#food-results'),pills=$$('[data-food]'),logList=$('#food-log'),logEmpty=$('#food-log-empty'),logCount=$('#food-log-count');
let activeFilter=null;const log=[];
const match=q=>{const s=q.trim().toLowerCase();return s?foods.filter(x=>x.name.toLowerCase().includes(s)||x.origin.toLowerCase().includes(s)):[]};
function renderResults(){
 if(!results)return;const q=search?.value||'';const found=activeFilter?foods.filter(x=>x.id===activeFilter):match(q);
 if(!q.trim()&&!activeFilter){results.innerHTML=`<p class="food-empty">${esc(copy.emptyResults)}</p>`;return}
 if(!found.length){results.innerHTML=`<p class="food-empty">${esc(copy.noMatch)}</p>`;return}
 results.innerHTML=found.map(x=>`<article class="food-item" data-food-item="${esc(x.id)}"><div><strong>${esc(x.name)}</strong><small>${esc(x.origin)}</small><span class="badge badge-demo">${esc(status.demo)}</span><span class="badge">${esc(copy.valuesUnavailable)}</span></div><button type="button" class="food-add" data-add="${esc(x.id)}">${esc(copy.addButton)}</button></article>`).join('');
}
function renderLog(){
 if(!logList)return;logList.innerHTML=log.map((x,i)=>`<li><span><strong>${esc(x.name)}</strong><small>${esc(copy.valuesUnavailable)}</small></span><button type="button" class="food-remove" data-remove="${i}" aria-label="${esc(copy.removeButton)} ${esc(x.name)}">${esc(copy.removeButton)}</button></li>`).join('');
 logEmpty.hidden=log.length>0;logCount.textContent=`${log.length} item${log.length===1?'':'s'}`;
 // Totals intentionally stay "—": there is no nutrition source to compute from.
 for(const el of $$('[data-macro-value]'))el.textContent='—';
}
for(const pill of pills)pill.addEventListener('click',()=>{
 const id=pill.dataset.food;activeFilter=activeFilter===id?null:id;
 for(const p of pills)p.setAttribute('aria-pressed',String(p.dataset.food===activeFilter));
 if(search)search.value=activeFilter?foods.find(x=>x.id===activeFilter)?.name||'':'';renderResults();
});
search?.addEventListener('input',()=>{activeFilter=null;for(const p of pills)p.setAttribute('aria-pressed','false');renderResults()});
$('#food-search-form')?.addEventListener('submit',e=>{e.preventDefault();renderResults()});
results?.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const item=foods.find(x=>x.id===b.dataset.add);if(item){log.push(item);renderLog()}});
logList?.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;log.splice(Number(b.dataset.remove),1);renderLog();logList.querySelector('button')?.focus()});
renderLog();

// ---------------------------------------------------------------- camera viewfinder mockup (no camera is ever requested)
const dialog=$('#camera-mockup'),scan=$('#scan-food');let opener=null;
function openCamera(){opener=document.activeElement;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');dialog.querySelector('.dialog-close')?.focus()}
function closeCamera(){if(dialog.open&&typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open')}
if(dialog&&scan){
 scan.addEventListener('click',openCamera);
 for(const b of dialog.querySelectorAll('[data-close-camera]'))b.addEventListener('click',closeCamera);
 dialog.addEventListener('click',e=>{if(e.target===dialog)closeCamera()});
 dialog.addEventListener('close',()=>{(opener||scan).focus();opener=null});
}

// ---------------------------------------------------------------- offline shell (same worker the public site installs)
if('serviceWorker' in navigator&&!window.__MW_NATIVE){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{/* Private/embedded browsers may not allow installation. */})})}
