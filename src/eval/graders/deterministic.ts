import { verifyRefundOutcome } from "../../verification/verify-refund-outcome.js";

import type { Grader, Grade } from "./grader.js";
import type { AgentRun } from "../../domain/types.js";
import type { EvalCase } from "../types.js";
import type { EvidenceReference, VerificationEvidence } from "../../verification/types.js";

/** Uses the runtime verifier as deterministic evidence over an eval population. */
export class RefundOutcomeGrader implements Grader {
  name = "refund-outcome-grader";

  async grade(run: AgentRun, task: EvalCase): Promise<Grade> {
    if (task.expectations.outcome === undefined) {
      return {
        grader: this.name,
        dimension: "outcome",
        status: "unknown",
        evidence: [],
        explanation: "This case has no refund outcome expectation.",
      };
    }
    const evidence = await verifyRefundOutcome(run, run.finalState, task.expectations.outcome);
    return {
      grader: this.name,
      dimension: "outcome",
      status: evidence.every((item) => item.status === "verified") ? "pass" : "fail",
      evidence: flattenEvidence(evidence),
    };
  }
}

function flattenEvidence(evidence: VerificationEvidence[]): EvidenceReference[] {
  return evidence.flatMap((item) => item.evidence);
}
