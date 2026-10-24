export const KG_PER_LB: number;
export const CM_PER_IN: number;
export const ACTIVITY_FACTORS: Record<string, { factor: number; label: string }>;
export const GOAL_ADJUSTMENTS: Record<string, { multiplier: number; label: string }>;
export const STANDARD_PLATES: { kg: number[]; lb: number[] };

export class CalcError extends Error {
  constructor(message: string);
}

export function bodyMassKg(weight: string | number, unit?: "kg" | "lb"): number;

export function calculateEnergyPlan(input: {
  weight: string | number;
  unit?: "kg" | "lb";
  height: string | number;
  heightUnit?: "cm" | "in";
  age: string | number;
  sex?: "male" | "female";
  activity?: "sedentary" | "light" | "moderate" | "very" | "extra";
  goal?: "cut" | "maintain" | "gain";
}): {
  bmr: number;
  tdee: number;
  targetCalories: number;
  activityFactor: number;
  goal: string;
  goalLabel: string;
  kg: number;
  cm: number;
  formulaLabel: string;
};

export function calculateMacroPlan(input: {
  weight: string | number;
  unit?: "kg" | "lb";
  calories: string | number;
  proteinPerKg?: string | number;
  fatPercent?: string | number;
  meals?: string | number;
}): {
  calories: number;
  allocatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  meals: number;
  perMeal: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};

export function calculateHydrationReference(input: {
  weight: string | number;
  unit?: "kg" | "lb";
  trainingMinutes?: string | number;
}): {
  baseLiters: number;
  sessionExtraLiters: number;
  totalLiters: number;
  fluidOz: number;
  creatineGrams: number;
};

export type MealItem = {
  id?: string;
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
};

export function validateMealEntry(input: {
  name: string;
  proteinG: string | number;
  carbsG: string | number;
  fatG: string | number;
}): MealItem;

export function summarizeMeals(meals: MealItem[]): {
  count: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
};

export function calculateBarbellSetup(input: {
  targetLoad: string | number;
  unit?: "kg" | "lb";
  barWeight?: string | number;
}): {
  unit: "kg" | "lb";
  bar: number;
  target: number;
  actualLoad: number;
  exact: boolean;
  platesPerSide: { weight: number; count: number }[];
  warmups: {
    label: string;
    percent: number;
    load: number;
    unit: "kg" | "lb";
    reps: number;
    restSec: number;
  }[];
};

export type TrainingBestLift = {
  load: string;
  unit: "kg" | "lb";
  reps: number;
  performedOn: string;
  e1rmKg: number;
  e1rmLb: number;
  isSingle: boolean;
} | null;

export function analyzeWorkouts(
  workouts: any[],
  referenceDateStr?: string,
): {
  totalSessions: number;
  totalSets: number;
  weeklySessions: number;
  weeklySets: number;
  weeklyKgVolume: number;
  weeklyLbVolume: number;
  trainingBest: {
    squat: TrainingBestLift;
    bench: TrainingBestLift;
    deadlift: TrainingBestLift;
    curl: TrainingBestLift;
  };
};
