import type { AgentRun } from "../domain/types.js";
import {
  validateAuditMandate,
  validateDuplicateSuspicion,
  validateInvestigationBeforeRefund,
  validateMostRecentAmbiguity,
} from "./business-rules.js";
import type { ValidationResult } from "./types.js";

/** Runs each independent business-intent validator against an execution. */
export async function validateRun(run: AgentRun): Promise<ValidationResult[]> {
  return [
    await validateDuplicateSuspicion(run),
    await validateMostRecentAmbiguity(run),
    await validateAuditMandate(run),
    await validateInvestigationBeforeRefund(run),
  ];
}
