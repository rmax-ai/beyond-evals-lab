import type { EvalCaseResult, EvalReport } from "./types.js";

export function aggregateResults(results: EvalCaseResult[]): EvalReport["metrics"] & { disagreements: EvalReport["disagreements"] } {
  const count = results.length;
  const rate = (predicate: (result: EvalCaseResult) => boolean): number => count === 0 ? 0 : results.filter(predicate).length / count;
  const toolCalls = results.map((result) => result.metrics.toolCallCount).sort((left, right) => left - right);
  const mean = (values: number[]): number => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    task_success_rate: rate((result) => result.metrics.taskSuccess),
    verified_outcome_rate: rate((result) => result.metrics.verifiedOutcome),
    trajectory_acceptability_rate: rate((result) => result.metrics.trajectoryAcceptable),
    validation_pass_rate: rate((result) => result.metrics.validationPassed),
    policy_block_rate: rate((result) => result.metrics.policyBlocks > 0),
    mean_tool_calls: mean(toolCalls),
    p95_tool_calls: toolCalls.length === 0 ? 0 : toolCalls[Math.ceil(toolCalls.length * 0.95) - 1]!,
    mean_latency_ms: mean(results.map((result) => result.metrics.latencyMs)),
    disagreements: {
      outcome_pass_trajectory_fail: results.filter((result) => result.metrics.taskSuccess && !result.metrics.trajectoryAcceptable).length,
      verification_pass_validation_fail: results.filter((result) => result.metrics.verifiedOutcome && !result.metrics.validationPassed).length,
      outcome_pass_verification_fail: results.filter((result) => result.metrics.taskSuccess && !result.metrics.verifiedOutcome).length,
    },
  };
}
