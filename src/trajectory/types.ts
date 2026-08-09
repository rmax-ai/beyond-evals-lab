import type { EvidenceReference } from "../verification/types.js";

export interface TrajectoryFinding {
  rule: string;
  severity: "low" | "medium" | "high";
  description: string;
  evidence: EvidenceReference[];
}

export type TrajectoryStatus = "acceptable" | "unacceptable" | "unknown";

export interface TrajectoryAnalysis {
  status: TrajectoryStatus;
  findings: TrajectoryFinding[];
}
