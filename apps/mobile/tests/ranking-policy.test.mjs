import test from "node:test";
import assert from "node:assert/strict";
import {
  decideRank,
  RANK_LADDER,
  RANK_DISCIPLINES,
} from "../src/ranking-policy.ts";

const thresholds = [20, 40, 60, 80, 100, 120, 140, 160, 180];
const approved = {
  version: "test-approved-v1",
  approved: true,
  thresholdsKgByDiscipline: {
    squat: thresholds,
    bench: thresholds,
    deadlift: thresholds,
    curl: thresholds,
  },
};
const verified = {
  discipline: "squat",
  evidenceStatus: "verified",
  standardVersion: "test-approved-v1",
  liftKg: 100,
  reviewerApproved: true,
  techniqueApproved: true,
};

test("ladder and supported disciplines stay explicit", () => {
  assert.deepEqual(RANK_LADDER, ["Debitan", "Bati", "Solid", "Fô", "Avanse", "Mèt", "Chanpyon", "Titan", "Lejand"]);
  assert.deepEqual(RANK_DISCIPLINES, ["squat", "bench", "deadlift", "curl"]);
});

test("estimated and self-reported lifts never earn a verified rank", () => {
  for (const evidenceStatus of ["estimated", "self_reported"]) {
    assert.equal(decideRank({ ...verified, evidenceStatus }, approved).status, "pending");
  }
});

test("unknown disciplines and invalid loads fail closed", () => {
  assert.equal(decideRank({ ...verified, discipline: "snatch" }, approved).status, "ineligible");
  for (const liftKg of [0, -1, NaN, Infinity, null]) {
    assert.equal(decideRank({ ...verified, liftKg }, approved).status, "ineligible");
  }
});

test("reviewer and technique approvals are both required", () => {
  assert.equal(decideRank({ ...verified, reviewerApproved: false }, approved).status, "pending");
  assert.equal(decideRank({ ...verified, techniqueApproved: false }, approved).status, "pending");
  assert.equal(decideRank({ ...verified, reviewerApproved: true, techniqueApproved: true }, approved).status, "ranked");
});

test("missing, unapproved, or version-mismatched standards never rank", () => {
  assert.equal(decideRank(verified, null).status, "pending");
  assert.equal(decideRank(verified, { ...approved, approved: false }).status, "pending");
  assert.equal(decideRank({ ...verified, standardVersion: "old" }, approved).status, "pending");
});

test("missing, incomplete, nonpositive, nonfinite, and non-increasing thresholds fail closed", () => {
  const cases = [
    {},
    { squat: thresholds.slice(0, 8) },
    { squat: [0, ...thresholds.slice(1)] },
    { squat: [20, 40, 60, 80, 100, 120, 140, 160, Infinity] },
    { squat: [20, 40, 60, 80, 100, 120, 140, 160, 150] },
  ];
  for (const thresholdsKgByDiscipline of cases) {
    assert.equal(
      decideRank(verified, { ...approved, thresholdsKgByDiscipline }).status,
      "pending",
    );
  }
});

test("each threshold boundary maps to the expected rank, and below-first remains pending", () => {
  assert.equal(decideRank({ ...verified, liftKg: 19.99 }, approved).status, "pending");
  for (let i = 0; i < thresholds.length; i++) {
    const result = decideRank({ ...verified, liftKg: thresholds[i] }, approved);
    assert.deepEqual(result, {
      status: "ranked",
      rank: RANK_LADDER[i],
      standardVersion: "test-approved-v1",
    });
  }
  assert.equal(decideRank({ ...verified, liftKg: 179.99 }, approved).status, "ranked");
  assert.equal(decideRank({ ...verified, liftKg: 180 }, approved).status, "ranked");
});

test("standards are discipline-specific; no missing discipline inherits another's cutoffs", () => {
  const onlySquat = { ...approved, thresholdsKgByDiscipline: { squat: thresholds } };
  assert.equal(decideRank({ ...verified, discipline: "bench" }, onlySquat).status, "pending");
});
