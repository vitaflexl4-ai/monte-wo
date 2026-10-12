import {oneRepMax,plateLoad,protein,energy,macros,bodyFat,PLATES,ACTIVITY,KG_PER_LB} from './tool-math.js';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const tool=document.body.dataset.tool;
const form=$('#free-tool-form');
const result=$('#tool-result');
let mode='metric',example=true,summary='';
const fmt=(n,d=0)=>new Intl.NumberFormat('en',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
const mass=()=>mode==='metric'?'kg':'lb';
const length=()=>mode==='metric'?'cm':'in';
const val=name=>form.elements.namedItem(name)?.value;
const colors=['#ee6575','#5aadff','#e4c269','#79c9b1','#c2cee2','#bb94e6','#90b5d7','#6e829d'];
function head(kicker,value,unit,description){return `<div class="tool-result-top"><span>${example?'EXAMPLE INPUTS':'ESTIMATED RESULT'}</span><span class="result-live-dot"></span></div><span class="result-kicker">${kicker}</span><h2 class="tool-big-number">${value}<small>${unit}</small></h2><p class="result-description">${description}</p>`}
function foot(){return '<div class="tool-result-footer"><span>ON YOUR DEVICE</span><button id="copy-result" type="button">Copy result ⧉</button></div><p id="copy-status" class="copy-status" role="status"></p>'}
function stat(label,value){return `<div class="result-stat"><span>${label}</span><strong>${value}</strong></div>`}
function inventory(){return $$('[data-plate]').map(el=>({weight:Number(el.dataset.plate),pairs:Number(el.value)}))}
function renderInventory(){if(tool!=='plates')return;$('#plate-inventory').innerHTML=PLATES[mass()].map((weight,i)=>`<label class="inventory-item"><span class="plate-size"><i style="--plate-color:${colors[i]}"></i>${weight} <small>${mass()}</small></span><input type="number" inputmode="numeric" min="0" max="8" step="1" value="${weight<=.5?0:weight===20||weight===45?4:2}" data-plate="${weight}" aria-label="Available pairs of ${weight} ${mass()} plates" required></label>`).join('')}
function referenceFields(){if(tool==='body-fat'){const female=val('sex')==='female';$('#hip-field').hidden=!female;$('#hip').disabled=!female;$('label[for="waist"]').textContent=female?'Waist at narrowest point':'Abdomen at navel';}}
function plateDiagram(data){let all=[];for(const plate of data.plates)for(let i=0;i<plate.count;i++)all.push(plate.weight);const shown=all.slice(0,8);const render=(items)=>items.map(w=>{const i=PLATES[mass()].indexOf(w);return `<span class="diagram-plate" style="--plate-height:${42+w/PLATES[mass()][0]*50}px;--plate-color:${colors[i]}" title="${w} ${mass()}"></span>`}).join('');return `<div class="barbell-diagram" role="img" aria-label="Balanced barbell, ${fmt(data.actual,2)} ${mass()} total; full plate list below"><div class="diagram-shaft"></div><div class="diagram-side left">${render([...shown].reverse())}</div><div class="diagram-grip"></div><div class="diagram-side right">${render(shown)}</div></div>${all.length>8?'<p class="result-small">Diagram shows the first 8 plates per side; all plates are listed below.</p>':''}`}
function calculate(){
 $('#tool-error').textContent='';let output;
 try{
  if(tool==='one-rep-max'){
   const r=oneRepMax({weight:val('weight'),reps:val('reps'),unit:mass()});
   output=head('ESTIMATED ONE-REP MAX',fmt(r.estimate,1),mass(),`${fmt(Number(val('weight')),2)} ${mass()} × ${val('reps')} repetitions. ${Number(val('reps'))===1?'One rep uses the entered load directly.':'Calculated using the Epley formula.'}`)+`<div class="result-callout">${r.highReps?'Higher-rep estimate: over 10 reps, this number may be less reliable.':'An estimate—not a promise that this load is safe to attempt.'}</div><h3 class="result-section-title">Reference loads</h3><div class="percentage-table">${r.percentages.map(p=>`<div><span>${p.percent}%</span><i style="--bar-width:${p.percent}%"></i><strong>${fmt(p.load,1)} ${mass()}</strong></div>`).join('')}</div><p class="result-small">These percentages are not a training prescription.</p><a href="/#calculator" class="result-link">Try the separate demo rank calculator ↗</a>`;
   summary=`Monte Wo · Epley estimated 1RM: ${fmt(r.estimate,1)} ${mass()} from ${val('weight')} ${mass()} × ${val('reps')} reps. Estimate only.`;
  }else if(tool==='plates'){
   const r=plateLoad({target:val('target'),bar:val('bar'),collars:val('collars'),unit:mass(),inventory:inventory()});
   output=head(r.exact?'EXACT BALANCED LOAD':'CLOSEST LOAD AT OR BELOW TARGET',fmt(r.actual,2),mass(),r.exact?'Your selected plate inventory can make this load.':`${fmt(r.difference,2)} ${mass()} below your ${fmt(r.target,2)} ${mass()} target. No exact match with the selected inventory.`)+plateDiagram(r)+`<h3 class="result-section-title">Load this on <em>each</em> side</h3><div class="plate-recipe">${r.plates.length?r.plates.map(p=>`<div><span>${p.weight} ${mass()} plate</span><strong>× ${p.count}</strong></div>`).join(''):'<p>No plates. Bar and selected collars only.</p>'}</div><div class="result-stat-grid">${stat('Per side',fmt(r.perSide,2)+' '+mass())}${stat('Total plates',r.plateCount)}${stat('Bar',fmt(r.bar,2)+' '+mass())}${stat('Both collars',fmt(r.collars,2)+' '+mass())}</div><p class="result-small">Check sleeve space and bar capacity. The calculation does not verify your equipment.</p>`;
   summary=`Monte Wo · Total ${fmt(r.actual,2)} ${mass()}. Bar ${r.bar} ${mass()}, combined collars ${r.collars} ${mass()}. Each side: ${r.plates.map(p=>`${p.count} × ${p.weight} ${mass()}`).join(' + ')||'no plates'}. ${r.exact?'Exact load.':`Below target by ${fmt(r.difference,2)} ${mass()}.`}`;
  }else if(tool==='protein'){
   const r=protein({weight:val('weight'),unit:mass(),multiplier:val('multiplier'),meals:val('meals')});
   output=head('DAILY PROTEIN ESTIMATE',fmt(r.grams), 'g / day',`${fmt(r.kg,1)} kg × ${r.rate} g/kg. A general planning estimate for active adults.`)+`<div class="protein-range"><span>REFERENCE RANGE · 1.4–2.0 g/kg</span><strong>${fmt(r.low)}–${fmt(r.high)} <small>g / day</small></strong><div><i style="left:${(r.rate-1.4)/.6*100}%"></i></div><small>Not an individualized prescription.</small></div><div class="result-stat-grid">${stat('Per portion',fmt(r.perMeal,1)+' g')}${stat('Portions / day',r.meals)}</div><p class="result-small">The portion number is an even division of the total, not a required eating schedule or supplement recommendation.</p>`;
   summary=`Monte Wo · Protein estimate: ${fmt(r.grams)} g/day at ${r.rate} g/kg. Reference range ${fmt(r.low)}–${fmt(r.high)} g/day. Across ${r.meals} portions: ${fmt(r.perMeal,1)} g each. General adult estimate.`;
  }else if(tool==='tdee'){
   const r=energy({weight:val('weight'),unit:mass(),height:val('height'),heightUnit:length(),age:val('age'),sex:val('sex'),activity:val('activity')});
   output=head('ESTIMATED DAILY ENERGY',fmt(r.tdee),'kcal / day','An estimated maintenance energy expenditure—not a measured intake requirement.')+`<div class="result-stat-grid">${stat('Resting energy (REE)',fmt(r.ree)+' kcal')}${stat('Activity multiplier',r.factor+'×')}</div><h3 class="result-section-title">Activity changes the estimate</h3><div class="activity-table">${Object.entries(ACTIVITY).map(([key,factor])=>`<div class="${key===val('activity')?'chosen':''}"><span>${({sedentary:'Mostly seated',light:'Light',moderate:'Moderate',very:'Very active',extra:'Extremely active'})[key]}</span><strong>${fmt(r.ree*factor)} <small>kcal</small></strong></div>`).join('')}</div><p class="result-small">Activity factors are broad assumptions. Your actual energy needs can differ.</p><a href="/tools/macros/" class="result-link">Open the macro calculator ↗</a>`;
   summary=`Monte Wo · Estimated TDEE: ${fmt(r.tdee)} kcal/day. Mifflin–St Jeor REE: ${fmt(r.ree)} kcal/day; activity factor ${r.factor}. General adult estimate, not a prescribed intake.`;
  }else if(tool==='macros'){
   const r=macros({weight:val('weight'),unit:mass(),calories:val('calories'),proteinMultiplier:val('proteinMultiplier'),fatPercent:val('fatPercent')});
   output=`<div class="tool-result-top"><span>${example?'EXAMPLE INPUTS':'CALCULATED SPLIT'}</span><span class="result-live-dot"></span></div><span class="result-kicker">YOUR SELECTED ENERGY</span><div class="macro-ring" style="--protein-end:${r.proteinPercent}%;--fat-end:${r.proteinPercent+r.fatPercent}%"><div><strong>${fmt(r.calories)}</strong><span>kcal / day</span></div></div><div class="macro-legend"><div><i style="background:#5aadff"></i><span>Protein<small>${fmt(r.proteinPercent,1)}% of calories</small></span><strong>${fmt(r.protein,1)} g</strong></div><div><i style="background:#e9ba63"></i><span>Fat<small>${fmt(r.fatPercent,1)}% of calories</small></span><strong>${fmt(r.fat,1)} g</strong></div><div><i style="background:#e57889"></i><span>Carbohydrates<small>${fmt(r.carbPercent,1)}% of calories</small></span><strong>${fmt(r.carbs,1)} g</strong></div></div><p class="result-small">Rounded gram values may not sum back to the exact calorie input. This is a planning split, not a prescription or deficit recommendation.</p>`;
   summary=`Monte Wo · ${fmt(r.calories)} kcal macro split: protein ${fmt(r.protein,1)} g; fat ${fmt(r.fat,1)} g; carbs ${fmt(r.carbs,1)} g. General adult estimate; displayed grams are rounded.`;
  }else if(tool==='body-fat'){
   const r=bodyFat({sex:val('sex'),unit:length(),height:val('height'),neck:val('neck'),waist:val('waist'),hip:val('hip')});
   output=head('CIRCUMFERENCE-BASED ESTIMATE',fmt(r.percent,1),'%', 'A rough body-fat estimate using the selected Navy-style reference formula.')+`<div class="bodyfat-result-graphic" aria-hidden="true"><span>◎</span><i></i><span>≈</span></div><div class="result-callout">Not a diagnosis, a fitness rank, or a body-composition target.</div><h3 class="result-section-title">Read the number with care</h3><ul class="result-advice"><li>Measurement placement and tape tension matter.</li><li>The equation may not fit your body or training history.</li><li>No “good” or “bad” category is assigned here.</li></ul><p class="result-small">If a clinical measurement is needed, speak with a qualified professional. It’s also okay not to track this number.</p>`;
   summary=`Monte Wo · Navy-style circumference estimate: ${fmt(r.percent,1)}% body fat. Rough adult estimate only; not a diagnosis or a goal.`;
  }
  result.innerHTML=output+foot();$('#copy-result').addEventListener('click',async()=>{try{if(!navigator.clipboard)throw new Error('unavailable');await navigator.clipboard.writeText(summary);$('#copy-status').textContent='Result copied.'}catch{$('#copy-status').textContent='Copy is unavailable here. Select the result text to copy it manually.'}});
 }catch(error){$('#tool-error').textContent=error.message||'Please check your inputs.';result.innerHTML='<div class="result-empty"><span>ⓘ</span><h2>No result yet.</h2><p>Review the message beside your inputs, then calculate again.</p></div>';summary=''}
}
function dirty(){example=false;summary='';$('#tool-error').textContent='';result.innerHTML='<div class="result-empty"><span>↻</span><h2>Inputs updated.</h2><p>Select Calculate to refresh your result.</p></div>';}
function switchMode(next,convert=true){
 if(next===mode&&convert)return;const previous=mode;mode=next;
 $$('[data-tool-unit]').forEach(b=>{const active=b.dataset.toolUnit===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 if(tool==='plates'){
  if(convert){$('#target').value=mode==='metric'?100:225;$('#bar').value=mode==='metric'?20:45;$('#collars').value=0;}
  $('#target').max=mode==='metric'?600:1500;$('#bar').max=mode==='metric'?50:110;$('#collars').max=mode==='metric'?10:25;renderInventory();
 }else{
  $$('input[data-measure]').forEach(input=>{const kind=input.dataset.measure;const imperialFactor=kind==='mass'?1/KG_PER_LB:1/2.54;const factor=mode==='imperial'?imperialFactor:1/imperialFactor;
   if(convert&&previous!==mode&&input.value!=='')input.value=Number((Number(input.value)*factor).toFixed(4));
   input.min=mode==='metric'?input.dataset.min:Math.floor(Number(input.dataset.min)*imperialFactor*10000)/10000;
   input.max=mode==='metric'?input.dataset.max:Math.ceil(Number(input.dataset.max)*imperialFactor*10000)/10000;
  });
 }
 $$('[data-unit-label]').forEach(el=>{if(el.dataset.unitLabel==='mass')el.textContent=mass();if(el.dataset.unitLabel==='length')el.textContent=length()});
 referenceFields();calculate();
}
$$('[data-tool-unit]').forEach(b=>b.addEventListener('click',()=>{example=false;switchMode(b.dataset.toolUnit)}));
form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity()){example=false;calculate()}});
form.addEventListener('input',()=>{referenceFields();dirty()});
form.addEventListener('change',()=>{referenceFields();dirty()});
$('#tool-reset').addEventListener('click',()=>{form.reset();example=true;mode='imperial';switchMode('metric',false)});
renderInventory();referenceFields();calculate();
