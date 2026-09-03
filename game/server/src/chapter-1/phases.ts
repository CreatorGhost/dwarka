export const PHASES = ["arrival", "courtyard", "market", "doorway", "ending", "complete"] as const;
export type PhaseId = (typeof PHASES)[number];
export type CombatPhase = "courtyard" | "market" | "doorway";

export const PHASE_RANK: Record<PhaseId, number> = Object.fromEntries(
  PHASES.map((phase, index) => [phase, index]),
) as Record<PhaseId, number>;

export const PHASE_LABEL: Record<PhaseId, string> = {
  arrival: "Return to the quarter",
  courtyard: "Protect the courtyard family",
  market: "Clear the market bend",
  doorway: "Reach the charioteers' doorway",
  ending: "The paper sun",
  complete: "Chapter 1 complete",
};

export const CHECKPOINTS = chapterConfig.checkpoints satisfies Record<PhaseId, { x: number; y: number; z: number; yaw: number }>;

export const FAMILY_POSITIONS = chapterConfig.familyPositions satisfies Record<CombatPhase, { x: number; y: number; z: number }>;

export type EnemyKind = "skirmisher" | "archer" | "brute";

export const ROSTERS: Record<CombatPhase, EnemyKind[]> = {
  courtyard: ["skirmisher", "skirmisher", "archer"],
  market: ["skirmisher", "skirmisher", "skirmisher", "archer"],
  doorway: ["skirmisher", "skirmisher", "archer", "brute"],
};

export function isPhase(value: unknown): value is PhaseId {
  return typeof value === "string" && (PHASES as readonly string[]).includes(value);
}

export function nextPhase(phase: PhaseId): PhaseId {
  return PHASES[Math.min(PHASES.length - 1, PHASE_RANK[phase] + 1)];
}
import chapterConfig from "../../../config/chapter-1.json" with { type: "json" };
