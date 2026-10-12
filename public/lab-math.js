// Strength Lab: pure local calculations. No ranking, nutrition, persistence or network.
import {oneRepMax,KG_PER_LB,PLATES} from './tool-math.js';
export {KG_PER_LB,PLATES};
export class LabError extends Error{constructor(code){super(code);this.code=code}}
const check=(ok,code)=>{if(!ok)throw new LabError(code)};
export function number(value,min,max,code='number'){check((typeof value==='number'||typeof value==='string')&&String(value).trim()!==''&&Number.isFinite(Number(value)),code);const n=Number(value);check(n>=min&&n<=max,code);return n}
const integer=(v,min,max,code)=>{const n=number(v,min,max,code);check(Number.isInteger(n),code);return n};
function unit(u){check(u==='kg'||u==='lb','unit');return u}
export function convertWeight(value,from){unit(from);const input=number(value,0,10000,'conversion');return {input,from,to:from==='kg'?'lb':'kg',value:from==='kg'?input/KG_PER_LB:input*KG_PER_LB}}
export function estimateMax({weight,reps,unit:u='kg'}){unit(u);const w=number(weight,.001,u==='kg'?1000:2204.622622,'load'),r=integer(reps,1,10,'reps');
 // Reuse the existing Epley formula where its original software range applies.
 const estimate=w*(r===1?1:1+r/30);const reused=w>=1?oneRepMax({weight:w,reps:r,unit:u}).estimate:estimate;
 return {estimate:reused,weight:w,reps:r,unit:u,kind:r===1?'single':'estimated',higherUncertainty:r>6};}
export function parsePercentages(value){const raw=Array.isArray(value)?value:typeof value==='string'?value.split(','):[];check(raw.length>0&&raw.length<=12,'percentages');const result=raw.map(x=>number(x,1,100,'percentages'));check(new Set(result).size===result.length,'duplicate-percentages');return result.sort((a,b)=>a-b)}
export function trainingLoads({max,kind,unit:u='kg',percentages,increment=0}){unit(u);const m=number(max,.001,u==='kg'?1000:2204.622622,'max');check(kind==='tested'||kind==='estimated','kind');const inc=number(increment,0,100,'increment');const mu=BigInt(decimalUnits(max,u==='kg'?1000:2204.622622,'max')),iu=BigInt(decimalUnits(increment,100,'increment'));return {max:m,kind,unit:u,increment:inc,rows:parsePercentages(percentages).map(percent=>{const pu=BigInt(decimalUnits(percent,100,'percentages')),n=mu*pu,raw=Number(n)/1e14;return{percent,raw,selected:iu===0n?raw:Number(n/(100000000n*iu)*iu)/1e6}})}}
function decimalUnits(value,max,code){const n=number(value,0,max,code);check(/^(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(String(value)),'precision');return Math.round(n*1e6)}
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function defaultInventory(u){unit(u);return PLATES[u].map(weight=>({weight,pairs:weight===20||weight===45?4:weight<=.5?0:2}))}
export function smartPlates({target,bar,collars=0,unit:u='kg',inventory,mode='below'}){
 unit(u);check(mode==='below'||mode==='nearest','mode');const limit=u==='kg'?1000:2204.622622,goal=decimalUnits(target,limit,'target'),barU=decimalUnits(bar,u==='kg'?100:220,'bar'),collarU=decimalUnits(collars,u==='kg'?20:44,'collars'),base=barU+collarU;
 check(goal>=base,'below-bar');check(Array.isArray(inventory)&&inventory.length<=12,'inventory');const seen=new Set();const stock=inventory.map(p=>{check(p&&typeof p==='object','inventory');const w=number(p.weight,.01,u==='kg'?100:220,'plate-size');check(/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(String(p.weight)),'plate-precision');const cents=Math.round(w*100);check(!seen.has(cents),'duplicate-plates');seen.add(cents);return {weight:w,cents,pairs:integer(p.pairs,0,10,'pairs')}}).sort((a,b)=>b.cents-a.cents);
 const active=stock.filter(p=>p.pairs),step=active.reduce((a,p)=>gcd(a,p.cents),0)||1,total=active.reduce((a,p)=>a+p.cents*p.pairs,0),largest=active[0]?.cents||0;
 const targetPerSideCents=(goal-base)/20000,cap=Math.floor(Math.min(total,targetPerSideCents+(mode==='nearest'?largest:0))/step),width=stock.length;
 const costs=new Int16Array(cap+1);costs.fill(32767);costs[0]=0;const counts=new Uint8Array((cap+1)*width);
 stock.forEach((p,i)=>{if(!p.pairs)return;const size=p.cents/step;for(let copy=0;copy<p.pairs;copy++)for(let sum=cap;sum>=size;sum--){const previous=sum-size;if(costs[previous]!==32767&&costs[previous]+1<costs[sum]){costs[sum]=costs[previous]+1;counts.set(counts.subarray(previous*width,(previous+1)*width),sum*width);counts[sum*width+i]++;}}});
 let best=0,bestDiff=Math.abs(goal-base);for(let sum=1;sum<=cap;sum++){if(costs[sum]===32767)continue;const actual=base+sum*step*20000;if(mode==='below'&&actual>goal)continue;const diff=Math.abs(actual-goal);if(diff<bestDiff||(diff===bestDiff&&actual<=goal&&(base+best*step*20000)>goal)){best=sum;bestDiff=diff}}
 const actualU=base+best*step*20000,plates=stock.map((p,i)=>({weight:p.weight,count:counts[best*width+i]})).filter(p=>p.count);
 return {target:goal/1e6,actual:actualU/1e6,bar:barU/1e6,collars:collarU/1e6,unit:u,mode,exact:actualU===goal,difference:(actualU-goal)/1e6,perSide:best*step/100,plateCount:costs[best]*2,plates};
}
export const WARM_PRESET=[{percent:40,reps:8,rest:45},{percent:60,reps:5,rest:60},{percent:80,reps:3,rest:90},{percent:90,reps:1,rest:120}];
export function warmupPlan({basis,reference,workPercent=75,unit:u='kg',bar,collars=0,inventory,sets=WARM_PRESET}){
 unit(u);check(basis==='working'||basis==='estimated','basis');const ref=number(reference,.001,u==='kg'?1000:2204.622622,'reference'),work=basis==='working'?ref:ref*number(workPercent,40,90,'work-percent')/100;
 const refU=decimalUnits(reference,u==='kg'?1000:2204.622622,'reference'),workU=basis==='working'?refU:Number(BigInt(refU)*BigInt(decimalUnits(workPercent,90,'work-percent'))/100000000n);
 check(Array.isArray(sets)&&sets.length>=1&&sets.length<=6,'sets');let prevPercent=0,prevReps=10;const template=sets.map(s=>{check(s&&typeof s==='object','sets');const percent=number(s.percent,1,95,'warm-percent'),reps=integer(s.reps,1,10,'warm-reps'),rest=integer(s.rest,30,300,'rest');decimalUnits(s.percent,95,'warm-percent');check(percent>prevPercent,'warm-order');check(reps<=prevReps,'warm-rep-order');check(percent<85||reps<=3,'heavy-reps');prevPercent=percent;prevReps=reps;return{percent,reps,rest}});
 const workSetup=smartPlates({target:(workU/1e6).toFixed(6),bar,collars,unit:u,inventory,mode:'below'});check(workSetup.actual>0,'reference');const baseU=Math.round(workSetup.bar*1e6)+Math.round(workSetup.collars*1e6),base=baseU/1e6,actualU=Math.round(workSetup.actual*1e6),rows=[];let last=null,merged=0,atWork=0;const warnings=[];
 for(const s of template){const product=BigInt(actualU)*BigInt(decimalUnits(s.percent,95,'warm-percent')),raw=Number(product)/1e14,goalU=Math.max(baseU,Number(product/100000000n)),setup=smartPlates({target:(goalU/1e6).toFixed(6),bar,collars,unit:u,inventory,mode:'below'});
  if(setup.actual>=workSetup.actual){atWork++;continue}if(last!==null&&setup.actual<=last){merged++;continue}
  const previous=last===null?base:last;if(setup.actual-previous>workSetup.actual*.25+1e-8)warnings.push({code:'gap',from:previous,to:setup.actual});
  rows.push({...s,raw,actual:setup.actual,baseLimited:raw<base,plates:setup.plates,perSide:setup.perSide});last=setup.actual;
 }
 if(last!==null&&workSetup.actual-last>workSetup.actual*.25+1e-8)warnings.push({code:'gap',from:last,to:workSetup.actual});
 if(!rows.length)warnings.push({code:'no-lighter'});if(base>workSetup.actual*.5)warnings.push({code:'heavy-bar'});
 return{basis,reference:ref,requestedWorking:work,working:workSetup,rows,merged,atWork,warnings,requiresReview:warnings.some(w=>w.code==='gap'||w.code==='no-lighter')};
}
