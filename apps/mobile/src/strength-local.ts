// Device-local MONTE WO Strength Index™ records: a profile snapshot and self-reported performances kept on this
// device when no account is connected (account services are opt-in and may be switched off on a deployment).
// Validation and assessment use the ONE canonical engine shared with the backend (server/strength/engine.js);
// nothing here computes thresholds, estimates or ranks on its own. With the shipped DRAFT standards the engine
// answers "DRAFT — NOT OFFICIAL" for every performance; nothing stored here is or becomes an official rank.
import {Platform} from "react-native";
import {File, Paths} from "expo-file-system";
import {
  evaluate,
  mass,
  validatePerformance,
  validateProfile,
} from "../../../server/strength/engine.js";
import {standards, ruleFor, today} from "./model";

export type LocalProfile = {
  bodyweight: string;
  unit: "kg" | "lb";
  sexCategory: "female" | "male" | "unclassified";
  ageYears: number;
  savedAt: string;
};
export type PerformanceInput = {
  discipline: string;
  load: string;
  unit: "kg" | "lb";
  reps: number;
  resultType: "tested" | "estimated";
  performedOn: string;
  checks: Record<string, boolean>;
};
export type Assessment = {
  status: string;
  rankId: string | null;
  eligibleRankId: string | null;
  explanation: string;
  progress: number | null;
  modelId: string;
  rulebookId: string;
  resultType: string;
  methodologyStatus: "draft" | "approved";
};
export type LocalPerformance = {
  id: string;
  data: PerformanceInput & {
    bodyweight: string;
    bodyweightUnit: "kg" | "lb";
    sexCategory: LocalProfile["sexCategory"];
    ageYears: number;
    variation: string;
    equipment: string;
  };
  assessment: Assessment;
  createdAt: string;
};
export type StrengthState = {
  version: 1;
  revision: number;
  profile: LocalProfile | null;
  performances: LocalPerformance[];
};

const KEY = "montewo.device-strength.v1";
const MAX_RECORDS = 500;
const MAX_CHARS = 1000000;
const empty = (): StrengthState => ({version: 1, revision: 0, profile: null, performances: []});

const MESSAGES: Record<string, string> = {
  "decimal-string-required": "Enter the weight as a plain number, e.g. 100 or 102.5 (up to three decimals).",
  "invalid-load": "Enter the load lifted as a plain number, e.g. 100 or 102.5.",
  "invalid-unit": "Choose kg or lb.",
  "invalid-repetitions": "Repetitions must be a whole number from 1 to 10.",
  "invalid-result-type": "Choose Tested single or Estimated 1RM.",
  "result-type-repetition-mismatch": "A tested single is exactly 1 repetition; an estimate needs 2–10 repetitions.",
  "invalid-date": "Enter the date as YYYY-MM-DD, today or earlier.",
  "monte-standard-not-attested": "Tick every MONTE Standard check you met. An unchecked standard is not a qualifying performance.",
  "bodyweight-outside-software-support": "Bodyweight must be between 30 kg and 350 kg (66–771 lb).",
  "adult-age-outside-software-support": "Age must be between 18 and 100.",
  "invalid-category": "Choose a reference category.",
  "invalid-discipline": "Choose one of the four disciplines.",
  "unsupported-variation-or-equipment": "This performance does not match the discipline's MONTE Standard variation.",
};
export function strengthMessage(e: unknown) {
  const code = (e as any)?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  return e instanceof Error ? e.message : String(e);
}

// --- storage driver (same places as device workouts: localStorage on the web, the app's document directory natively)
async function read(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return window.localStorage.getItem(KEY);
    const file = new File(Paths.document, KEY + ".json");
    if (!file.exists) return null;
    if (file.size > 4000000) throw Error("oversized");
    return await file.text();
  } catch {
    throw Error("Device strength records could not be read. Nothing was replaced.");
  }
}
async function write(text: string) {
  try {
    if (Platform.OS === "web") window.localStorage.setItem(KEY, text);
    else new File(Paths.document, KEY + ".json").write(text);
  } catch {
    throw Error("Device storage could not save this record. Check free space and storage permissions.");
  }
}
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = () =>
    Platform.OS === "web" && typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(KEY, fn)
      : fn();
  const next = queue.then(run);
  queue = next.catch(() => {});
  return next as Promise<T>;
}

function parse(text: string | null): StrengthState {
  if (text === null) return empty();
  if (text.length > MAX_CHARS) throw Error("Device strength records are too large to read safely. Nothing was replaced.");
  let state: any;
  try {
    state = JSON.parse(text);
  } catch {
    throw Error("Device strength records are unreadable. They were not overwritten.");
  }
  if (
    !state || state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 ||
    !Array.isArray(state.performances) || state.performances.length > MAX_RECORDS ||
    (state.profile !== null && typeof state.profile !== "object")
  ) throw Error("Device strength records are unreadable. They were not overwritten.");
  const ids = new Set<string>();
  for (const p of state.performances) {
    if (!p || typeof p.id !== "string" || ids.has(p.id) || !p.data || !p.assessment) throw Error("Device strength records are unreadable. They were not overwritten.");
    ids.add(p.id);
  }
  return state as StrengthState;
}

export const modelFor = (discipline: string) =>
  (standards as any).models.find((m: any) => m.discipline === discipline);
export const methodologyStatus = (discipline: string): "draft" | "approved" => {
  const model = modelFor(discipline), rule = ruleFor(discipline);
  return model?.status === "approved" && (rule as any)?.status === "approved" ? "approved" : "draft";
};

// Assessment by the shared engine. Approval is read from the bundled methodology (draft today), never assumed.
export function assess(data: LocalPerformance["data"]): Assessment {
  const model = modelFor(data.discipline), rule = ruleFor(data.discipline) as any;
  const approved = methodologyStatus(data.discipline) === "approved";
  const out = evaluate(data, {model, rule, modelApproved: approved, ruleApproved: approved});
  return {
    status: out.status,
    rankId: out.rankId ?? null,
    eligibleRankId: out.eligibleRankId ?? null,
    explanation: out.explanation,
    progress: Number.isFinite(out.progress) ? out.progress : null,
    modelId: out.modelId,
    rulebookId: out.rulebookId,
    resultType: out.resultType,
    methodologyStatus: approved ? "approved" : "draft",
  };
}

const randomId = () =>
  "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

export const deviceStrength = {
  async load(): Promise<StrengthState> {
    return parse(await read());
  },
  async saveProfile(input: Omit<LocalProfile, "savedAt">): Promise<StrengthState> {
    const profile = validateProfile({
      bodyweight: input.bodyweight,
      unit: input.unit,
      sexCategory: input.sexCategory,
      ageYears: input.ageYears,
    });
    return exclusive(async () => {
      const state = parse(await read());
      const next: StrengthState = {
        ...state,
        revision: state.revision + 1,
        profile: {...profile, savedAt: new Date().toISOString()},
      };
      await write(JSON.stringify(next));
      return next;
    });
  },
  async addPerformance(input: PerformanceInput): Promise<{state: StrengthState; record: LocalPerformance}> {
    return exclusive(async () => {
      const state = parse(await read());
      if (!state.profile) throw Error("Save your profile snapshot (bodyweight, age, category) before logging a performance.");
      if (state.performances.length >= MAX_RECORDS) throw Error("Device performance history is full (500). Delete an older record first.");
      const rule = ruleFor(input.discipline) as any;
      if (!rule) throw Error(MESSAGES["invalid-discipline"]);
      const data: LocalPerformance["data"] = {
        discipline: input.discipline,
        load: input.load,
        unit: input.unit,
        reps: input.reps,
        resultType: input.resultType,
        performedOn: input.performedOn,
        bodyweight: state.profile.bodyweight,
        bodyweightUnit: state.profile.unit,
        sexCategory: state.profile.sexCategory,
        ageYears: state.profile.ageYears,
        variation: rule.variation,
        equipment: rule.equipment[0],
        checks: Object.fromEntries(rule.checks.map((c: any) => [c.id, input.checks[c.id] === true])),
      };
      validatePerformance(data, rule, today());
      const record: LocalPerformance = {id: randomId(), data, assessment: assess(data), createdAt: new Date().toISOString()};
      const next: StrengthState = {...state, revision: state.revision + 1, performances: [record, ...state.performances]};
      await write(JSON.stringify(next));
      return {state: next, record};
    });
  },
  async removePerformance(id: string): Promise<StrengthState> {
    return exclusive(async () => {
      const state = parse(await read());
      const next: StrengthState = {...state, revision: state.revision + 1, performances: state.performances.filter((p) => p.id !== id)};
      await write(JSON.stringify(next));
      return next;
    });
  },
};

// Heaviest logged load of a discipline (by mass, so kg and lb compare correctly). A log entry, not a rank.
export function heaviest(performances: LocalPerformance[], discipline: string): LocalPerformance | null {
  let best: LocalPerformance | null = null, bestMass = 0n;
  for (const p of performances) {
    if (p.data.discipline !== discipline) continue;
    let m: bigint;
    try {
      m = mass(p.data.load, p.data.unit);
    } catch {
      continue;
    }
    if (m > bestMass) {
      best = p;
      bestMass = m;
    }
  }
  return best;
}
