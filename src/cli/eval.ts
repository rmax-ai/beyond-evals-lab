#!/usr/bin/env tsx
import { Command } from "commander";

import { RuleBasedRefundAgent } from "../agent/rule-agent.js";
import { loadDataset } from "../eval/datasets.js";
import { RefundOutcomeGrader } from "../eval/graders/deterministic.js";
import { HeuristicGrader } from "../eval/graders/heuristic.js";
import { TrajectoryGrader } from "../eval/graders/trajectory.js";
import { EvalRunner } from "../eval/runner.js";
import type { EvalReport } from "../eval/types.js";

const program = new Command();
program.name("eval").description("Run eval harness");

program.argument("[dataset]", "Dataset name", "core").action(async (dataset: string) => {
  const cases = loadDataset(`datasets/${dataset}.json`);
  const runner = new EvalRunner([
    new RefundOutcomeGrader(),
    new TrajectoryGrader(),
    new HeuristicGrader(),
  ]);
  const report = await runner.runDataset(cases, new RuleBasedRefundAgent());
  report.dataset = dataset;
  console.log(formatReport(report));
});

program.parse();

export function formatReport(report: EvalReport): string {
  const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
  const metric = (label: string, value: string): string => `  ${label.padEnd(31)} ${value}`;
  return [
    "BEYOND EVALS LAB",
    `Dataset: ${report.dataset}`,
    `Cases: ${report.cases}`,
    "",
    "Outcome",
    metric("task success rate", percent(report.metrics.task_success_rate)),
    metric("verified outcome rate", percent(report.metrics.verified_outcome_rate)),
    "",
    "Trajectory",
    metric("acceptability rate", percent(report.metrics.trajectory_acceptability_rate)),
    "",
    "Validation",
    metric("pass rate", percent(report.metrics.validation_pass_rate)),
    "",
    "Controls and efficiency",
    metric("policy block rate", percent(report.metrics.policy_block_rate)),
    metric("mean tool calls", report.metrics.mean_tool_calls.toFixed(1)),
    metric("p95 tool calls", report.metrics.p95_tool_calls.toFixed(1)),
    metric("mean latency", `${report.metrics.mean_latency_ms.toFixed(1)} ms`),
    "",
    "Important disagreements",
    metric("Outcome PASS / Trajectory FAIL", String(report.disagreements.outcome_pass_trajectory_fail)),
    metric("Verification PASS / Validation FAIL", String(report.disagreements.verification_pass_validation_fail)),
    metric("Outcome PASS / Verification FAIL", String(report.disagreements.outcome_pass_verification_fail)),
  ].join("\n");
}
