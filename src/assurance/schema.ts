import type { ControlDecision } from "../controls/types.js";
import type { EvidenceReference, VerificationEvidence } from "../verification/types.js";
import type { TrajectoryFinding } from "../trajectory/types.js";
import type { ValidationResult } from "../validation/types.js";

/** A non-composite view of the evidence available for one execution. */
export interface AssuranceReport {
  runId: string;
  controls: {
    decisions: ControlDecision[];
    blockedActions: number;
  };
  verification: {
    evidence: VerificationEvidence[];
    allRequiredClaimsVerified: boolean;
  };
  validation: {
    results: ValidationResult[];
  };
  trajectory: {
    status: "acceptable" | "unacceptable" | "unknown";
    findings: TrajectoryFinding[];
  };
  outcome: {
    status: "success" | "failure" | "unknown";
    evidence: EvidenceReference[];
  };
  residualRisk: ResidualRisk[];
}

export interface ResidualRisk {
  description: string;
  severity?: "low" | "medium" | "high" | "unknown";
}
