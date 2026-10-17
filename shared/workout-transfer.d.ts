import type {WorkoutRecord} from './workouts.js';
export type SessionRow = {exerciseId: string; name?: string; weight: number; reps: number};
export type WorkoutReceipt = {id: string; alreadySaved?: true};
export function sessionToWorkout(rows: SessionRow[], details: {id: string; title: string; performedOn: string}, exerciseIds: Set<string>, today?: string): WorkoutRecord;
export function savedWorkoutAcknowledged(receipt: unknown, id: string): receipt is WorkoutReceipt;
export class WorkoutTransferError extends Error {code: string}
export function saveWorkoutCopy(workout: WorkoutRecord, exerciseIds: Set<string>, send: (snapshot: WorkoutRecord) => Promise<unknown>, isSessionCurrent: () => boolean): Promise<WorkoutReceipt>;
