// Shared workout input contract. Training records never award ranks.
export class WorkoutInputError extends Error {
  constructor(code) { super(code.replaceAll('-', ' ')); this.code = code; }
}
const check = (ok, code) => { if (!ok) throw new WorkoutInputError(code); };
function keys(obj, allowed) {
  check(obj && typeof obj === 'object' && !Array.isArray(obj), 'invalid-object');
  check(Object.keys(obj).every(key => allowed.includes(key)), 'unexpected-field');
}
export function validateSet(set) {
  keys(set, ['reps', 'load', 'unit']);
  check(Number.isInteger(set.reps) && set.reps >= 1 && set.reps <= 1000, 'invalid-reps');
  check(typeof set.load === 'string' && /^\d{1,4}(\.\d{1,3})?$/.test(set.load)
    && Number(set.load) <= 2204.622 && ['kg', 'lb'].includes(set.unit), 'invalid-load');
  return set;
}
export function validateWorkout(workout, exerciseIds, today = new Date().toISOString().slice(0, 10)) {
  keys(workout, ['id', 'title', 'performedOn', 'exercises']);
  check(typeof workout.id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(workout.id), 'invalid-id');
  check(typeof workout.title === 'string' && workout.title.trim().length > 0 && workout.title.length <= 100, 'invalid-text');
  const date = workout.performedOn;
  check(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))
    && new Date(date).toISOString().slice(0, 10) === date && date <= today && date >= '1900-01-01', 'invalid-date');
  check(Array.isArray(workout.exercises) && workout.exercises.length > 0 && workout.exercises.length <= 30, 'invalid-exercises');
  const seen = new Set();
  for (const exercise of workout.exercises) {
    keys(exercise, ['exerciseId', 'sets']);
    check(exerciseIds.has(exercise.exerciseId), 'unknown-exercise');
    check(!seen.has(exercise.exerciseId), 'duplicate-exercise');
    seen.add(exercise.exerciseId);
    check(Array.isArray(exercise.sets) && exercise.sets.length > 0 && exercise.sets.length <= 20, 'invalid-sets');
    exercise.sets.forEach(validateSet);
  }
  return workout;
}
export function workoutVolume(workout) {
  const thousandths = {kg: 0, lb: 0};
  for (const exercise of workout.exercises) for (const set of exercise.sets) {
    validateSet(set);
    const [whole, fraction = ''] = set.load.split('.');
    thousandths[set.unit] += (Number(whole) * 1000 + Number((fraction + '000').slice(0, 3))) * set.reps;
  }
  // Do not add kg to lb or silently convert units. Exact decimal accumulation.
  return {kg: thousandths.kg / 1000, lb: thousandths.lb / 1000};
}
