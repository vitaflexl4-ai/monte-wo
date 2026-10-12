// Educational estimate only. The prior unvalidated score/rank demo is retired.
export {ranks} from './ranks.js';
export const exercises={bench:{key:'bench-press'},squat:{key:'back-squat'},deadlift:{key:'deadlift'},curl:{key:'strict-biceps-curl'}};
export function calculate({exercise,weight,reps,bodyweight,sex,unit='kg'}){
 if(!exercises[exercise]||!['male','female'].includes(sex)||!['kg','lb'].includes(unit))throw new Error('Invalid reference');
 const factor=unit==='lb'?.45359237:1,w=Number(weight)*factor,bw=Number(bodyweight)*factor,r=Number(reps);
 if(!Number.isFinite(w)||!Number.isFinite(bw)||w<.999||w>600.01||bw<29.99||bw>300.01||!Number.isInteger(r)||r<1||r>30)throw new Error('Invalid inputs');
 return {oneRM:(r===1?w:w*(1+r/30))/factor,unit,resultType:r===1?'tested':'estimated',status:'draft',rankId:null,score:null};
}
