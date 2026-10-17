import {validateWorkout} from './workouts.js';
// Explicit copy only. Never truncate sets, invent IDs, or import browse-only movements.
export function sessionToWorkout(rows, {id, title, performedOn}, exerciseIds, today) {
  if (!Array.isArray(rows) || !rows.length) throw Error('Log at least one set before preparing an account save.');
  const unsupported = [...new Set(rows.filter(row => !exerciseIds.has(row.exerciseId)).map(row => row.name || row.exerciseId))];
  if (unsupported.length) throw Error('Account saving does not support these browse-only exercises yet: ' + unsupported.join(', ') + '. Nothing was removed or uploaded.');
  const exercises = [];
  for (const row of rows) {
    if (!Number.isFinite(row.weight) || row.weight < 0 || row.weight > 2204.622)
      throw Error('Account loads must be between 0 and 2,204.622 lb. The local logger is unchanged; nothing was uploaded.');
    let exercise = exercises.find(item => item.exerciseId === row.exerciseId);
    if (!exercise) { exercise = {exerciseId: row.exerciseId, sets: []}; exercises.push(exercise); }
    exercise.sets.push({reps: row.reps, load: String(row.weight), unit: 'lb'});
  }
  if (exercises.length > 30 || exercises.some(exercise => exercise.sets.length > 20))
    throw Error('An account workout allows at most 30 exercises and 20 sets per exercise. Nothing was truncated or uploaded.');
  return validateWorkout({id, title: title.trim(), performedOn, exercises}, exerciseIds, today);
}
export function savedWorkoutAcknowledged(receipt, id) {
  return !!receipt && receipt.id === id && (receipt.alreadySaved === undefined || receipt.alreadySaved === true);
}
export class WorkoutTransferError extends Error {
  constructor(code) {
    super(code === 'account-session-changed'
      ? 'The account session changed. Check the original account history before retrying.'
      : 'The server did not confirm this workout ID. Keep this workout and check account history before retrying.');
    this.code = code;
  }
}
// Both clients use explicit, session-bound copies. A caller must not clear its
// local source until this function returns a matching server acknowledgment.
export async function saveWorkoutCopy(workout, exerciseIds, send, isSessionCurrent) {
  const snapshot = JSON.parse(JSON.stringify(workout));
  validateWorkout(snapshot, exerciseIds);
  if (!isSessionCurrent()) throw new WorkoutTransferError('account-session-changed');
  const receipt = await send(snapshot);
  if (!isSessionCurrent()) throw new WorkoutTransferError('account-session-changed');
  if (!savedWorkoutAcknowledged(receipt, snapshot.id)) throw new WorkoutTransferError('save-not-confirmed');
  return receipt;
}
