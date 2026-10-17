import {workoutPosters} from './workout-posters.js';
import {rankBadge,applyRankVisuals} from './ranks.js';
import {ranks,exercises,calculate} from './scoring.js';
import {translations} from './translations.js';
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}},remove(k){try{localStorage.removeItem(k)}catch{}}};
$$('[data-i18n]').forEach(el=>translations.en[el.dataset.i18n]=el.textContent);
let lang=storage.get('mw-language')||'en'; if(!translations[lang])lang='en';
let unit='kg', selectedRank=3, lastResult=null, installPrompt=null;
const t=(key)=>translations[lang][key]??translations.en[key]??key;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(n,decimals=0)=>new Intl.NumberFormat(lang==='ht'?'fr-HT':lang,{maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(n);

export function badge(index){return rankBadge(index);}
$$('[data-badge]').forEach(el=>el.innerHTML=badge(+el.dataset.badge));
function renderRanks(){
 $('#rank-ladder').innerHTML=ranks.map((rank,i)=>`<button type="button" class="rank-tile ${i===selectedRank?'selected':''}" style="--rank-color:${rank.color}" data-rank="${i}" aria-pressed="${i===selectedRank}" aria-label="${rank.name}, ${t('draftStatus')}">${badge(i)}<b>${rank.name.toUpperCase()}</b><small>${t('draftStatus')}</small></button>`).join('');
 updateRankDetail();
}
function updateRankDetail(){const r=ranks[selectedRank];$('#rank-detail').innerHTML=`<strong style="color:${r.color}">${r.name}</strong> · ${t('draftStatus')} <span aria-hidden="true">/</span> ${t(selectedRank===3?'goldDetail':'rankDetail')}`;}
$('#rank-ladder').addEventListener('click',e=>{const el=e.target.closest('[data-rank]');if(!el)return;selectedRank=+el.dataset.rank;$$('[data-rank]').forEach(b=>{const active=+b.dataset.rank===selectedRank;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});updateRankDetail()});

const exerciseList=[{id:'bench',muscle:'chest',guide:'guideBench'},{id:'squat',muscle:'legs',guide:'guideSquat'},{id:'deadlift',muscle:'posterior',guide:'guideDeadlift'}];
function posterImage(ex){const p=workoutPosters[ex.id];return `<img class="workout-poster-img" src="${p.src}" alt="${esc(t(ex.id))} — ${esc(t('workoutPoster'))}" width="400" height="500" loading="lazy" decoding="async">`}
function renderExercises(){
 $('#exercise-grid').innerHTML=exerciseList.map((ex,i)=>`<article class="exercise-card"><div class="exercise-image has-workout-poster" data-exercise-image="${ex.id}">${posterImage(ex)}<span class="exercise-num">0${i+1} / MONTE WO</span><span class="exercise-badge">${t('workoutPoster')}</span></div><div class="exercise-content"><div><h3>${t(ex.id)}</h3><p>${t(ex.muscle)}</p></div><a class="exercise-open" href="${workoutPosters[ex.id].guide}" data-guide="${ex.id}" aria-label="${t('guideTitle')}: ${t(ex.id)}">↗</a></div></article>`).join('');
}
// Optional same-origin media manifest. Publish approved animations in R2 then list them here.
fetch('/media.json').then(r=>r.ok?r.json():null).then(manifest=>{
 if(!manifest)return; window.mwMedia=manifest; loadMedia();
}).catch(()=>{});
function loadMedia(){
 const manifest=window.mwMedia;if(!manifest)return;
 exerciseList.forEach(ex=>{
 const path=manifest[exercises[ex.id].key];if(typeof path!=='string'||!/^\/api\/gifs\/[a-zA-Z0-9/_-]+\.(gif|webp|png)$/.test(path))return;
 const host=$(`[data-exercise-image="${ex.id}"]`);if(!host)return;
 const image=new Image();image.alt=t(ex.id);image.onload=()=>{host.classList.remove('has-workout-poster');host.replaceChildren(image);host.dataset.loadedMedia=path};image.src=path;
 });
}

function currentInputs(){return{exercise:$('#exercise').value,weight:$('#weight').value,reps:$('#reps').value,bodyweight:$('#bodyweight').value,sex:$('#sex').value,unit};}
function renderResult(result){
 $('#calc-result').removeAttribute('data-rank-id');
 $('#calc-result').innerHTML=`<div class="result-main"><div><span class="result-label">${t('draftStatus')}</span><strong class="result-rank">${t('noOfficialRank')}</strong></div></div><div class="result-stats"><span>${t('estimatedMax')} <strong>${number(result.oneRM,1)} ${result.unit}</strong></span></div><p class="draft-calc-note">${t('practiceOnly')}</p><a class="text-link" href="/strength/">MONTE WO Strength Index™ ↗</a>`;
}
function runCalculator(save=true){
 try{lastResult=calculate(currentInputs());renderResult(lastResult);if(save)storage.set('mw-calculator',JSON.stringify(currentInputs()));}
 catch{showToast(t('inputError'));}
}
$('#calculator-form').addEventListener('submit',e=>{e.preventDefault();if($('#calculator-form').reportValidity())runCalculator();});
function setUnit(next,convert=true,recompute=true){
 if(next===unit)return;
 if(convert){const factor=next==='lb'?2.20462262185:.45359237;['weight','bodyweight'].forEach(id=>{const input=$('#'+id);if(input.value!=='') input.value=(+input.value*factor).toFixed(2);});}
 unit=next;
 $$('[data-unit]').forEach(b=>{const active=b.dataset.unit===unit;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 $$('.unit-label').forEach(el=>el.textContent=unit);
 $('#weight').min=unit==='kg'?1:2.205;$('#weight').max=unit==='kg'?600:1322.77;
 $('#bodyweight').min=unit==='kg'?30:66.14;$('#bodyweight').max=unit==='kg'?300:661.39;
 if(recompute&&$('#calculator-form').checkValidity())runCalculator();
}
$$('[data-unit]').forEach(b=>b.addEventListener('click',()=>setUnit(b.dataset.unit)));
try{
 const saved=JSON.parse(storage.get('mw-calculator'));
 if(saved){calculate(saved); unit=saved.unit==='lb'?'kg':'lb';setUnit(saved.unit,false,false);['exercise','weight','reps','bodyweight','sex'].forEach(id=>$('#'+id).value=saved[id]);}
}catch{}

function methodContent(){return `<h2>MONTE WO Strength Index™</h2><p>${t('draftStatus')}</p><p>${t('practiceOnly')}</p><p>Barbell Squat · Barbell Bench Press · Barbell Deadlift · Strict Biceps Curl</p><p>This is not a validated ranking model. No official rank or progress percentage is calculated from the educational estimate. The original 1–1000 demo has been retired.</p><a class="text-link" href="/methodology/">MONTE Standard & methodology ↗</a>`;}
function openDialog(html){$('#dialog-content').innerHTML=html;const heading=$('#dialog-content h2');if(heading){heading.id='dialog-title';$('#info-dialog').setAttribute('aria-labelledby','dialog-title')}$('#info-dialog').showModal();$('#info-dialog').scrollTop=0;}
$$('[data-methodology]').forEach(b=>b.addEventListener('click',()=>openDialog(methodContent())));
$('#close-dialog').addEventListener('click',()=>$('#info-dialog').close());
$('#info-dialog').addEventListener('click',e=>{const rect=$('#info-dialog').getBoundingClientRect();if(e.target===$('#info-dialog')&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom))$('#info-dialog').close();});
$('#privacy-button').addEventListener('click',()=>{openDialog(`<h2>${t('privacyTitle')}</h2><p>${t('privacyBody')}</p><p><a class="text-link" href="/privacy/">${t('privacyPolicy')} ↗</a> · <a class="text-link" href="/delete-account/">${t('deleteAccount')} ↗</a></p><p><button class="button" id="clear-preferences">${t('clearData')}</button></p>`);$('#clear-preferences').addEventListener('click',()=>{storage.remove('mw-calculator');storage.remove('mw-language');$('#calculator-form').reset();setUnit('kg',false,false);runCalculator(false);showToast(t('cleared'))})});
$('#exercise-grid').addEventListener('click',e=>{const b=e.target.closest('[data-guide]');if(!b)return;e.preventDefault();const ex=exerciseList.find(ex=>ex.id===b.dataset.guide);openDialog(`<span class="eyebrow">${t('guideTitle')}</span><h2>${t(ex.id)}</h2><p>${t(ex.muscle)}</p><div class="exercise-image has-workout-poster poster-preview" style="border-radius:8px;margin:20px 0">${$(`[data-exercise-image="${ex.id}"]`).dataset.loadedMedia ? `<img src="${esc($(`[data-exercise-image="${ex.id}"]`).dataset.loadedMedia)}" alt="${esc(t(ex.id))}">` : posterImage(ex)}</div>${$(`[data-exercise-image="${ex.id}"]`).dataset.loadedMedia ? '' : `<p>${t('posterNotice')}</p>`}<h3>${t('howWorks')}</h3><p>${t(ex.guide)}</p><p>${t('guideFooter')}</p><p><button class="button" id="use-exercise">${t('findRank')} ↗</button></p>`);$('#use-exercise').addEventListener('click',()=>{$('#exercise').value=ex.id;$('#info-dialog').close();$('#calculator').scrollIntoView({behavior:'smooth'});$('#exercise').focus({preventScroll:true});runCalculator()})});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
$('#install-button').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else openDialog(`<h2>${t('installTitle')}</h2><p>${t('installBody')}</p>`)});
function showToast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(window.mwToast);window.mwToast=setTimeout(()=>$('#toast').classList.remove('show'),4000)}
function updateConnection(){const online=navigator.onLine;$('#connection-text').textContent=t(online?'online':'offline');$('.connection-status').classList.toggle('offline',!online)}
window.addEventListener('online',()=>{updateConnection();showToast(t('onlineToast'))});
window.addEventListener('offline',()=>{updateConnection();showToast(t('offlineToast'))});
function setLanguage(next){
 lang=next;document.documentElement.lang=lang;$('#language').value=lang;
 $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 storage.set('mw-language',lang);renderRanks();applyRankVisuals();renderExercises();loadMedia();updateConnection();if(lastResult)renderResult(lastResult);
}
$('#language').addEventListener('change',e=>setLanguage(e.target.value));
setLanguage(lang);runCalculator(false);
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{/* Private/embedded browsers may not allow installation. */})})}
