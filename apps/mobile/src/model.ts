import catalog from "./generated/exercises.json";
import standards from "./generated/standards.json";
export { catalog, standards };
export const disciplines = [
  { id: "squat", name: "Squat" },
  { id: "bench", name: "Bench Press" },
  { id: "deadlift", name: "Deadlift" },
  { id: "curl", name: "Biceps Curl" },
];
export const rankNames: Record<string, string> = {
  debitan: "Debitan",
  bati: "Bati",
  solid: "Solid",
  fo: "Fò",
  avanse: "Avanse",
  met: "Mèt",
  chanpyon: "Chanpyon",
  titan: "Titan",
  lejand: "Lejand",
};
export type SetRecord = { reps: number; load: string; unit: "kg" | "lb" };
export type Workout = {
  id: string;
  title: string;
  performedOn: string;
  exercises: { exerciseId: string; sets: SetRecord[] }[];
  createdAt?: string;
};
export const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
export function ruleFor(id: string) {
  return standards.rulebooks.find((r: any) => r.discipline === id)!;
}
export function workoutSummary(w: Workout) {
  return (
    w.exercises.reduce((n, e) => n + e.sets.length, 0) +
    " sets · " +
    w.exercises.length +
    " exercises"
  );
}
