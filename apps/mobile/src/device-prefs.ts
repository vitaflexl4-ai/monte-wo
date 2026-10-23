import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import climbProposal from "./climb-scale-data.json";
import { ruleFor, today } from "./model";
import {
  evaluateProposedAttempt,
  interpolateDisciplineLadder,
  type ProposedAttemptEvaluation,
  type InterpolatedLadderResult,
} from "../../../shared/proposed-climb-scale.js";
import type { MealItem } from "../../../shared/training-tools.js";

export { climbProposal, interpolateDisciplineLadder, evaluateProposedAttempt };
export type { ProposedAttemptEvaluation, InterpolatedLadderResult };

export type LocalClimbProfile = {
  bodyweight: string;
  unit: "kg" | "lb";
  sexCategory: "male" | "female" | "unclassified";
  ageYears: string;
  trainingFocus: "strength" | "climb" | "technique" | "hypertrophy";
  hapticsEnabled: boolean;
};

export const DEFAULT_CLIMB_PROFILE: LocalClimbProfile = {
  bodyweight: "",
  unit: "kg",
  sexCategory: "male",
  ageYears: "",
  trainingFocus: "climb",
  hapticsEnabled: true,
};

export type SelfReportedLift = {
  id: string;
  discipline: "squat" | "bench" | "deadlift" | "curl";
  load: string;
  unit: "kg" | "lb";
  reps: number;
  resultType: "tested" | "estimated";
  performedOn: string;
  bodyweight: string;
  bodyweightUnit: "kg" | "lb";
  sexCategory: "male" | "female" | "unclassified";
  ageYears: number;
  rulebookId: string;
  variation: string;
  checks: Record<string, boolean>;
  notes?: string;
  createdAt: string;
  evaluation: ProposedAttemptEvaluation;
};

export type DraftSetItem = {
  reps: number;
  load: string;
  unit: "kg" | "lb";
  rpe?: string;
  completed?: boolean;
};

export type WorkoutDraft = {
  id: string;
  title: string;
  performedOn: string;
  notes: string;
  restSeconds: number;
  exercises: {
    exerciseId: string;
    note?: string;
    sets: DraftSetItem[];
  }[];
  updatedAt: string;
};

export type NutritionTargetsSnapshot = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} | null;

export type DailyFuelStore = {
  date: string;
  targets: NutritionTargetsSnapshot;
  meals: MealItem[];
};

const KEYS = {
  profile: "montewo.climb-profile.v1",
  lifts: "montewo.self-reported-lifts.v1",
  draft: "montewo.workout-draft.v1",
  fuel: "montewo.daily-fuel.v1",
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      raw = window.localStorage.getItem(key);
    } else {
      const f = new File(Paths.document, key + ".json");
      if (f.exists && f.size < 2_000_000) {
        raw = await f.text();
      }
    }
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(key, raw);
    } else {
      new File(Paths.document, key + ".json").write(raw);
    }
  } catch {
    // Non-critical device preference write; workouts use dedicated dual-slot archive.
  }
}

export async function loadClimbProfile(): Promise<LocalClimbProfile> {
  const saved = await readJson<Partial<LocalClimbProfile>>(KEYS.profile, {});
  return {
    bodyweight: typeof saved.bodyweight === "string" ? saved.bodyweight : "",
    unit: saved.unit === "lb" ? "lb" : "kg",
    sexCategory:
      saved.sexCategory === "female" || saved.sexCategory === "unclassified"
        ? saved.sexCategory
        : "male",
    ageYears: typeof saved.ageYears === "string" ? saved.ageYears : "",
    trainingFocus:
      saved.trainingFocus &&
      ["strength", "climb", "technique", "hypertrophy"].includes(saved.trainingFocus)
        ? saved.trainingFocus
        : "climb",
    hapticsEnabled: saved.hapticsEnabled !== false,
  };
}

export async function saveClimbProfile(profile: LocalClimbProfile): Promise<void> {
  await writeJson(KEYS.profile, profile);
}

export async function loadSelfReportedLifts(): Promise<SelfReportedLift[]> {
  const items = await readJson<SelfReportedLift[]>(KEYS.lifts, []);
  return Array.isArray(items) ? items : [];
}

export async function recordSelfReportedLift(input: {
  id: string;
  discipline: "squat" | "bench" | "deadlift" | "curl";
  load: string;
  unit: "kg" | "lb";
  reps: number;
  resultType: "tested" | "estimated";
  performedOn: string;
  bodyweight: string;
  bodyweightUnit: "kg" | "lb";
  sexCategory: "male" | "female" | "unclassified";
  ageYears?: string | number;
  checks: Record<string, boolean>;
  notes?: string;
}): Promise<{ record: SelfReportedLift; all: SelfReportedLift[] }> {
  const rule = ruleFor(input.discipline);
  const ageNum =
    input.ageYears === undefined || String(input.ageYears).trim() === ""
      ? 25
      : Number(input.ageYears);
  const evaluation = evaluateProposedAttempt(
    climbProposal,
    rule,
    {
      discipline: input.discipline,
      load: input.load,
      unit: input.unit,
      reps: input.reps,
      resultType: input.resultType,
      performedOn: input.performedOn,
      bodyweight: input.bodyweight,
      bodyweightUnit: input.bodyweightUnit,
      sexCategory: input.sexCategory,
      ageYears: ageNum,
      checks: input.checks,
    },
    today(),
  );

  const record: SelfReportedLift = {
    id: input.id,
    discipline: input.discipline,
    load: String(input.load).trim(),
    unit: input.unit,
    reps: input.reps,
    resultType: input.resultType,
    performedOn: input.performedOn,
    bodyweight: String(input.bodyweight).trim(),
    bodyweightUnit: input.bodyweightUnit,
    sexCategory: input.sexCategory,
    ageYears: ageNum,
    rulebookId: rule.id,
    variation: rule.variation,
    checks: { ...input.checks },
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 240) : undefined,
    createdAt: new Date().toISOString(),
    evaluation,
  };

  const existing = await loadSelfReportedLifts();
  const next = [record, ...existing.filter((x) => x.id !== record.id)].slice(0, 100);
  await writeJson(KEYS.lifts, next);
  return { record, all: next };
}

export async function removeSelfReportedLift(id: string): Promise<SelfReportedLift[]> {
  const existing = await loadSelfReportedLifts();
  const next = existing.filter((x) => x.id !== id);
  await writeJson(KEYS.lifts, next);
  return next;
}

export function bestCandidateForDiscipline(
  lifts: SelfReportedLift[],
  discipline: string,
): SelfReportedLift | null {
  const valid = lifts.filter(
    (l) =>
      l.discipline === discipline &&
      (l.evaluation.status === "self-reported-candidate" ||
        l.evaluation.status === "below-debitan"),
  );
  if (!valid.length) return null;
  return valid.sort((a, b) => {
    const ordA = a.evaluation.candidateOrdinal || 0;
    const ordB = b.evaluation.candidateOrdinal || 0;
    if (ordB !== ordA) return ordB - ordA;
    return (b.evaluation.performedKg || 0) - (a.evaluation.performedKg || 0);
  })[0];
}

export async function loadWorkoutDraft(): Promise<WorkoutDraft | null> {
  const draft = await readJson<WorkoutDraft | null>(KEYS.draft, null);
  if (!draft || !Array.isArray(draft.exercises)) return null;
  return draft;
}

export async function saveWorkoutDraft(draft: WorkoutDraft | null): Promise<void> {
  if (!draft) {
    try {
      if (Platform.OS === "web") window.localStorage.removeItem(KEYS.draft);
      else {
        const f = new File(Paths.document, KEYS.draft + ".json");
        if (f.exists) f.delete();
      }
    } catch {}
    return;
  }
  await writeJson(KEYS.draft, draft);
}

export async function loadDailyFuel(): Promise<DailyFuelStore> {
  const d = today();
  const saved = await readJson<DailyFuelStore | null>(KEYS.fuel, null);
  if (!saved || saved.date !== d) {
    return {
      date: d,
      targets: saved?.targets || null,
      meals: [],
    };
  }
  return {
    date: d,
    targets: saved.targets || null,
    meals: Array.isArray(saved.meals) ? saved.meals : [],
  };
}

export async function saveDailyFuel(store: DailyFuelStore): Promise<void> {
  await writeJson(KEYS.fuel, store);
}
