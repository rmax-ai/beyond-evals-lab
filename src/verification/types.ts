import type { AgentRun, WorldState } from "../domain/types.js";

export interface VerificationEvidence {
  claim: string;
  status: "verified" | "failed" | "unknown";
  evidence: EvidenceReference[];
  confidence: "deterministic" | "high" | "medium" | "low";
  verifier: string;
}

export interface EvidenceReference {
  type: "world_state" | "trace_event" | "control_decision" | "derived";
  reference: string;
  value?: unknown;
}

export interface RefundExpectation {
  transactionId: string;
  amountCents: number;
  auditRequired: boolean;
}

export interface Verifier {
  verify(run: AgentRun, resultingState: WorldState): Promise<VerificationEvidence[]>;
}
