import {Platform} from 'react-native';
import {File, Paths} from 'expo-file-system';
import {createWorkoutArchive, type ArchiveDriver} from '../../../shared/workout-archive.js';
import {catalog, today} from './model';
const key = (slot: number) => `montewo.device-workouts.v1.${slot}`;
const driver: ArchiveDriver = {
  async read(slot) {
    try {
      if (Platform.OS === 'web') return window.localStorage.getItem(key(slot));
      const file = new File(Paths.document, key(slot) + '.json');
      if (!file.exists) return null;
      if (file.size > 4000000) throw Error('oversized');
      return await file.text();
    } catch { throw Error('Device workout storage could not be read. No saved data was replaced.'); }
  },
  async write(slot, text) {
    try {
      if (Platform.OS === 'web') window.localStorage.setItem(key(slot), text);
      else new File(Paths.document, key(slot) + '.json').write(text);
    } catch { throw Error('Device storage could not save this workout. Check free space and storage permissions; keep this session open.'); }
  },
  async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (Platform.OS !== 'web') return fn();
    // Fail honestly rather than risk lost updates between browser tabs.
    if (!navigator.locks) throw Error('This browser cannot safely save workout history. Use a browser with Web Locks support.');
    return navigator.locks.request('montewo.device-workouts.v1', fn);
  },
};
export const deviceWorkouts = createWorkoutArchive(driver, new Set(catalog.exercises.map(e => e.id)), today);
