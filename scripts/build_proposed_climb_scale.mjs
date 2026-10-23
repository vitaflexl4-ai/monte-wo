// Deterministic generator for MONTE WO Proposed Climb Scale Standard v0.1.
// Produces candidate bodyweight-lookup-v1 tables compatible with server/strength/engine.js.
// Status is explicitly "proposed" and purpose is "candidate-preview" so production
// publishing gates in server/strength/engine.js remain locked until owner approval.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateModel, RANK_IDS } from "../server/strength/engine.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BODYWEIGHT_NODES_KG = [35, 43, 47, 52, 59, 66, 74, 83, 93, 105, 120, 140, 165, 180];
const UG_PER_KG = 1_000_000_000n;

const RANK_LADDER = [
  {
    id: "debitan",
    ordinal: 1,
    name: "Debitan",
    color: "#c1c9d3",
    summary: "The beginning. Establish a legitimate, technically sound lift.",
    tierNote: "Earned, never automatic. Requires full movement standard.",
  },
  {
    id: "bati",
    ordinal: 2,
    name: "Bati",
    color: "#efa55e",
    summary: "Build a consistent foundation of strength.",
    tierNote: "Foundational barbell strength under strict control.",
  },
  {
    id: "solid",
    ordinal: 3,
    name: "Solid",
    color: "#a0ceff",
    summary: "Demonstrate dependable, repeatable performance.",
    tierNote: "Established gym strength with zero form compromise.",
  },
  {
    id: "fo",
    ordinal: 4,
    name: "Fò",
    color: "#4aaaff",
    summary: "Show substantial strength beyond the foundation.",
    tierNote: "Strong intermediate standard across bodyweight classes.",
  },
  {
    id: "avanse",
    ordinal: 5,
    name: "Avanse",
    color: "#2bdcde",
    summary: "Reach an advanced level of strength.",
    tierNote: "Serious competitive-caliber training strength.",
  },
  {
    id: "met",
    ordinal: 6,
    name: "Mèt",
    color: "#bb71fa",
    summary: "Demonstrate exceptional strength and control.",
    tierNote: "Mastery of heavy load and strict technical execution.",
  },
  {
    id: "chanpyon",
    ordinal: 7,
    name: "Chanpyon",
    color: "#ffac45",
    summary: "Achieve a highly demanding strength standard.",
    tierNote: "Candidate verification floor: video review required once active.",
  },
  {
    id: "titan",
    ordinal: 8,
    name: "Titan",
    color: "#ff4055",
    summary: "Reach an elite level of performance.",
    tierNote: "Rare national/international raw drug-tested strength territory.",
  },
  {
    id: "lejand",
    ordinal: 9,
    name: "Lejand",
    color: "#f7d354",
    summary: "The highest distinction; extremely difficult to earn.",
    tierNote: "World-class raw standard. Reserved for extraordinary lifts.",
  },
];

// Reference anchors in kg:
// - Male / Open ("unclassified") anchored at 83 kg bodyweight
// - Female anchored at 66 kg bodyweight
// Scaled across bodyweight nodes via damped allometric exponent b (0.60 - 0.67),
// rounded to 0.5 kg with strict monotonicity across both rank and bodyweight.
const DISCIPLINE_SPECS = [
  {
    discipline: "squat",
    name: "Barbell Squat",
    shortName: "Squat",
    rulebookId: "squat-standard-draft-1",
    variation: "barbell-back-squat",
    equipmentLabel: "Raw Barbell (no wraps/suit)",
    exponent: 0.67,
    anchors: {
      male: { refBw: 83, loadsKg: [62.5, 85, 110, 137.5, 165, 192.5, 222.5, 255, 290], minBarKg: 20 },
      female: { refBw: 66, loadsKg: [37.5, 52.5, 67.5, 85, 105, 125, 147.5, 172.5, 200], minBarKg: 15 },
    },
  },
  {
    discipline: "bench",
    name: "Barbell Bench Press",
    shortName: "Bench Press",
    rulebookId: "bench-standard-draft-1",
    variation: "paused-barbell-bench",
    equipmentLabel: "Raw Flat Bench · Motionless Chest Pause",
    exponent: 0.67,
    anchors: {
      male: { refBw: 83, loadsKg: [45, 62.5, 82.5, 102.5, 122.5, 142.5, 165, 187.5, 212.5], minBarKg: 20 },
      female: { refBw: 66, loadsKg: [25, 35, 45, 57.5, 70, 82.5, 97.5, 115, 132.5], minBarKg: 15 },
    },
  },
  {
    discipline: "deadlift",
    name: "Barbell Deadlift",
    shortName: "Deadlift",
    rulebookId: "deadlift-standard-draft-1",
    variation: "conventional-deadlift",
    equipmentLabel: "Conventional Stance · Raw · No Straps",
    exponent: 0.65,
    anchors: {
      male: { refBw: 83, loadsKg: [77.5, 105, 135, 167.5, 197.5, 227.5, 260, 295, 332.5], minBarKg: 25 },
      female: { refBw: 66, loadsKg: [50, 67.5, 87.5, 107.5, 130, 152.5, 177.5, 205, 235], minBarKg: 20 },
    },
  },
  {
    discipline: "curl",
    name: "Strict Biceps Curl",
    shortName: "Strict Curl",
    rulebookId: "curl-standard-draft-1",
    variation: "wall-strict-straight-bar-curl",
    equipmentLabel: "Straight Bar · 3-Point Wall Contact",
    exponent: 0.60,
    anchors: {
      male: { refBw: 83, loadsKg: [25, 32.5, 40, 47.5, 56, 65, 75, 86, 98.5], minBarKg: 15 },
      female: { refBw: 66, loadsKg: [15, 20, 25, 30.5, 36.5, 43, 50, 58, 67], minBarKg: 10 },
    },
  },
];

function roundHalfKg(value) {
  return Math.round(value * 2) / 2;
}

function kgToUgString(kg) {
  const thousandths = BigInt(Math.round(kg * 1000));
  return (thousandths * (UG_PER_KG / 1000n)).toString();
}

function buildNodes(anchor, exponent) {
  const { refBw, loadsKg, minBarKg } = anchor;
  let prevLoads = null;
  return BODYWEIGHT_NODES_KG.map((bw) => {
    const scale = Math.pow(bw / refBw, exponent);
    const current = [];
    for (let i = 0; i < 9; i++) {
      let val = roundHalfKg(Math.max(minBarKg, loadsKg[i] * scale));
      if (i > 0 && val <= current[i - 1]) {
        val = roundHalfKg(current[i - 1] + 2.5);
      }
      if (prevLoads && val <= prevLoads[i]) {
        val = roundHalfKg(prevLoads[i] + 0.5);
      }
      if (i > 0 && val <= current[i - 1]) {
        val = roundHalfKg(current[i - 1] + 1.0);
      }
      current.push(val);
    }
    prevLoads = current;
    return {
      bodyweightKg: bw,
      bodyweightUg: (BigInt(bw) * UG_PER_KG).toString(),
      thresholdsKg: current,
      thresholdsUg: current.map(kgToUgString),
    };
  });
}

const models = DISCIPLINE_SPECS.map((spec) => {
  const maleNodes = buildNodes(spec.anchors.male, spec.exponent);
  const femaleNodes = buildNodes(spec.anchors.female, spec.exponent);
  const stripForEngine = (nodes) =>
    nodes.map(({ bodyweightUg, thresholdsUg }) => ({ bodyweightUg, thresholdsUg }));

  const model = {
    id: `${spec.discipline}-model-proposed-v0.1`,
    discipline: spec.discipline,
    version: "proposed-v0.1",
    purpose: "candidate-preview",
    status: "proposed",
    rulebookId: spec.rulebookId,
    normalization: "bodyweight-lookup-v1",
    estimate: null,
    requireVerifiedFrom: "chanpyon",
    categories: [
      {
        sexCategory: "male",
        label: "Male reference",
        minAge: 18,
        maxAge: 100,
        nodes: stripForEngine(maleNodes),
      },
      {
        sexCategory: "female",
        label: "Female reference",
        minAge: 18,
        maxAge: 100,
        nodes: stripForEngine(femaleNodes),
      },
      {
        sexCategory: "unclassified",
        label: "Open reference",
        minAge: 18,
        maxAge: 100,
        nodes: stripForEngine(maleNodes),
      },
    ],
    evidence: {
      dataset:
        "Proposed candidate curve anchored to raw drug-tested powerlifting class benchmarks (IPF weight-class spine 47-120+ kg) and strict straight-bar curl ratios; awaiting formal cohort calibration.",
      license: "Internal MONTE WO v0.1 engineering proposal — not published as official.",
      calibrationReport: "docs/MONTE-WO-REINVENTION-STANDARD-v0.1.md",
      holdoutReport: "Pending athlete-split holdout study before production sign-off.",
      biasReport: "Damped allometric scaling (b=0.60..0.67) prevents linear bodyweight bias; subgroup fairness audit required.",
      rankMeaningReport: "Debitan through Lejand monotonic 9-tier progression with widening elite intervals.",
      population: "Adults 18-100, bodyweight 35-180 kg (77.2-396.8 lb).",
      limitations:
        "PROPOSED STANDARD v0.1 (UNAPPROVED PREVIEW). Does not award official or MONTE Verified ranks.",
    },
  };

  // Prove compatibility with the protected strength engine schema
  validateModel(model, { complete: false });
  if (RANK_IDS.length !== 9) throw new Error("Unexpected RANK_IDS count");

  return {
    ...spec,
    model,
    previewTables: {
      male: maleNodes,
      female: femaleNodes,
    },
  };
});

const output = {
  schema: "monte-wo-proposed-climb-scale-v0.1",
  version: "proposed-v0.1",
  status: "proposed",
  officialAwardsEnabled: false,
  generatedOn: "2026-10-23",
  disclosure:
    "PROPOSED STANDARD v0.1 (UNAPPROVED PREVIEW). Thresholds are bodyweight-adjusted candidate targets for review and self-reported progress tracking. Official MONTE Verified ranks remain locked until owner sign-off and reviewer activation.",
  supportedBodyweightKg: { min: 35, max: 180 },
  supportedAgeYears: { min: 18, max: 100 },
  ranks: RANK_LADDER,
  disciplines: models.map((m) => ({
    id: m.discipline,
    name: m.name,
    shortName: m.shortName,
    variation: m.variation,
    equipmentLabel: m.equipmentLabel,
    exponent: m.exponent,
    rulebookId: m.rulebookId,
    model: m.model,
  })),
};

const proposalDir = path.join(root, "content/strength-proposals");
fs.mkdirSync(proposalDir, { recursive: true });
const proposalPath = path.join(proposalDir, "climb-scale-proposed-v0.1.json");
const mobileCopyPath = path.join(root, "apps/mobile/src/climb-scale-data.json");

const jsonText = JSON.stringify(output, null, 2) + "\n";
fs.writeFileSync(proposalPath, jsonText);
fs.writeFileSync(mobileCopyPath, jsonText);

console.log("Generated MONTE WO Proposed Climb Scale v0.1:");
for (const m of models) {
  const m83 = m.previewTables.male.find((n) => n.bodyweightKg === 83);
  const f66 = m.previewTables.female.find((n) => n.bodyweightKg === 66);
  console.log(`  ${m.name} (Male 83kg):   ${m83.thresholdsKg.join(" / ")} kg`);
  console.log(`  ${m.name} (Female 66kg): ${f66.thresholdsKg.join(" / ")} kg`);
}
