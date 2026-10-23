// Exact BigInt rational evaluator for MONTE WO Proposed Climb Scale v0.1.
// Mirrors server/strength/engine.js arithmetic without modifying protected files.
// Official/verified awards are strictly locked (officialRankId: null) while v0.1 is proposed.

export const CLIMB_RANK_IDS = [
  "debitan",
  "bati",
  "solid",
  "fo",
  "avanse",
  "met",
  "chanpyon",
  "titan",
  "lejand",
];

export const CLIMB_DISCIPLINES = ["squat", "bench", "deadlift", "curl"];

const UG_PER_KG_NUM = 1_000_000_000n;
const UG_PER_LB_NUM = 453_592_370n; // exact 0.45359237 kg in micrograms

export class ClimbScaleError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

export function parseRationalUg(value, unit) {
  if (unit !== "kg" && unit !== "lb") {
    throw new ClimbScaleError("invalid-unit", "Choose kg or lb.");
  }
  const str = String(value ?? "").trim();
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(str)) {
    throw new ClimbScaleError(
      "invalid-decimal",
      "Enter a positive weight with up to 3 decimal places.",
    );
  }
  const [whole, frac = ""] = str.split(".");
  const thousandths = BigInt(whole) * 1000n + BigInt((frac + "000").slice(0, 3));
  if (thousandths <= 0n) {
    throw new ClimbScaleError("non-positive-mass", "Weight must be greater than zero.");
  }
  if (unit === "kg") {
    return { n: thousandths * 1_000_000n, d: 1n };
  }
  // thousandths of lb * 453,592,370 ug/lb / 1000 = thousandths * 45,359,237 / 100 ug
  return { n: thousandths * 45_359_237n, d: 100n };
}

export function compareRational(a, b) {
  const lhs = a.n * b.d;
  const rhs = b.n * a.d;
  return lhs > rhs ? 1 : lhs < rhs ? -1 : 0;
}

export function subtractRational(a, b) {
  return { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
}

// Ceiling to 0.1 in target unit so lifting the displayed required load always qualifies.
export function ceilTenthsInUnit(rationalUg, unit) {
  // 0.1 unit in micrograms = unitUg / 10
  const tenthUgNum = unit === "kg" ? UG_PER_KG_NUM : UG_PER_LB_NUM;
  // ceil( (n / d) / (tenthUgNum / 10) ) = ceil( (n * 10) / (d * tenthUgNum) )
  const num = rationalUg.n * 10n;
  const den = rationalUg.d * tenthUgNum;
  const tenths = (num + den - 1n) / den;
  return Number(tenths) / 10;
}

export function roundTenthsInUnit(rationalUg, unit) {
  const tenthUgNum = unit === "kg" ? UG_PER_KG_NUM : UG_PER_LB_NUM;
  const num = rationalUg.n * 10n * 2n + rationalUg.d * tenthUgNum;
  const den = rationalUg.d * tenthUgNum * 2n;
  return Number(num / den) / 10;
}

export function ratioMultiple(loadUg, bwUg) {
  // Floor/round to 2 decimal places: (load.n * bw.d) / (load.d * bw.n)
  const num = loadUg.n * bwUg.d * 100n * 2n + loadUg.d * bwUg.n;
  const den = loadUg.d * bwUg.n * 2n;
  return Number(num / den) / 100;
}

export function interpolateDisciplineLadder(proposalData, disciplineId, profile) {
  if (!CLIMB_DISCIPLINES.includes(disciplineId)) {
    throw new ClimbScaleError("invalid-discipline", "Unknown discipline.");
  }
  const disc = proposalData?.disciplines?.find((d) => d.id === disciplineId);
  if (!disc) {
    throw new ClimbScaleError("missing-discipline", "Discipline proposal not found.");
  }
  if (!profile || String(profile.bodyweight ?? "").trim() === "") {
    return {
      ok: false,
      code: "missing-bodyweight",
      message:
        "Enter your bodyweight above to compute bodyweight-adjusted Climb Scale targets.",
    };
  }
  const sexCategory = ["male", "female", "unclassified"].includes(profile.sexCategory)
    ? profile.sexCategory
    : "unclassified";
  const ageYears = profile.ageYears === undefined || profile.ageYears === ""
    ? 25
    : Number(profile.ageYears);
  if (!Number.isInteger(ageYears) || ageYears < 18 || ageYears > 100) {
    return {
      ok: false,
      code: "unsupported-age",
      message: "MONTE WO strength standards support adult athletes aged 18–100.",
    };
  }

  let bw;
  try {
    bw = parseRationalUg(profile.bodyweight, profile.unit || "kg");
  } catch (err) {
    return {
      ok: false,
      code: err.code || "invalid-bodyweight",
      message: err.message || "Enter a valid bodyweight.",
    };
  }

  const category = disc.model.categories.find(
    (c) => c.sexCategory === sexCategory && ageYears >= c.minAge && ageYears <= c.maxAge,
  );
  if (!category) {
    return {
      ok: false,
      code: "unsupported-category",
      message: "No candidate curve covers this reference category and age.",
    };
  }

  let pair = null;
  for (let i = 1; i < category.nodes.length; i++) {
    const loNode = { n: BigInt(category.nodes[i - 1].bodyweightUg), d: 1n };
    const hiNode = { n: BigInt(category.nodes[i].bodyweightUg), d: 1n };
    if (compareRational(bw, loNode) >= 0 && compareRational(hiNode, bw) >= 0) {
      pair = [category.nodes[i - 1], category.nodes[i]];
      break;
    }
  }
  if (!pair) {
    return {
      ok: false,
      code: "bodyweight-outside-proposal-range",
      message:
        "Proposed Standard v0.1 covers 35–180 kg (77.2–396.8 lb) without extrapolation.",
    };
  }

  const [a, b] = pair;
  const lo = BigInt(a.bodyweightUg);
  const span = BigInt(b.bodyweightUg) - lo;
  const verifyFloorIndex = CLIMB_RANK_IDS.indexOf(disc.model.requireVerifiedFrom);

  const rungs = a.thresholdsUg.map((v, idx) => {
    const vLo = BigInt(v);
    const vHi = BigInt(b.thresholdsUg[idx]);
    const exactUg = {
      n: vLo * span * bw.d + (vHi - vLo) * (bw.n - lo * bw.d),
      d: span * bw.d,
    };
    const meta = proposalData.ranks[idx];
    return {
      id: meta.id,
      ordinal: meta.ordinal,
      name: meta.name,
      color: meta.color,
      summary: meta.summary,
      tierNote: meta.tierNote,
      exactUg,
      requiredKg: ceilTenthsInUnit(exactUg, "kg"),
      requiredLb: ceilTenthsInUnit(exactUg, "lb"),
      bwMultiple: ratioMultiple(exactUg, bw),
      requiresVideoForTier: idx >= verifyFloorIndex,
    };
  });

  return {
    ok: true,
    standardVersion: proposalData.version,
    status: "proposed",
    officialAwardsEnabled: false,
    discipline: disc.id,
    disciplineName: disc.name,
    variation: disc.variation,
    equipmentLabel: disc.equipmentLabel,
    sexCategory,
    bodyweightKg: roundTenthsInUnit(bw, "kg"),
    bodyweightLb: roundTenthsInUnit(bw, "lb"),
    bodyweightUg: bw,
    rungs,
  };
}

export function evaluateProposedAttempt(proposalData, rulebook, attempt, todayStr) {
  if (!rulebook || attempt?.discipline !== rulebook.discipline) {
    throw new ClimbScaleError("invalid-discipline", "Discipline mismatch.");
  }
  const load = parseRationalUg(attempt.load, attempt.unit || "kg");
  const maxLoadUg = { n: 1000n * UG_PER_KG_NUM, d: 1n };
  if (compareRational(load, maxLoadUg) > 0) {
    throw new ClimbScaleError("invalid-load", "Load exceeds 1000 kg software support limit.");
  }

  const reps = Number(attempt.reps);
  if (!Number.isInteger(reps) || reps < 1 || reps > 10) {
    throw new ClimbScaleError("invalid-reps", "Repetitions must be a whole number from 1 to 10.");
  }
  const resultType = attempt.resultType || (reps === 1 ? "tested" : "estimated");
  if (!["tested", "estimated"].includes(resultType)) {
    throw new ClimbScaleError("invalid-result-type", "Choose tested single or estimated.");
  }
  if (resultType === "tested" && reps !== 1) {
    throw new ClimbScaleError(
      "tested-requires-single",
      "A tested Climb Scale attempt must be 1 repetition.",
    );
  }
  if (resultType === "estimated" && reps < 2) {
    throw new ClimbScaleError(
      "estimate-requires-multi-rep",
      "Estimated 1RM requires 2–10 repetitions.",
    );
  }

  const performedOn = String(attempt.performedOn ?? "").trim();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(performedOn) ||
    Number.isNaN(Date.parse(performedOn)) ||
    new Date(performedOn).toISOString().slice(0, 10) !== performedOn ||
    performedOn < "1900-01-01" ||
    (todayStr && performedOn > todayStr)
  ) {
    throw new ClimbScaleError("invalid-date", "Enter a valid non-future date (YYYY-MM-DD).");
  }

  const ladder = interpolateDisciplineLadder(proposalData, attempt.discipline, {
    bodyweight: attempt.bodyweight,
    unit: attempt.bodyweightUnit || attempt.unit || "kg",
    sexCategory: attempt.sexCategory || "unclassified",
    ageYears: attempt.ageYears ?? 25,
  });
  if (!ladder.ok) {
    throw new ClimbScaleError(ladder.code, ladder.message);
  }

  const failedChecks = (rulebook.checks || [])
    .filter((c) => attempt.checks?.[c.id] !== true)
    .map((c) => c.id);

  if (failedChecks.length > 0) {
    return {
      status: "failed-technique",
      standardVersion: proposalData.version,
      discipline: attempt.discipline,
      officialRankId: null,
      verifiedRankId: null,
      candidateRankId: null,
      verificationState: "disqualified-technique",
      failedChecks,
      performedKg: roundTenthsInUnit(load, "kg"),
      performedLb: roundTenthsInUnit(load, "lb"),
      progressPercent: null,
      nextRung: ladder.rungs[0],
      explanation:
        "Strict technique rule: all movement standard checks must pass. A heavy lift with incomplete depth, pause, lockout, or wall contact does not count.",
    };
  }

  if (resultType === "estimated") {
    const epleyUg = { n: load.n * BigInt(30 + reps), d: load.d * 30n };
    let approachIdx = -1;
    ladder.rungs.forEach((r, idx) => {
      if (compareRational(epleyUg, r.exactUg) >= 0) approachIdx = idx;
    });
    return {
      status: "training-estimate-only",
      standardVersion: proposalData.version,
      discipline: attempt.discipline,
      officialRankId: null,
      verifiedRankId: null,
      candidateRankId: null,
      trainingEstimateRankId: approachIdx >= 0 ? CLIMB_RANK_IDS[approachIdx] : null,
      verificationState: "estimate-not-eligible",
      estimatedKg: roundTenthsInUnit(epleyUg, "kg"),
      estimatedLb: roundTenthsInUnit(epleyUg, "lb"),
      progressPercent: null,
      nextRung: ladder.rungs[Math.min(8, Math.max(0, approachIdx + 1))],
      explanation:
        "Training estimate only (Epley). Estimated 1RMs never qualify for a rank—test a true 1-rep lift under strict movement rules.",
    };
  }

  // Validated 1-rep strict self-reported attempt against Proposed Standard v0.1
  let earnedIdx = -1;
  ladder.rungs.forEach((r, idx) => {
    if (compareRational(load, r.exactUg) >= 0) earnedIdx = idx;
  });

  const nextRung = earnedIdx < 8 ? ladder.rungs[earnedIdx + 1] : null;
  let progressPercent = 100;
  let deltaKg = 0;
  let deltaLb = 0;
  if (nextRung) {
    const floor = earnedIdx < 0 ? { n: 0n, d: 1n } : ladder.rungs[earnedIdx].exactUg;
    const earnedSpan = subtractRational(load, floor);
    const totalSpan = subtractRational(nextRung.exactUg, floor);
    const pct = Number((earnedSpan.n * totalSpan.d * 100n) / (earnedSpan.d * totalSpan.n));
    progressPercent = Math.max(0, Math.min(99, pct));
    const remaining = subtractRational(nextRung.exactUg, load);
    deltaKg = ceilTenthsInUnit(remaining, "kg");
    deltaLb = ceilTenthsInUnit(remaining, "lb");
  }

  if (earnedIdx < 0) {
    return {
      status: "below-debitan",
      standardVersion: proposalData.version,
      discipline: attempt.discipline,
      officialRankId: null,
      verifiedRankId: null,
      candidateRankId: null,
      verificationState: "self-reported-unverified",
      performedKg: roundTenthsInUnit(load, "kg"),
      performedLb: roundTenthsInUnit(load, "lb"),
      bwMultiple: ratioMultiple(load, ladder.bodyweightUg),
      progressPercent,
      nextRung: { ...nextRung, deltaKg, deltaLb },
      explanation:
        "Recorded as self-reported training baseline. Debitan requires meeting the first strict standard—ranks are earned, never automatic.",
    };
  }

  const earnedRung = ladder.rungs[earnedIdx];
  return {
    status: "self-reported-candidate",
    standardVersion: proposalData.version,
    discipline: attempt.discipline,
    officialRankId: null,
    verifiedRankId: null,
    candidateRankId: earnedRung.id,
    candidateRankName: earnedRung.name,
    candidateOrdinal: earnedRung.ordinal,
    requiresVideoForTier: earnedRung.requiresVideoForTier,
    verificationState: earnedRung.requiresVideoForTier
      ? "self-reported-video-tier-locked"
      : "self-reported-unverified",
    performedKg: roundTenthsInUnit(load, "kg"),
    performedLb: roundTenthsInUnit(load, "lb"),
    bwMultiple: ratioMultiple(load, ladder.bodyweightUg),
    progressPercent,
    nextRung: nextRung ? { ...nextRung, deltaKg, deltaLb } : null,
    explanation: earnedRung.requiresVideoForTier
      ? `Self-reported lift reaches proposed ${earnedRung.name} load (v0.1 preview), Not Verified. High tiers (Chanpyon–Lejand) require video evidence review once official standards are approved.`
      : `Self-reported lift meets proposed ${earnedRung.name} load (v0.1 preview), Not Verified. Official MONTE Verified ranks remain locked until standard sign-off.`,
  };
}
