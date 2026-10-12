// Filtering is local only. No queries, tracking, storage, or uploads.
const root=document.querySelector('[data-library]');
if(root){
 const $=s=>root.querySelector(s),list=$('#exercise-results'),cards=[...list.querySelectorAll('[data-exercise]')];
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const fields=['#exercise-search','#filter-group','#filter-equipment','#filter-media','#library-sort'].map(s=>$(s));
 const initialGroup=$('#filter-group').value;
 function update(){
  const terms=normalize($('#exercise-search').value).split(' ').filter(Boolean),group=$('#filter-group').value,equipment=$('#filter-equipment').value,media=$('#filter-media').value;
  let count=0;
  cards.sort((a,b)=>a.dataset.name.localeCompare(b.dataset.name)*($('#library-sort').value==='za'?-1:1)).forEach(card=>{
   card.hidden=!(terms.every(t=>normalize(card.dataset.search).includes(t))&&(!group||group===card.dataset.group)&&(!equipment||equipment===card.dataset.equipment)&&(!media||media===card.dataset.media));
   if(!card.hidden)count++;list.append(card);
  });
  $('#library-results').textContent=`${count} of ${cards.length} exercise${cards.length===1?'':'s'}`;
  $('#library-empty').hidden=count!==0;
 }
 function reset(){fields.forEach(field=>field.value='');$('#filter-group').value=initialGroup;$('#library-sort').value='az';update();$('#exercise-search').focus();}
 fields.forEach(field=>field.addEventListener(field.type==='search'?'input':'change',update));
 $('#library-reset').addEventListener('click',reset);$('[data-reset-filters]').addEventListener('click',reset);
 $('.library-filters').hidden=false;update();
}
// Supplied assets can fail without leaving a misleading blank player.
document.querySelectorAll('.guide-media img,.guide-media video').forEach(media=>media.addEventListener('error',()=>{const message=document.createElement('p');message.className='media-unavailable';message.textContent='This demonstration is unavailable right now. The written guide below is still available.';media.replaceWith(message)}));
