// Deterministic fixed-point eligibility. This module contains NO official thresholds.
export const RANK_IDS=['debitan','bati','solid','fo','avanse','met','chanpyon','titan','lejand'];
export const DISCIPLINES=['squat','bench','deadlift','curl'];
export class StrengthError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status}}
export const requireThat=(ok,code,status=400)=>{if(!ok)throw new StrengthError(code,status)};
export function exactKeys(obj,keys){requireThat(obj&&typeof obj==='object'&&!Array.isArray(obj),'invalid-object');requireThat(Object.keys(obj).every(k=>keys.includes(k)),'unexpected-field')}
export function text(s,max=500){requireThat(typeof s==='string'&&s.trim().length>0&&s.length<=max,'invalid-text');return s.trim()}
// Integer micrograms; decimal inputs at most three places. kg and lb converted exactly.
export function mass(value,unit){requireThat(['kg','lb'].includes(unit),'invalid-unit');requireThat(typeof value==='string'&&/^\d{1,4}(\.\d{1,3})?$/.test(value),'decimal-string-required');const [a,b='']=value.split('.');const thousandths=BigInt(a)*1000n+BigInt((b+'000').slice(0,3));return thousandths*(unit==='kg'?1000000n:45359237n)/(unit==='kg'?1n:100n)}
const rationalMass=(value,unit)=>{const [a,b='']=value.split('.');const t=BigInt(a)*1000n+BigInt((b+'000').slice(0,3));return unit==='kg'?{n:t*1000000n,d:1n}:{n:t*45359237n,d:100n}};
export function validateProfile(p){exactKeys(p,['bodyweight','unit','sexCategory','ageYears']);const bw=mass(p.bodyweight,p.unit);requireThat(bw>=30000000000n&&bw<=350000000000n,'bodyweight-outside-software-support');requireThat(['female','male','unclassified'].includes(p.sexCategory),'invalid-category');requireThat(Number.isInteger(p.ageYears)&&p.ageYears>=18&&p.ageYears<=100,'adult-age-outside-software-support');return {...p}}
export function validatePerformance(p,rule,today){
 exactKeys(p,['discipline','load','unit','reps','resultType','performedOn','bodyweight','bodyweightUnit','sexCategory','ageYears','variation','equipment','checks','correctionOf']);
 requireThat(DISCIPLINES.includes(p.discipline)&&p.discipline===rule.discipline,'invalid-discipline');const load=mass(p.load,p.unit);requireThat(load>0n&&load<=1000000000000n,'invalid-load');validateProfile({bodyweight:p.bodyweight,unit:p.bodyweightUnit||p.unit,sexCategory:p.sexCategory,ageYears:p.ageYears});
 requireThat(Number.isInteger(p.reps)&&p.reps>=1&&p.reps<=10,'invalid-repetitions');requireThat(['tested','estimated'].includes(p.resultType),'invalid-result-type');requireThat(p.resultType==='tested'?p.reps===1:p.reps>=2,'result-type-repetition-mismatch');
 requireThat(typeof p.performedOn==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.performedOn)&&!isNaN(Date.parse(p.performedOn))&&new Date(p.performedOn).toISOString().slice(0,10)===p.performedOn&&p.performedOn<=today&&p.performedOn>='1900-01-01','invalid-date');
 requireThat(p.variation===rule.variation&&rule.equipment.includes(p.equipment),'unsupported-variation-or-equipment');exactKeys(p.checks,rule.checks.map(c=>c.id));requireThat(rule.checks.every(c=>p.checks[c.id]===true),'monte-standard-not-attested');if(p.correctionOf!==undefined)text(p.correctionOf,80);return {...p};
}
export function validateModel(m,{complete=false}={}){
 requireThat(DISCIPLINES.includes(m.discipline)&&m.normalization==='bodyweight-lookup-v1','unsupported-model');requireThat(Array.isArray(m.categories)&&m.categories.length<=100,'invalid-categories');requireThat(m.estimate===null||(m.estimate?.formula==='epley'&&Number.isInteger(m.estimate.minReps)&&Number.isInteger(m.estimate.maxReps)&&m.estimate.minReps>=2&&m.estimate.maxReps<=10&&m.estimate.minReps<=m.estimate.maxReps),'unsupported-estimator');requireThat(RANK_IDS.includes(m.requireVerifiedFrom),'invalid-verification-floor');
 for(const [i,c] of m.categories.entries()){
  requireThat(['female','male','unclassified'].includes(c.sexCategory)&&Number.isInteger(c.minAge)&&Number.isInteger(c.maxAge)&&c.minAge>=18&&c.maxAge<=100&&c.minAge<=c.maxAge,'invalid-category');
  requireThat(!m.categories.slice(0,i).some(o=>o.sexCategory===c.sexCategory&&c.minAge<=o.maxAge&&o.minAge<=c.maxAge),'overlapping-categories');requireThat(Array.isArray(c.nodes)&&c.nodes.length>=2&&c.nodes.length<=100,'invalid-nodes');
  let prev=0n;
  for(const node of c.nodes){requireThat(/^\d+$/.test(node.bodyweightUg),'invalid-node-mass');const bw=BigInt(node.bodyweightUg);requireThat(bw>prev&&bw>=30000000000n&&bw<=350000000000n,'unordered-bodyweight-nodes');prev=bw;requireThat(Array.isArray(node.thresholdsUg)&&node.thresholdsUg.length===9,'nine-thresholds-required');let last=0n;for(const t of node.thresholdsUg){requireThat(typeof t==='string'&&/^\d+$/.test(t),'invalid-threshold');const v=BigInt(t);requireThat(v>last&&v<=1000000000000n,'unordered-rank-thresholds');last=v;}}
 }
 if(complete){requireThat(m.categories.length>0,'uncalibrated-model');for(const key of ['dataset','license','calibrationReport','holdoutReport','biasReport','rankMeaningReport','population','limitations'])text(m.evidence?.[key],4000);requireThat(m.purpose==='production','test-fixtures-cannot-publish');}
 return m;
}
const compare=(a,b)=>a.n*b.d>=b.n*a.d;
const subtract=(a,b)=>({n:a.n*b.d-b.n*a.d,d:a.d*b.d});
function thresholds(m,p){const c=m.categories.find(c=>c.sexCategory===p.sexCategory&&p.ageYears>=c.minAge&&p.ageYears<=c.maxAge);if(!c)return null;const bw=rationalMass(p.bodyweight,p.bodyweightUnit||p.unit);let pair;for(let i=1;i<c.nodes.length;i++){if(compare(bw,{n:BigInt(c.nodes[i-1].bodyweightUg),d:1n})&&compare({n:BigInt(c.nodes[i].bodyweightUg),d:1n},bw)){pair=[c.nodes[i-1],c.nodes[i]];break;}}if(!pair)return null;const [a,b]=pair,lo=BigInt(a.bodyweightUg),span=BigInt(b.bodyweightUg)-lo;return a.thresholdsUg.map((v,i)=>({n:BigInt(v)*span*bw.d+(BigInt(b.thresholdsUg[i])-BigInt(v))*(bw.n-lo*bw.d),d:span*bw.d}));}
export function evaluate(p,{model,rule,modelApproved=false,ruleApproved=false,review=null,athleteId=null,rulebookId=rule.id,testing=false}){
 const out={discipline:p.discipline,modelId:model.id,rulebookId:rule.id,rankId:null,eligibleRankId:null,status:'draft',progress:null,next:null,resultType:p.resultType,explanation:'DRAFT — NOT OFFICIAL. No approved standards are available.',calculation:null};
 validatePerformance(p,rule,p.performedOn);validateModel(model);
 if(!modelApproved||!ruleApproved||(model.purpose!=='production'&&!testing))return out;
 requireThat(model.discipline===p.discipline&&model.rulebookId===rule.id,'model-rulebook-mismatch');
 if(rulebookId!==rule.id)return {...out,status:'ineligible',explanation:'A new MONTE Standard applies. A submission under that rulebook is required.'};
 if(review&&['rejected','flagged'].includes(review.state))return {...out,status:'ineligible',explanation:'Evidence is '+review.state+'. This performance cannot qualify until resolved.'};
 let result=rationalMass(p.load,p.unit);
 if(p.resultType==='estimated'){if(!model.estimate||p.reps<model.estimate.minReps||p.reps>model.estimate.maxReps)return {...out,status:'ineligible',explanation:'This methodology does not approve an estimate for this exercise and repetition count.'};result={n:result.n*BigInt(30+p.reps),d:result.d*30n};}
 out.calculation={numeratorUg:result.n.toString(),denominator:result.d.toString()};const levels=thresholds(model,p);
 if(!levels)return {...out,status:'ineligible',explanation:'No approved standard covers this category and bodyweight. No extrapolation is performed.'};
 let index=-1;levels.forEach((t,i)=>{if(compare(result,t))index=i});out.eligibleRankId=index>=0?RANK_IDS[index]:null;
 const verified=review?.state==='approved'&&review.rulebookId===rule.id&&review.evidenceId&&review.reviewerId&&review.reviewerId!==athleteId;
 const verificationFloor=RANK_IDS.indexOf(model.requireVerifiedFrom),requires=index>=verificationFloor;
 const awarded=requires&&!verified?verificationFloor-1:index;out.verificationRequired=requires&&!verified;
 if(index<0){out.status='unranked';out.explanation='The first qualifying standard has not been met. Debitan is earned, not automatic.';}
 else if(awarded<0){out.status='verification-required';out.explanation='The qualifying standard requires evidence review. No rank is awarded yet.';}
 else{out.rankId=RANK_IDS[awarded];out.status=verified?'verified':'provisional';out.explanation=verified?'MONTE Verified: reviewed evidence meets this discipline’s approved standard.':(out.verificationRequired?'Self-reported performance earns the highest tier permitted without review. The higher reported eligibility requires verification.':'Self-reported performance meets this discipline’s approved standard. Not independently verified.');}
 if(awarded<8){const next=levels[awarded+1];out.next={rankId:RANK_IDS[awarded+1],requiredUgNumerator:next.n.toString(),requiredUgDenominator:next.d.toString(),resultType:p.resultType};const floor=awarded<0?{n:0n,d:1n}:levels[awarded];const earned=subtract(result,floor),width=subtract(next,floor);out.progress=Math.max(0,Math.min(100,Number(earned.n*width.d*100n/(earned.d*width.n))));}
 return out;
}
export function bestDiscipline(results,discipline,status){return results.filter(x=>x.discipline===discipline&&x.status===status&&x.rankId).sort((a,b)=>RANK_IDS.indexOf(b.rankId)-RANK_IDS.indexOf(a.rankId))[0]||null}
