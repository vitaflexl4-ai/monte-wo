import type { ExerciseRecord } from "./catalog";
export type LibraryFilters = {
  query: string;
  group: string;
  source: string;
  equipment: string;
  sort: "az" | "za";
};
export const equipmentGroups = [
  { id: "all", name: "Any equipment" },
  { id: "bodyweight", name: "Bodyweight" },
  { id: "barbell", name: "Barbell" },
  { id: "dumbbells", name: "Dumbbells" },
  { id: "cable", name: "Cable" },
  { id: "machine", name: "Machine" },
];
export function normalizeSearch(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .trim();
}
export function equipmentGroup(s: string) {
  const text = normalizeSearch(s);
  if (text.includes("dumbbell")) return "dumbbells";
  if (text.includes("barbell")) return "barbell";
  if (text.includes("cable")) return "cable";
  if (text === "bodyweight" || text === "no equipment") return "bodyweight";
  if (text.includes("machine")) return "machine";
  return "other";
}
export function indexLibrary(rows: ExerciseRecord[]) {
  return rows.map((exercise) => ({
    exercise,
    equipment: equipmentGroup(exercise.equipment),
    text: normalizeSearch(
      [
        exercise.id,
        exercise.name,
        exercise.equipment,
        ...exercise.muscles,
        ...exercise.secondary,
        ...exercise.aliases,
        ...(exercise.pack?.manifest.primary_muscles || []),
        ...(exercise.pack?.manifest.secondary_muscles || []),
      ].join(" "),
    ),
  }));
}
export function filterLibrary(
  index: ReturnType<typeof indexLibrary>,
  f: LibraryFilters,
) {
  const tokens = normalizeSearch(f.query).split(/\s+/).filter(Boolean);
  return index
    .filter(
      ({ exercise: e, equipment, text }) =>
        (f.group === "all" || e.group === f.group) &&
        (f.source !== "pack" || !!e.pack) &&
        (f.source !== "guides" || e.steps.length > 0) &&
        (f.equipment === "all" || equipment === f.equipment) &&
        tokens.every((t) => text.includes(t)),
    )
    .map((r) => r.exercise)
    .sort((a, b) => {
      const n =
        a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
        a.id.localeCompare(b.id);
      return f.sort === "za" ? -n : n;
    });
}
export function gridColumns(width: number) {
  return width >= 900 ? 4 : width >= 600 ? 3 : width >= 300 ? 2 : 1;
}
