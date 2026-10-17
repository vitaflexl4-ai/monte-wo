import {validateWorkout} from './workouts.js';
const MAX_RECORDS = 500, MAX_CHARS = 1000000;
const clone = value => JSON.parse(JSON.stringify(value));
// One store instance per app; browser adapter additionally locks across tabs.
export function createWorkoutArchive(driver, exerciseIds, today) {
  let queue = Promise.resolve();
  const validate = workout => validateWorkout(workout, exerciseIds, today());
  async function read() {
    const raw = await Promise.all([driver.read(0), driver.read(1)]);
    const states = raw.map((text, slot) => {
      if (text === null) return null;
      try {
        if (text.length > MAX_CHARS) throw Error('oversized');
        const state = JSON.parse(text);
        if (state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 1
          || !Array.isArray(state.workouts) || state.workouts.length > MAX_RECORDS) throw Error('invalid');
        const ids = new Set();
        for (const workout of state.workouts) {
          validateWorkout(workout, exerciseIds, "9999-12-31");
          if (ids.has(workout.id)) throw Error('duplicate');
          ids.add(workout.id);
        }
        return {...state, slot};
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => b.revision - a.revision);
    if (!states.length && raw.some(text => text !== null))
      throw Error('Saved workout data cannot be read. It has not been overwritten. Keep this app installed and recover your backup.');
    const state = states[0] || {version: 1, revision: 0, workouts: [], slot: 1};
    state.warning = raw.some((text, slot) => text !== null && !states.some(s => s.slot === slot))
      ? 'Recovered the last readable history copy. The most recent change may be missing.' : '';
    return state;
  }
  function exclusive(fn) {
    const next = queue.then(() => driver.exclusive ? driver.exclusive(fn) : fn());
    queue = next.catch(() => {});
    return next;
  }
  const result = state => ({workouts: clone(state.workouts), warning: state.warning || ''});
  async function commit(state, workouts, mirror = false) {
    if (workouts.length > MAX_RECORDS) throw Error('Device history is full (500 workouts). Delete an older workout before saving.');
    if (!Number.isSafeInteger(state.revision + 1)) throw Error('History revision limit reached. No data changed.');
    const text = JSON.stringify({version: 1, revision: state.revision + 1, workouts});
    if (text.length > MAX_CHARS) throw Error('Device history storage limit reached. No existing workouts were removed.');
    const target = 1 - state.slot;
    await driver.write(target, text);
    if (await driver.read(target) !== text) throw Error('Could not verify the saved workout. Keep this session open and retry.');
    if (mirror) {
      // A confirmed delete must also remove the workout from the recovery copy.
      await driver.write(state.slot, text);
      if (await driver.read(state.slot) !== text) throw Error('Deletion could not be verified in the recovery copy. Retry deletion.');
    }
    return {workouts: clone(workouts), warning: ''};
  }
  return {
    list: () => exclusive(async () => result(await read())),
    save: workout => {
      // Snapshot before queuing so edits while saving cannot mutate the payload.
      let snapshot;
      try { snapshot = clone(validate(workout)); } catch (e) { return Promise.reject(e); }
      return exclusive(async () => {
        const state = await read(), prior = state.workouts.find(w => w.id === snapshot.id);
        if (prior) {
          if (JSON.stringify(prior) !== JSON.stringify(snapshot)) throw Error('This workout ID already has different saved data. Nothing was overwritten.');
          return result(state);
        }
        const workouts = [snapshot, ...state.workouts].sort((a,b) => b.performedOn.localeCompare(a.performedOn) || b.id.localeCompare(a.id));
        return commit(state, workouts);
      });
    },
    remove: id => exclusive(async () => {
      const state = await read();
      return commit(state, state.workouts.filter(w => w.id !== id), true);
    }),
  };
}
