import { AuthorizationControl } from "../controls/authorization.js";
import { GuardrailEngine } from "../controls/engine.js";
import { RefundLimitControl } from "../controls/refund-limit.js";
import { SchemaValidationControl } from "../controls/schema-validation.js";
import { executeRun } from "../runtime/execute-run.js";
import { analyzeTrajectory } from "../trajectory/analyze-trajectory.js";
import { validateRun } from "../validation/validate-run.js";
import { verifyRefundOutcome } from "../verification/verify-refund-outcome.js";
import { aggregateResults } from "./aggregate.js";
import { resolveInitialState } from "./datasets.js";

import type { Agent } from "../agent/agent.js";
import type { ToolName } from "../tools/contracts.js";
import type { Grader } from "./graders/grader.js";
import type { EvalCase, EvalCaseMetrics, EvalCaseResult, EvalReport } from "./types.js";

export class EvalRunner {
  constructor(private readonly graders: Grader[]) {}

  async runCase(evalCase: EvalCase, agent: Agent): Promise<EvalCaseResult> {
    const initialState = resolveInitialState(evalCase.initialState);
    const run = await executeRun(evalCase.request, initialState, agent, defaultGuardrails());

    // Graders are independently runnable views of the same run. Their evidence
    // is intentionally not collapsed into an aggregate quality score.
    await Promise.all(this.graders.map((grader) => grader.grade(run, evalCase)));

    const verificationEvidence = evalCase.expectations.outcome === undefined
      ? []
      : await verifyRefundOutcome(run, run.finalState, evalCase.expectations.outcome);
    const trajectoryAnalysis = await analyzeTrajectory(run);
    const validationResults = await validateRun(run);
    const metrics = computeMetrics(evalCase, run, verificationEvidence, trajectoryAnalysis.status, trajectoryAnalysis.findings.map((finding) => finding.rule), validationResults);
    return { caseId: evalCase.id, metrics, run, verificationEvidence, trajectoryAnalysis, validationResults };
  }

  async runDataset(dataset: EvalCase[], agent: Agent): Promise<EvalReport> {
    const results: EvalCaseResult[] = [];
    for (const evalCase of dataset) {
      results.push(await this.runCase(evalCase, agent));
    }
    const aggregate = aggregateResults(results);
    return {
      dataset: "in-memory",
      cases: results.length,
      metrics: {
        task_success_rate: aggregate.task_success_rate,
        verified_outcome_rate: aggregate.verified_outcome_rate,
        trajectory_acceptability_rate: aggregate.trajectory_acceptability_rate,
        validation_pass_rate: aggregate.validation_pass_rate,
        policy_block_rate: aggregate.policy_block_rate,
        mean_tool_calls: aggregate.mean_tool_calls,
        p95_tool_calls: aggregate.p95_tool_calls,
        mean_latency_ms: aggregate.mean_latency_ms,
      },
      disagreements: aggregate.disagreements,
      results,
    };
  }
}

function defaultGuardrails(): GuardrailEngine {
  return new GuardrailEngine([new AuthorizationControl(), new RefundLimitControl(), new SchemaValidationControl()]);
}

function computeMetrics(
  evalCase: EvalCase,
  run: EvalCaseResult["run"],
  verificationEvidence: EvalCaseResult["verificationEvidence"],
  trajectoryStatus: EvalCaseResult["trajectoryAnalysis"]["status"],
  trajectoryRules: string[],
  validationResults: EvalCaseResult["validationResults"],
): EvalCaseMetrics {
  const completedTools = toolEvents(run, "tool_completed");
  const controlEvents = run.trace.filter((event) => event.type === "control_decision");
  const verifiedOutcome = verificationEvidence.every((evidence) => evidence.status === "verified");
  const trajectoryAcceptable = trajectoryStatus === "acceptable";
  const validationPassed = validationResults.every((result) => result.status !== "fail");
  const requiredToolsMet = (evalCase.expectations.requiredTools ?? []).every((tool) => completedTools.includes(tool));
  const forbiddenToolsAvoided = (evalCase.expectations.forbiddenTools ?? []).every((tool) => !completedTools.includes(tool));
  const expectedControlsMet = (evalCase.expectations.expectedControls ?? []).every((expected) => controlEvents.some(
    (event) => event.data.control === expected.control && event.data.decision === expected.decision,
  ));
  const policyBlocks = controlEvents.filter((event) => event.data.decision === "block").length;
  const trajectoryExpectationsMet = meetsTrajectoryExpectations(evalCase.expectations.trajectoryExpectations, run, trajectoryRules, policyBlocks);
  const taskSuccess = verifiedOutcome && requiredToolsMet && forbiddenToolsAvoided && expectedControlsMet && trajectoryExpectationsMet;
  return {
    taskSuccess,
    verifiedOutcome,
    trajectoryAcceptable,
    validationPassed,
    policyViolations: trajectoryRules.length,
    policyBlocks,
    toolCallCount: toolEvents(run, "tool_started").length,
    latencyMs: Math.max(0, Date.parse(run.completedAt) - Date.parse(run.startedAt)),
    ...(run.usage?.estimatedCostUsd === undefined ? {} : { estimatedCostUsd: run.usage.estimatedCostUsd }),
  };
}

function toolEvents(run: EvalCaseResult["run"], type: "tool_completed" | "tool_started"): ToolName[] {
  return run.trace
    .filter((event) => event.type === type && typeof event.data.tool === "string")
    .map((event) => event.data.tool as ToolName);
}

function meetsTrajectoryExpectations(
  expectations: Record<string, unknown> | undefined,
  run: EvalCaseResult["run"],
  rules: string[],
  controlDecisionCount: number,
): boolean {
  if (expectations === undefined) return true;
  if (expectations.noUnauthorizedLookups === true && rules.includes("unauthorized-customer-lookup")) return false;
  if (expectations.noUnauthorizedAttempts === true && rules.includes("excessive-refund-attempt")) return false;
  if (expectations.noExcessiveReads === true && rules.includes("excessive-repeated-queries")) return false;
  if (expectations.readsBeforeRefund === true) {
    const refund = run.trace.find((event) => event.type === "tool_completed" && event.data.tool === "createRefund");
    const readBeforeRefund = refund !== undefined && run.trace.some((event) => event.sequence < refund.sequence
      && event.type === "tool_completed" && (event.data.tool === "getTransaction" || event.data.tool === "getTransactions"));
    if (!readBeforeRefund) return false;
  }
  return typeof expectations.maxBlockedActions !== "number" || controlDecisionCount <= expectations.maxBlockedActions;
}
