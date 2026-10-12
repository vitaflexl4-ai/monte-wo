// GENERATED from public/ranks.json by scripts/build_ranks.py. Do not edit independently.
export const ranks = [
  {
    "id": "debitan",
    "name": "Debitan",
    "color": "#c1c9d3",
    "icon": "/assets/ranks/debitan.webp",
    "ordinal": 1
  },
  {
    "id": "bati",
    "name": "Bati",
    "color": "#efa55e",
    "icon": "/assets/ranks/bati.webp",
    "ordinal": 2
  },
  {
    "id": "solid",
    "name": "Solid",
    "color": "#a0ceff",
    "icon": "/assets/ranks/solid.webp",
    "ordinal": 3
  },
  {
    "id": "fo",
    "name": "Fò",
    "color": "#4aaaff",
    "icon": "/assets/ranks/fo.webp",
    "ordinal": 4
  },
  {
    "id": "avanse",
    "name": "Avanse",
    "color": "#2bdcde",
    "icon": "/assets/ranks/avanse.webp",
    "ordinal": 5
  },
  {
    "id": "met",
    "name": "Mèt",
    "color": "#bb71fa",
    "icon": "/assets/ranks/met.webp",
    "ordinal": 6
  },
  {
    "id": "chanpyon",
    "name": "Chanpyon",
    "color": "#ffac45",
    "icon": "/assets/ranks/chanpyon.webp",
    "ordinal": 7
  },
  {
    "id": "titan",
    "name": "Titan",
    "color": "#ff4055",
    "icon": "/assets/ranks/titan.webp",
    "ordinal": 8
  },
  {
    "id": "lejand",
    "name": "Lejand",
    "color": "#f7d354",
    "icon": "/assets/ranks/lejand.webp",
    "ordinal": 9
  }
];

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
