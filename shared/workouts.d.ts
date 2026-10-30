export type WorkoutSet = {reps: number; load: string; unit: 'kg' | 'lb'};
export type WorkoutRecord = {id: string; title: string; performedOn: string; exercises: {exerciseId: string; sets: WorkoutSet[]}[]};
export class WorkoutInputError extends Error {code: string}
export function validateSet<T extends WorkoutSet>(set: T): T;
export function validateWorkout<T extends WorkoutRecord>(workout: T, exerciseIds: Set<string>, today?: string): T;
export function workoutVolume(workout: WorkoutRecord): {kg: number; lb: number};
