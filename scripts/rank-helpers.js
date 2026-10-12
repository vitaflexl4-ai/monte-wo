
export function rankForScore(){throw new RangeError('The unvalidated 1–1000 demo is retired. Discipline-specific approved standards are required.')}
export function rankBadge(rankOrIndex) {
 const rank=typeof rankOrIndex==='number'?ranks[rankOrIndex]:typeof rankOrIndex==='string'?ranks.find(r=>r.id===rankOrIndex):rankOrIndex;
 if(!rank||!ranks.some(r=>r.id===rank.id))throw new RangeError('Unknown Monte Wo rank.');
 return `<img class="rank-emblem" data-rank-id="${rank.id}" src="${rank.icon}" alt="${rank.name} rank emblem" width="288" height="288" decoding="async">`;
}
export function applyRankVisuals(root=document) {
 root.querySelectorAll('[data-rank-score]').forEach(element=>{
  delete element.dataset.rankId;element.dataset.rankScore='draft';element.style.setProperty('--rank-color','#7895b1');
  element.querySelectorAll('[data-rank-logo]').forEach(el=>el.innerHTML='<span class="draft-rank-mark" aria-label="No rank awarded">—</span>');
  element.querySelectorAll('[data-rank-name]').forEach(el=>el.textContent='DRAFT');
  element.querySelectorAll('[data-rank-score-value],[data-rank-next-name],[data-rank-remaining],[data-rank-floor],[data-rank-ceiling]').forEach(el=>el.textContent='—');
  element.querySelectorAll('[data-rank-progress]').forEach(el=>{el.style.width='0%';el.hidden=true});
 });
}
