import type { PackRecord } from "./workout-library";
// Public exercise records are shared content, never a second rank engine.
export type ExerciseRecord = {
  id: string;
  name: string;
  group: string;
  muscles: string[];
  secondary: string[];
  equipment: string;
  movement: string;
  aliases: string[];
  steps: string[];
  cue: string;
  safety: string;
  easier: string;
  pack?: PackRecord;
  sourcePackage?: string;
  reviewStatus?: string;
  media: null | {
    type: "image" | "video";
    src: string;
    source: string;
    reviewed: boolean;
  };
};
export type ExerciseCatalog = {
  version: number;
  groups: { id: string; name: string; description?: string; number?: string }[];
  exercises: ExerciseRecord[];
};
const text = (v: unknown, max = 4000) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const strings = (v: unknown, max = 30) =>
  Array.isArray(v) && v.length <= max && v.every((x) => text(x));
export function validateCatalog(value: unknown): ExerciseCatalog {
  const j = value as ExerciseCatalog;
  if (
    !j ||
    !Number.isInteger(j.version) ||
    !Array.isArray(j.groups) ||
    !j.groups.length ||
    j.groups.length > 30 ||
    !Array.isArray(j.exercises) ||
    !j.exercises.length ||
    j.exercises.length > 2000
  )
    throw Error("Invalid exercise catalog.");
  const ids = new Set<string>(),
    groups = new Set<string>();
  for (const g of j.groups) {
    if (
      !/^[a-z0-9-]{1,80}$/.test(g.id) ||
      !text(g.name, 120) ||
      groups.has(g.id)
    )
      throw Error("Invalid exercise group.");
    groups.add(g.id);
  }
  for (const e of j.exercises) {
    if (e.pack != null) throw Error("External catalog cannot supply trusted pack references.");
    if (
      !/^[a-z0-9-]{1,100}$/.test(e.id) ||
      ids.has(e.id) ||
      !groups.has(e.group) ||
      !text(e.name, 200) ||
      !text(e.equipment, 120) ||
      !strings(e.muscles) ||
      !strings(e.secondary) ||
      !strings(e.aliases) ||
      !strings(e.steps) ||
      !e.steps.length ||
      !text(e.cue) ||
      !text(e.safety) ||
      !text(e.easier)
    )
      throw Error("Invalid exercise record.");
    ids.add(e.id);
    if (
      e.media != null &&
      (!["image", "video"].includes(e.media.type) ||
        !text(e.media.src, 2000) ||
        !text(e.media.source, 500) ||
        e.media.reviewed !== true)
    )
      throw Error("Exercise media needs reviewed provenance.");
  }
  return j;
}
export function mediaUri(e: ExerciseRecord, apiBase: string) {
  const m = e.media;
  if (!m || m.reviewed !== true) return null;
  try {
    const u = new URL(m.src, apiBase + "/");
    if (
      u.protocol !== "https:" &&
      !(m.src.startsWith("/") && u.origin === new URL(apiBase).origin)
    )
      return null;
    if (u.username || u.password || u.search || u.hash) return null;
    if (!/\.(png|jpe?g|gif|webp|mp4)$/i.test(u.pathname)) return null;
    if (m.type === "video" && !/\.mp4$/i.test(u.pathname)) return null;
    return u.href;
  } catch {
    return null;
  }
}
export async function fetchPublicCatalog(apiBase: string) {
  const configured = process.env.EXPO_PUBLIC_EXERCISE_CATALOG_URL;
  const url = configured || apiBase + "/api/mobile/exercises";
  if (configured && !url.startsWith("https://"))
    throw Error("Public catalog URL must use HTTPS.");
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (
      !response.ok ||
      !response.headers.get("Content-Type")?.includes("application/json")
    )
      throw Error("Shared catalog is not available.");
    const raw = await response.text();
    if (raw.length > 2_000_000) throw Error("Exercise catalog exceeds limit.");
    return validateCatalog(JSON.parse(raw));
  } finally {
    clearTimeout(timer);
  }
}
