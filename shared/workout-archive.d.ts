import type {WorkoutRecord} from './workouts.js';
export type ArchiveResult = {workouts: WorkoutRecord[]; warning: string};
export type ArchiveDriver = {read(slot: number): Promise<string | null>; write(slot: number, text: string): Promise<void>; exclusive?<T>(fn: () => Promise<T>): Promise<T>};
export function createWorkoutArchive(driver: ArchiveDriver, exerciseIds: Set<string>, today: () => string): {
  list(): Promise<ArchiveResult>;
  save(workout: WorkoutRecord): Promise<ArchiveResult>;
  remove(id: string): Promise<ArchiveResult>;
};
