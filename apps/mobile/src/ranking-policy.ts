/**
 * MONTE WO ranking policy boundary.
 *
 * This module deliberately does not define numerical cutoffs. The numeric
 * standard table is a separately reviewed, versioned artifact. Until a
 * standards version is approved and supplied, the correct outcome is pending.
 */
export const RANK_STANDARD_VERSION = "0.1-draft";

export const RANK_LADDER = [
  "Debitan", "Bati", "Solid", "Fô", "Avanse", "Mèt", "Chanpyon", "Titan", "Lejand",
] as const;

export const RANK_DISCIPLINES = ["squat", "bench", "deadlift", "curl"] as const;
export type RankDiscipline = (typeof RANK_DISCIPLINES)[number];
export type EvidenceStatus = "self_reported" | "estimated" | "verified";
export type RankDecision =
  | { status: "pending"; reason: string }
  | { status: "ineligible"; reason: string }
  | { status: "ranked"; rank: string; standardVersion: string };

export type RankEvidence = {
  discipline: string;
  evidenceStatus: EvidenceStatus;
  standardVersion?: string | null;
  liftKg?: number | null;
  bodyMassKg?: number | null;
  techniqueApproved?: boolean;
  reviewerApproved?: boolean;
};

/**
 * Resolve a rank only against an explicitly supplied, approved standards table.
 * Each threshold is a minimum qualifying load in kg for this discipline and
 * policy category. No estimate or self-report can produce a verified rank.
 */
export function decideRank(
  evidence: RankEvidence,
  approvedStandards: {
    version: string;
    approved: boolean;
    thresholdsKgByDiscipline: Partial<Record<RankDiscipline, number[]>>;
  } | null,
): RankDecision {
  if (!RANK_DISCIPLINES.includes(evidence.discipline as RankDiscipline)) {
    return { status: "ineligible", reason: "Unknown discipline." };
  }
  if (evidence.evidenceStatus !== "verified") {
    return {
      status: "pending",
      reason: evidence.evidenceStatus === "estimated"
        ? "Estimated lifts cannot earn a verified rank."
        : "Self-reported lifts require verification.",
    };
  }
  if (!evidence.reviewerApproved || !evidence.techniqueApproved) {
    return { status: "pending", reason: "Evidence and technique review are required." };
  }
  if (!approvedStandards || !approvedStandards.approved) {
    return { status: "pending", reason: "No approved numerical standard is active." };
  }
  if (evidence.standardVersion !== approvedStandards.version) {
    return { status: "pending", reason: "Evidence must be assessed against the active standard version." };
  }
  const load = evidence.liftKg;
  const thresholds = approvedStandards.thresholdsKgByDiscipline[evidence.discipline as RankDiscipline];
  if (!Number.isFinite(load) || (load as number) <= 0) {
    return { status: "ineligible", reason: "A positive, validated lift load is required." };
  }
  if (!thresholds || thresholds.length !== RANK_LADDER.length ||
      thresholds.some((n) => !Number.isFinite(n) || n <= 0) ||
      thresholds.some((n, i) => i > 0 && n <= thresholds[i - 1])) {
    return { status: "pending", reason: "The active discipline thresholds are missing or invalid." };
  }
  let index = -1;
  thresholds.forEach((threshold, i) => { if ((load as number) >= threshold) index = i; });
  if (index < 0) return { status: "pending", reason: "The verified lift has not reached the first rank threshold." };
  return { status: "ranked", rank: RANK_LADDER[index], standardVersion: approvedStandards.version };
}
