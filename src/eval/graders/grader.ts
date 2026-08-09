import type { AgentRun } from "../../domain/types.js";
import type { EvalCase } from "../types.js";
import type { EvidenceReference } from "../../verification/types.js";

export interface Grade {
  grader: string;
  dimension: string;
  status: "pass" | "fail" | "unknown";
  score?: number;
  evidence: EvidenceReference[];
  explanation?: string;
}

export interface Grader {
  name: string;
  grade(run: AgentRun, task: EvalCase): Promise<Grade>;
}
