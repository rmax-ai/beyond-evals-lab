import type { AgentRun } from "../domain/types.js";
import type { EvalCase } from "../eval/types.js";
import type { EvidenceReference } from "../verification/types.js";

export interface ValidationResult {
  rule: string;
  status: "pass" | "fail" | "unknown";
  explanation: string;
  evidence: EvidenceReference[];
}

export interface Validator {
  validate(run: AgentRun, evalCase?: EvalCase): Promise<ValidationResult[]>;
}
