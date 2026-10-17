// Session-only bookkeeping. Never a performance verification or ranking engine.
export function makeSet(exercise, weightInput, repsInput, timestamp = Date.now()) {
  if (!exercise?.id || !exercise?.name) throw Error('Choose an exercise.');
  if (String(weightInput).trim()==='' || String(repsInput).trim()==='') throw Error('Enter weight and reps.');
  const weight=Number(weightInput),reps=Number(repsInput);
  if(!Number.isFinite(weight)||weight<0||weight>3000)throw Error('Weight must be between 0 and 3,000 lbs.');
  if(!Number.isInteger(reps)||reps<1||reps>500)throw Error('Reps must be a whole number between 1 and 500.');
  if(Math.abs(weight*100-Math.round(weight*100))>0.00001)throw Error('Use at most two decimal places for weight.');
  return {exerciseId:exercise.id,name:exercise.name,weight,reps,volume:Math.round(weight*100)*reps/100,timestamp};
}
export function sessionVolume(sets){return sets.reduce((sum,row)=>sum+Math.round(row.volume*100),0)/100;}
