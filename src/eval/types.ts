import type { AgentRequest, AgentRun, WorldState } from "../domain/types.js";
import type { ToolName } from "../tools/contracts.js";
import type { TrajectoryAnalysis } from "../trajectory/types.js";
import type { ValidationResult } from "../validation/types.js";
import type { RefundExpectation, VerificationEvidence } from "../verification/types.js";

export interface EvalCase {
  id: string;
  description: string;
  initialState: string | WorldState;
  request: AgentRequest;
  expectations: {
    outcome?: RefundExpectation;
    requiredTools?: ToolName[];
    forbiddenTools?: ToolName[];
    expectedControls?: { control: string; decision: "allow" | "block" }[];
    validationRules?: string[];
    trajectoryExpectations?: Record<string, unknown>;
  };
  tags: string[];
}

export interface EvalCaseMetrics {
  taskSuccess: boolean;
  verifiedOutcome: boolean;
  trajectoryAcceptable: boolean;
  validationPassed: boolean;
  policyViolations: number;
  policyBlocks: number;
  toolCallCount: number;
  latencyMs: number;
  estimatedCostUsd?: number;
}

export interface EvalCaseResult {
  caseId: string;
  metrics: EvalCaseMetrics;
  run: AgentRun;
  verificationEvidence: VerificationEvidence[];
  trajectoryAnalysis: TrajectoryAnalysis;
  validationResults: ValidationResult[];
}

export interface EvalReport {
  dataset: string;
  cases: number;
  metrics: {
    task_success_rate: number;
    verified_outcome_rate: number;
    trajectory_acceptability_rate: number;
    validation_pass_rate: number;
    policy_block_rate: number;
    mean_tool_calls: number;
    p95_tool_calls: number;
    mean_latency_ms: number;
  };
  disagreements: {
    outcome_pass_trajectory_fail: number;
    verification_pass_validation_fail: number;
    outcome_pass_verification_fail: number;
  };
  results: EvalCaseResult[];
}
