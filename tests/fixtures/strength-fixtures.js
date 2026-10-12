// SYNTHETIC SOFTWARE TESTS ONLY. Not athlete norms, calibration data or approved standards.
import {readFileSync} from 'node:fs';
export const rule=d=>JSON.parse(readFileSync(`content/strength/${d}-standard-draft-1.json`));
export function model(d='squat'){return {id:'TEST-ONLY-'+d,discipline:d,rulebookId:rule(d).id,purpose:'test',normalization:'bodyweight-lookup-v1',estimate:{formula:'epley',minReps:2,maxReps:5},requireVerifiedFrom:'titan',categories:[{sexCategory:'male',minAge:18,maxAge:100,nodes:[{bodyweightUg:'50000000000',thresholdsUg:Array.from({length:9},(_,i)=>String(BigInt(i+1)*10000000000n))},{bodyweightUg:'100000000000',thresholdsUg:Array.from({length:9},(_,i)=>String(BigInt(i+1)*20000000000n))}]}]}}
export function performance(d='squat',load='60'){const r=rule(d);return {discipline:d,load,unit:'kg',reps:1,resultType:'tested',performedOn:'2026-10-11',bodyweight:'75',sexCategory:'male',ageYears:30,variation:r.variation,equipment:r.equipment[0],checks:Object.fromEntries(r.checks.map(c=>[c.id,true]))}}
export function context(d='squat'){return {model:model(d),rule:rule(d),modelApproved:true,ruleApproved:true,testing:true,athleteId:'athlete-a'}}
