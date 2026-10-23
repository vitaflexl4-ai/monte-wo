// Pure deterministic calculators for MONTE WO Nutrition & Barbell Training Tools.
// Zero network calls, zero prefilled athlete numbers, zero fabricated results.

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const ACTIVITY_FACTORS = {
  sedentary: { factor: 1.2, label: "Sedentary · desk work, minimal movement" },
  light: { factor: 1.375, label: "Light · 1–3 sessions / week" },
  moderate: { factor: 1.55, label: "Moderate · 3–5 strength sessions / week" },
  very: { factor: 1.725, label: "High · 5–6 hard sessions / week" },
  extra: { factor: 1.9, label: "Heavy · 2-a-days or physical labor + lifting" },
};

export const GOAL_ADJUSTMENTS = {
  cut: { multiplier: 0.85, label: "Cut (−15%)" },
  maintain: { multiplier: 1.0, label: "Maintain (0%)" },
  gain: { multiplier: 1.1, label: "Lean Gain (+10%)" },
};

export const STANDARD_PLATES = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export class CalcError extends Error {
  constructor(message) {
    super(message);
    this.name = "CalcError";
  }
}

function parseNum(value, label, min, max) {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    typeof value === "boolean"
  ) {
    throw new CalcError(`Enter your ${label}.`);
  }
  const str = String(value).trim();
  if (!str || !Number.isFinite(Number(str))) {
    throw new CalcError(`Enter a valid ${label}.`);
  }
  const n = Number(str);
  if (n < min - 1e-6 || n > max + 1e-6) {
    throw new CalcError(`${label} must be between ${min} and ${max}.`);
  }
  return n;
}

function parseWhole(value, label, min, max) {
  const n = parseNum(value, label, min, max);
  if (!Number.isInteger(n)) {
    throw new CalcError(`${label} must be a whole number.`);
  }
  return n;
}

export function bodyMassKg(weight, unit = "kg") {
  if (unit !== "kg" && unit !== "lb") {
    throw new CalcError("Choose kg or lb.");
  }
  const raw = parseNum(weight, "bodyweight", 1, 1000);
  const kg = unit === "lb" ? raw * KG_PER_LB : raw;
  if (kg < 30 || kg > 300) {
    throw new CalcError("Bodyweight must be between 30–300 kg (66–661 lb).");
  }
  return kg;
}

// 1. Mifflin-St Jeor Resting & Daily Energy + Goal Target
export function calculateEnergyPlan({
  weight,
  unit = "kg",
  height,
  heightUnit = "cm",
  age,
  sex = "male",
  activity = "moderate",
  goal = "maintain",
}) {
  const kg = bodyMassKg(weight, unit);
  if (heightUnit !== "cm" && heightUnit !== "in") {
    throw new CalcError("Choose cm or in for height.");
  }
  const rawHeight = parseNum(height, "height", 1, 300);
  const cm = heightUnit === "in" ? rawHeight * CM_PER_IN : rawHeight;
  if (cm < 120 || cm > 230) {
    throw new CalcError("Height must be between 120–230 cm (47.2–90.5 in).");
  }
  const years = parseWhole(age, "adult age", 18, 100);
  if (sex !== "male" && sex !== "female") {
    throw new CalcError("Choose male (+5) or female (−161) Mifflin-St Jeor constant.");
  }
  if (!Object.hasOwn(ACTIVITY_FACTORS, activity)) {
    throw new CalcError("Choose a valid activity level.");
  }
  if (!Object.hasOwn(GOAL_ADJUSTMENTS, goal)) {
    throw new CalcError("Choose a valid energy goal.");
  }

  const bmr = 10 * kg + 6.25 * cm - 5 * years + (sex === "male" ? 5 : -161);
  if (bmr <= 0) {
    throw new CalcError("Inputs fall outside the Mifflin-St Jeor formula range.");
  }
  const factor = ACTIVITY_FACTORS[activity].factor;
  const tdee = bmr * factor;
  const goalMultiplier = GOAL_ADJUSTMENTS[goal].multiplier;
  const targetCalories = Math.round(tdee * goalMultiplier);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    activityFactor: factor,
    goal,
    goalLabel: GOAL_ADJUSTMENTS[goal].label,
    kg: Math.round(kg * 10) / 10,
    cm: Math.round(cm * 10) / 10,
    formulaLabel: `Mifflin-St Jeor (${sex === "male" ? "+5" : "−161"}) × ${factor}`,
  };
}

// 2. Strength Macro & Per-Meal Split Planner
export function calculateMacroPlan({
  weight,
  unit = "kg",
  calories,
  proteinPerKg = 1.8,
  fatPercent = 25,
  meals = 4,
}) {
  const kg = bodyMassKg(weight, unit);
  const kcal = parseNum(calories, "daily calories", 1100, 8000);
  const protRate = parseNum(proteinPerKg, "protein g/kg", 1.2, 2.6);
  const fatPct = parseNum(fatPercent, "fat percentage", 18, 40);
  const mealCount = parseWhole(meals, "meals per day", 1, 8);

  const proteinG = Math.round(kg * protRate);
  const proteinKcal = proteinG * 4;
  const fatKcal = kcal * (fatPct / 100);
  const fatG = Math.round(fatKcal / 9);
  const actualFatKcal = fatG * 9;
  const remainingKcal = kcal - proteinKcal - actualFatKcal;
  if (remainingKcal < 40) {
    throw new CalcError(
      "Protein and fat exceed your calorie budget. Increase daily calories or lower protein/fat rate.",
    );
  }
  const carbsG = Math.round(remainingKcal / 4);
  const carbsKcal = carbsG * 4;
  const totalKcal = proteinKcal + actualFatKcal + carbsKcal;

  return {
    calories: Math.round(kcal),
    allocatedCalories: totalKcal,
    proteinG,
    carbsG,
    fatG,
    proteinPct: Math.round((proteinKcal / totalKcal) * 100),
    carbsPct: Math.round((carbsKcal / totalKcal) * 100),
    fatPct: Math.max(
      0,
      100 -
        Math.round((proteinKcal / totalKcal) * 100) -
        Math.round((carbsKcal / totalKcal) * 100),
    ),
    meals: mealCount,
    perMeal: {
      calories: Math.round(kcal / mealCount),
      proteinG: Math.round(proteinG / mealCount),
      carbsG: Math.round(carbsG / mealCount),
      fatG: Math.round(fatG / mealCount),
    },
  };
}

// 3. Hydration & Creatine Reference (educational strength-athlete guide)
export function calculateHydrationReference({ weight, unit = "kg", trainingMinutes = 60 }) {
  const kg = bodyMassKg(weight, unit);
  const mins = parseWhole(trainingMinutes, "training session minutes", 0, 240);
  const baseLiters = (kg * 0.035);
  const sessionExtraLiters = (mins / 60) * 0.6;
  const totalLiters = Math.round((baseLiters + sessionExtraLiters) * 100) / 100;
  const creatineGrams = Math.min(5, Math.max(3, Math.round(kg * 0.05 * 10) / 10));

  return {
    baseLiters: Math.round(baseLiters * 100) / 100,
    sessionExtraLiters: Math.round(sessionExtraLiters * 100) / 100,
    totalLiters,
    fluidOz: Math.round(totalLiters * 33.814),
    creatineGrams,
  };
}

// 4. Meal Entry Validation & Exact Macro Sum (4P + 4C + 9F)
export function validateMealEntry({ name, proteinG, carbsG, fatG }) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed || trimmed.length > 80) {
    throw new CalcError("Enter a meal or food label (1–80 characters).");
  }
  const p = parseNum(proteinG, "protein (g)", 0, 400);
  const c = parseNum(carbsG, "carbs (g)", 0, 800);
  const f = parseNum(fatG, "fat (g)", 0, 300);
  if (p === 0 && c === 0 && f === 0) {
    throw new CalcError("Enter at least one non-zero macro gram value.");
  }
  const round1 = (x) => Math.round(x * 10) / 10;
  const pr = round1(p);
  const cr = round1(c);
  const fr = round1(f);
  return {
    name: trimmed,
    proteinG: pr,
    carbsG: cr,
    fatG: fr,
    calories: Math.round(pr * 4 + cr * 4 + fr * 9),
  };
}

export function summarizeMeals(meals) {
  const list = Array.isArray(meals) ? meals : [];
  const p = list.reduce((s, m) => s + Number(m.proteinG || 0), 0);
  const c = list.reduce((s, m) => s + Number(m.carbsG || 0), 0);
  const f = list.reduce((s, m) => s + Number(m.fatG || 0), 0);
  const round1 = (x) => Math.round(x * 10) / 10;
  return {
    count: list.length,
    proteinG: round1(p),
    carbsG: round1(c),
    fatG: round1(f),
    calories: Math.round(p * 4 + c * 4 + f * 9),
  };
}

// 5. Barbell Plate & Warm-up Ramp Calculator (for Workout screen)
export function calculateBarbellSetup({ targetLoad, unit = "kg", barWeight }) {
  if (unit !== "kg" && unit !== "lb") {
    throw new CalcError("Choose kg or lb.");
  }
  const defaultBar = unit === "kg" ? 20 : 45;
  const bar =
    barWeight === undefined || barWeight === ""
      ? defaultBar
      : parseNum(barWeight, "bar weight", 5, unit === "kg" ? 35 : 75);
  const target = parseNum(targetLoad, "working load", bar, unit === "kg" ? 600 : 1320);

  const platesAvailable = STANDARD_PLATES[unit];
  let remainingPerSide = (target - bar) / 2;
  const platesPerSide = [];
  for (const plate of platesAvailable) {
    const count = Math.floor((remainingPerSide + 1e-7) / plate);
    if (count > 0) {
      platesPerSide.push({ weight: plate, count });
      remainingPerSide -= count * plate;
    }
  }
  const loadedPerSide = platesPerSide.reduce((s, p) => s + p.weight * p.count, 0);
  const actualLoad = Math.round((bar + loadedPerSide * 2) * 100) / 100;

  const rampSpecs = [
    { label: "Warm-up 1", pct: 0.45, reps: 8, restSec: 45 },
    { label: "Warm-up 2", pct: 0.65, reps: 5, restSec: 60 },
    { label: "Warm-up 3", pct: 0.80, reps: 3, restSec: 90 },
    { label: "Warm-up 4", pct: 0.90, reps: 1, restSec: 120 },
  ];
  const step = unit === "kg" ? 2.5 : 5;
  const warmups = [];
  let lastLoad = 0;
  for (const r of rampSpecs) {
    const raw = actualLoad * r.pct;
    const snapped = Math.max(bar, Math.floor((raw + 1e-7) / step) * step);
    if (snapped >= actualLoad) continue;
    if (snapped <= lastLoad) continue;
    warmups.push({
      label: r.label,
      percent: Math.round(r.pct * 100),
      load: snapped,
      unit,
      reps: r.reps,
      restSec: r.restSec,
    });
    lastLoad = snapped;
  }

  return {
    unit,
    bar,
    target,
    actualLoad,
    exact: Math.abs(actualLoad - target) < 1e-6,
    platesPerSide,
    warmups,
  };
}

// 6. Workout History Analytics (derived ONLY from real saved workouts; never invents sessions)
export function analyzeWorkouts(workouts, referenceDateStr) {
  const list = Array.isArray(workouts) ? workouts : [];
  const refTime = referenceDateStr ? Date.parse(referenceDateStr + "T00:00:00Z") : Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  let totalSets = 0;
  let weeklySessions = 0;
  let weeklySets = 0;
  let weeklyKgVolume = 0;
  let weeklyLbVolume = 0;

  const disciplineExerciseMap = {
    "back-squat": "squat",
    "bench-press": "bench",
    deadlift: "deadlift",
    "barbell-curl": "curl",
  };

  // Best training e1RM (informational only; never awards a rank)
  const trainingBest = {
    squat: null,
    bench: null,
    deadlift: null,
    curl: null,
  };

  for (const w of list) {
    const wTime = Date.parse(String(w.performedOn) + "T00:00:00Z");
    const isRecent7d = Number.isFinite(wTime) && refTime - wTime >= 0 && refTime - wTime < sevenDaysMs;
    if (isRecent7d) weeklySessions++;

    for (const ex of w.exercises || []) {
      const sets = ex.sets || [];
      totalSets += sets.length;
      if (isRecent7d) weeklySets += sets.length;

      const mappedDisc = disciplineExerciseMap[ex.exerciseId];
      for (const s of sets) {
        const loadNum = Number(s.load);
        const repsNum = Number(s.reps);
        if (!Number.isFinite(loadNum) || !Number.isFinite(repsNum) || repsNum <= 0) continue;

        if (isRecent7d) {
          if (s.unit === "kg") weeklyKgVolume += loadNum * repsNum;
          else if (s.unit === "lb") weeklyLbVolume += loadNum * repsNum;
        }

        if (mappedDisc && loadNum > 0 && repsNum >= 1 && repsNum <= 10) {
          const e1rm = repsNum === 1 ? loadNum : loadNum * (1 + repsNum / 30);
          const e1rmKg = s.unit === "lb" ? e1rm * KG_PER_LB : e1rm;
          const prev = trainingBest[mappedDisc];
          if (!prev || e1rmKg > prev.e1rmKg) {
            trainingBest[mappedDisc] = {
              load: s.load,
              unit: s.unit,
              reps: repsNum,
              performedOn: w.performedOn,
              e1rmKg: Math.round(e1rmKg * 10) / 10,
              e1rmLb: Math.round((e1rmKg / KG_PER_LB) * 10) / 10,
              isSingle: repsNum === 1,
            };
          }
        }
      }
    }
  }

  return {
    totalSessions: list.length,
    totalSets,
    weeklySessions,
    weeklySets,
    weeklyKgVolume: Math.round(weeklyKgVolume),
    weeklyLbVolume: Math.round(weeklyLbVolume),
    trainingBest,
  };
}
