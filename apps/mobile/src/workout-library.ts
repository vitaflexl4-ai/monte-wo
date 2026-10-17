import library from "./generated/workout-library.json";
import type { ExerciseCatalog, ExerciseRecord } from "./catalog";
export type PackRecord = (typeof library.records)[number];
export const workoutLibrary = library;
export function mergeWorkoutLibrary(base: ExerciseCatalog): ExerciseCatalog {
  const exercises = new Map<string, ExerciseRecord>(
    base.exercises.map((e) => [e.id, { ...e }]),
  );
  const groups = [...base.groups];
  for (const pack of library.records) {
    const m = pack.manifest,
      group = m.category.toLowerCase();
    if (!groups.some((g) => g.id === group))
      groups.push({ id: group, name: m.category });
    const existing = exercises.get(m.id);
    if (existing) {
      exercises.set(m.id, {
        ...existing,
        pack,
        aliases: [...new Set([...existing.aliases, m.name_en])],
      });
      continue;
    }
    // Source manifests have metadata, not coaching steps. Do not invent instructions
    // or mislabel technical media verification as form/methodology approval.
    exercises.set(m.id, {
      id: m.id,
      name: m.name_en,
      group,
      muscles: m.primary_muscles,
      secondary: m.secondary_muscles,
      equipment: m.equipment,
      movement: "",
      aliases: [m.name_en],
      steps: [],
      cue: "",
      safety: "",
      easier: "",
      media: null,
      pack,
      sourcePackage: pack.packages.join(", "),
      reviewStatus: "metadata-only; form-and-rights-review-pending",
    });
  }
  return { ...base, groups, exercises: [...exercises.values()] };
}
export function packMediaUri(
  pack: PackRecord,
  kind: "demo" | "loop" | "poster",
  previewOrigin?: string,
): string {
  const file = pack.files[kind];
  // Only the generated, commit-pinned inventory can supply a playable pack URL.
  if (
    !library.records.some(
      (p) =>
        p.manifest.id === pack.manifest.id &&
        p.files[kind].sha256 === file.sha256 &&
        p.files[kind].path === file.path,
    )
  )
    throw Error("Unknown pack media");
  if (previewOrigin)
    return (
      previewOrigin.replace(/\/$/, "") +
      "/workout-media/" +
      pack.manifest.id +
      "/" +
      (kind === "poster" ? "poster.jpg" : kind + ".mp4")
    );
  return (
    "https://raw.githubusercontent.com/" +
    library.source.repository +
    "/" +
    library.source.commit +
    "/" +
    file.path
  );
}
