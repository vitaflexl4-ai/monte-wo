import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateModel, evaluate } from "../server/strength/engine.js";
import {
  CLIMB_RANK_IDS,
  CLIMB_DISCIPLINES,
  interpolateDisciplineLadder,
  evaluateProposedAttempt,
} from "../shared/proposed-climb-scale.js";
import {
  calculateEnergyPlan,
  calculateMacroPlan,
  calculateHydrationReference,
  validateMealEntry,
  summarizeMeals,
  calculateBarbellSetup,
  analyzeWorkouts,
} from "../shared/training-tools.js";

const proposal = JSON.parse(
  readFileSync("content/strength-proposals/climb-scale-proposed-v0.1.json", "utf8"),
);
const catalog = JSON.parse(readFileSync("public/strength-catalog.json", "utf8"));
const ruleFor = (id) => catalog.rulebooks.find((r) => r.discipline === id);

test("Proposed Climb Scale v0.1: validates against engine schema while staying locked from production publish", () => {
  assert.equal(proposal.status, "proposed");
  assert.equal(proposal.officialAwardsEnabled, false);
  assert.equal(proposal.ranks.length, 9);
  assert.deepEqual(
    proposal.ranks.map((r) => r.id),
    CLIMB_RANK_IDS,
  );
  assert.deepEqual(
    proposal.disciplines.map((d) => d.id),
    CLIMB_DISCIPLINES,
  );

  for (const d of proposal.disciplines) {
    // Valid bodyweight-lookup-v1 structure
    validateModel(d.model, { complete: false });
    // Cannot accidentally publish to production without purpose==="production" & sign-off
    assert.throws(
      () => validateModel(d.model, { complete: true }),
      (err) => err.code === "test-fixtures-cannot-publish",
    );

    const rule = ruleFor(d.id);
    const allChecks = Object.fromEntries(rule.checks.map((c) => [c.id, true]));
    const prodEval = evaluate(
      {
        discipline: d.id,
        load: "150",
        unit: "kg",
        reps: 1,
        resultType: "tested",
        performedOn: "2026-10-23",
        bodyweight: "83",
        bodyweightUnit: "kg",
        sexCategory: "male",
        ageYears: 28,
        variation: rule.variation,
        equipment: rule.equipment[0],
        checks: allChecks,
      },
      { model: d.model, rule, modelApproved: false, ruleApproved: false },
    );
    assert.equal(prodEval.status, "draft");
    assert.equal(prodEval.rankId, null);
  }
});

test("Proposed Climb Scale v0.1: monotonic across ranks and bodyweights, with damped relative ratio", () => {
  for (const d of CLIMB_DISCIPLINES) {
    const light = interpolateDisciplineLadder(proposal, d, {
      bodyweight: "66",
      unit: "kg",
      sexCategory: "male",
      ageYears: 25,
    });
    const heavy = interpolateDisciplineLadder(proposal, d, {
      bodyweight: "120",
      unit: "kg",
      sexCategory: "male",
      ageYears: 25,
    });
    assert.equal(light.ok, true);
    assert.equal(heavy.ok, true);

    for (let i = 0; i < 9; i++) {
      if (i > 0) {
        assert.ok(light.rungs[i].requiredKg > light.rungs[i - 1].requiredKg);
        assert.ok(heavy.rungs[i].requiredKg > heavy.rungs[i - 1].requiredKg);
      }
      // Heavier athlete requires strictly higher absolute load...
      assert.ok(heavy.rungs[i].requiredKg > light.rungs[i].requiredKg);
      // ...while relative xBW tapers realistically rather than scaling 1:1 linearly
      assert.ok(heavy.rungs[i].bwMultiple <= light.rungs[i].bwMultiple);
    }
  }
});

test("Proposed Climb Scale v0.1: refuses blank bodyweight, underage, and out-of-domain extrapolation", () => {
  assert.equal(
    interpolateDisciplineLadder(proposal, "squat", { bodyweight: "", unit: "kg" }).ok,
    false,
  );
  assert.equal(
    interpolateDisciplineLadder(proposal, "squat", {
      bodyweight: "80",
      unit: "kg",
      ageYears: 16,
    }).code,
    "unsupported-age",
  );
  assert.equal(
    interpolateDisciplineLadder(proposal, "squat", {
      bodyweight: "220",
      unit: "kg",
      ageYears: 30,
    }).code,
    "bodyweight-outside-proposal-range",
  );
});

test("Proposed Climb Scale v0.1: enforces strict movement checks, separates estimates, and never awards official verified rank", () => {
  const squatRule = ruleFor("squat");
  const allChecks = Object.fromEntries(squatRule.checks.map((c) => [c.id, true]));

  // 1. Heavy lift with failed depth check does NOT count
  const failedForm = evaluateProposedAttempt(
    proposal,
    squatRule,
    {
      discipline: "squat",
      load: "260",
      unit: "kg",
      reps: 1,
      resultType: "tested",
      performedOn: "2026-10-23",
      bodyweight: "83",
      bodyweightUnit: "kg",
      sexCategory: "male",
      ageYears: 28,
      checks: { ...allChecks, depth: false },
    },
    "2026-10-23",
  );
  assert.equal(failedForm.status, "failed-technique");
  assert.equal(failedForm.candidateRankId, null);
  assert.equal(failedForm.officialRankId, null);

  // 2. Multi-rep estimate never grants a candidate rank
  const estimateOnly = evaluateProposedAttempt(
    proposal,
    squatRule,
    {
      discipline: "squat",
      load: "180",
      unit: "kg",
      reps: 5,
      resultType: "estimated",
      performedOn: "2026-10-23",
      bodyweight: "83",
      bodyweightUnit: "kg",
      sexCategory: "male",
      ageYears: 28,
      checks: allChecks,
    },
    "2026-10-23",
  );
  assert.equal(estimateOnly.status, "training-estimate-only");
  assert.equal(estimateOnly.candidateRankId, null);
  assert.equal(estimateOnly.officialRankId, null);

  // 3. Valid strict 1-rep single tracks candidate tier while keeping official/verified null
  const validAvanse = evaluateProposedAttempt(
    proposal,
    squatRule,
    {
      discipline: "squat",
      load: "170",
      unit: "kg",
      reps: 1,
      resultType: "tested",
      performedOn: "2026-10-23",
      bodyweight: "83",
      bodyweightUnit: "kg",
      sexCategory: "male",
      ageYears: 28,
      checks: allChecks,
    },
    "2026-10-23",
  );
  assert.equal(validAvanse.status, "self-reported-candidate");
  assert.equal(validAvanse.candidateRankId, "avanse");
  assert.equal(validAvanse.officialRankId, null);
  assert.equal(validAvanse.verifiedRankId, null);
  assert.equal(validAvanse.verificationState, "self-reported-unverified");
  assert.equal(validAvanse.nextRung?.id, "met");

  // 4. Elite tier flags mandatory video verification floor while remaining unverified
  const validTitan = evaluateProposedAttempt(
    proposal,
    squatRule,
    {
      discipline: "squat",
      load: "260",
      unit: "kg",
      reps: 1,
      resultType: "tested",
      performedOn: "2026-10-23",
      bodyweight: "83",
      bodyweightUnit: "kg",
      sexCategory: "male",
      ageYears: 28,
      checks: allChecks,
    },
    "2026-10-23",
  );
  assert.equal(validTitan.candidateRankId, "titan");
  assert.equal(validTitan.requiresVideoForTier, true);
  assert.equal(validTitan.verificationState, "self-reported-video-tier-locked");
  assert.equal(validTitan.officialRankId, null);
});

test("Nutrition & Training Tools: exact formulas, blank rejection, and zero invented sessions", () => {
  assert.throws(() =>
    calculateEnergyPlan({ weight: "", height: "180", age: "28" }),
  );

  const energy = calculateEnergyPlan({
    weight: "80",
    unit: "kg",
    height: "180",
    heightUnit: "cm",
    age: "30",
    sex: "male",
    activity: "moderate",
    goal: "maintain",
  });
  // Mifflin-St Jeor: 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
  assert.equal(energy.bmr, 1780);
  assert.equal(energy.tdee, Math.round(1780 * 1.55));
  assert.equal(energy.targetCalories, Math.round(1780 * 1.55));

  const macros = calculateMacroPlan({
    weight: "80",
    unit: "kg",
    calories: "2750",
    proteinPerKg: "2.0",
    fatPercent: "25",
    meals: "4",
  });
  assert.equal(macros.proteinG, 160);
  assert.equal(macros.meals, 4);
  assert.equal(macros.perMeal.proteinG, 40);

  const meal = validateMealEntry({
    name: "Post-workout meal",
    proteinG: "45",
    carbsG: "70",
    fatG: "12",
  });
  assert.equal(meal.calories, 45 * 4 + 70 * 4 + 12 * 9);
  assert.equal(summarizeMeals([meal]).calories, meal.calories);

  const hyd = calculateHydrationReference({
    weight: "80",
    unit: "kg",
    trainingMinutes: "60",
  });
  assert.equal(hyd.totalLiters, 3.4);

  const setup = calculateBarbellSetup({ targetLoad: "140", unit: "kg" });
  assert.equal(setup.actualLoad, 140);
  assert.equal(setup.exact, true);
  assert.deepEqual(setup.platesPerSide, [
    { weight: 25, count: 2 },
    { weight: 10, count: 1 },
  ]);
  assert.ok(setup.warmups.length >= 3);

  const emptyStats = analyzeWorkouts([], "2026-10-23");
  assert.equal(emptyStats.totalSessions, 0);
  assert.equal(emptyStats.weeklySessions, 0);
  assert.equal(emptyStats.weeklyKgVolume, 0);
  assert.equal(emptyStats.trainingBest.squat, null);
});
