export const CLIMB_RANK_IDS: readonly string[];
export const CLIMB_DISCIPLINES: readonly string[];

export class ClimbScaleError extends Error {
  code: string;
  constructor(code: string, message?: string);
}

export type RationalUg = { n: bigint; d: bigint };

export type ClimbRung = {
  id: string;
  ordinal: number;
  name: string;
  color: string;
  summary: string;
  tierNote: string;
  exactUg: RationalUg;
  requiredKg: number;
  requiredLb: number;
  bwMultiple: number;
  requiresVideoForTier: boolean;
  deltaKg?: number;
  deltaLb?: number;
};

export type InterpolatedLadderResult =
  | {
      ok: false;
      code: string;
      message: string;
    }
  | {
      ok: true;
      standardVersion: string;
      status: "proposed";
      officialAwardsEnabled: false;
      discipline: string;
      disciplineName: string;
      variation: string;
      equipmentLabel: string;
      sexCategory: "male" | "female" | "unclassified";
      bodyweightKg: number;
      bodyweightLb: number;
      bodyweightUg: RationalUg;
      rungs: ClimbRung[];
    };

export type ProposedAttemptInput = {
  discipline: string;
  load: string;
  unit: "kg" | "lb";
  reps: number;
  resultType?: "tested" | "estimated";
  performedOn: string;
  bodyweight: string;
  bodyweightUnit?: "kg" | "lb";
  sexCategory?: "male" | "female" | "unclassified";
  ageYears?: number;
  checks: Record<string, boolean>;
};

export type ProposedAttemptEvaluation = {
  status:
    | "failed-technique"
    | "training-estimate-only"
    | "below-debitan"
    | "self-reported-candidate";
  standardVersion: string;
  discipline: string;
  officialRankId: null;
  verifiedRankId: null;
  candidateRankId: string | null;
  candidateRankName?: string;
  candidateOrdinal?: number;
  trainingEstimateRankId?: string | null;
  requiresVideoForTier?: boolean;
  verificationState:
    | "disqualified-technique"
    | "estimate-not-eligible"
    | "self-reported-unverified"
    | "self-reported-video-tier-locked";
  failedChecks?: string[];
  performedKg?: number;
  performedLb?: number;
  estimatedKg?: number;
  estimatedLb?: number;
  bwMultiple?: number;
  progressPercent: number | null;
  nextRung: ClimbRung | null;
  explanation: string;
};

export function parseRationalUg(value: string | number, unit: "kg" | "lb"): RationalUg;
export function compareRational(a: RationalUg, b: RationalUg): -1 | 0 | 1;
export function subtractRational(a: RationalUg, b: RationalUg): RationalUg;
export function ceilTenthsInUnit(rationalUg: RationalUg, unit: "kg" | "lb"): number;
export function roundTenthsInUnit(rationalUg: RationalUg, unit: "kg" | "lb"): number;
export function ratioMultiple(loadUg: RationalUg, bwUg: RationalUg): number;
export function interpolateDisciplineLadder(
  proposalData: any,
  disciplineId: string,
  profile: {
    bodyweight?: string;
    unit?: "kg" | "lb";
    sexCategory?: string;
    ageYears?: number | string;
  },
): InterpolatedLadderResult;
export function evaluateProposedAttempt(
  proposalData: any,
  rulebook: any,
  attempt: ProposedAttemptInput,
  todayStr?: string,
): ProposedAttemptEvaluation;
