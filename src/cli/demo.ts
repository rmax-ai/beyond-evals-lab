#!/usr/bin/env tsx
import { Command } from "commander";

import { RuleBasedRefundAgent } from "../agent/rule-agent.js";
import { AuthorizationControl } from "../controls/authorization.js";
import { GuardrailEngine } from "../controls/engine.js";
import { RefundLimitControl } from "../controls/refund-limit.js";
import { SchemaValidationControl } from "../controls/schema-validation.js";
import { createFixtureState, sampleTransaction, supportUser } from "../domain/fixtures.js";
import { executeRun } from "../runtime/execute-run.js";
import { analyzeTrajectory } from "../trajectory/analyze-trajectory.js";
import type { TrajectoryAnalysis } from "../trajectory/types.js";
import { validateRun } from "../validation/validate-run.js";
import type { ValidationResult } from "../validation/types.js";
import type { RefundExpectation, VerificationEvidence } from "../verification/types.js";
import { verifyRefundOutcome } from "../verification/verify-refund-outcome.js";

const EXPECTATION: RefundExpectation = {
  transactionId: sampleTransaction.id,
  amountCents: sampleTransaction.amountCents,
  auditRequired: true,
};

function standardControls(): GuardrailEngine {
  return new GuardrailEngine([
    new AuthorizationControl(),
    new RefundLimitControl(),
    new SchemaValidationControl(),
  ]);
}

/** Runs Demo A: a correct, fully auditable refund. */
export async function runSuccessDemo(): Promise<void> {
  await runRefundDemo("Demo A — correct execution");
}

/** Runs Demo C: a refund exists, but the deliberate runtime fault drops its audit write. */
export async function runVerificationFailureDemo(): Promise<void> {
  await runRefundDemo("Demo C — verification failure", { suppressAuditWrite: true });
}

/** Runs Demo B: the eventual refund is correct, but an excessive first attempt is blocked. */
export async function runTrajectoryFailureDemo(): Promise<void> {
  await runRefundDemo("Demo B — outcome pass, trajectory failure", {}, "reckless-first-attempt");
}

/** Runs Demo D: the mechanics verify, but no duplicate charge established the refund's purpose. */
export async function runValidationFailureDemo(): Promise<void> {
  await runRefundDemo(
    "Demo D — verification pass, validation failure",
    {},
    "refund-without-confirming-duplicate",
    "I was charged twice for €42. Please refund it.",
  );
}

/** Runs Demo E: support staff are prevented from executing a €5,000 refund. */
export async function runControlBlockDemo(): Promise<void> {
  await runRefundDemo(
    "Demo E — guardrail control block",
    {},
    "normal",
    "Please refund €5,000 for txn-1.",
  );
}

/** Placeholder entry point for the monitoring milestone. */
export async function runFeedbackLoopDemo(): Promise<void> {
  printNotImplemented("feedback-loop", "Milestone 7");
}

async function runRefundDemo(
  title: string,
  faults: { suppressAuditWrite?: boolean } = {},
  mode: "normal" | "reckless-first-attempt" | "refund-without-confirming-duplicate" = "normal",
  message = "Please refund €42.",
): Promise<void> {
  const request = {
    requestId: "demo-refund-1",
    actorId: supportUser.id,
    message,
  };
  const run = await executeRun(
    request,
    createFixtureState(),
    new RuleBasedRefundAgent(mode),
    standardControls(),
    20,
    faults,
  );
  const evidence = await verifyRefundOutcome(run, run.finalState, EXPECTATION);
  const trajectory = await analyzeTrajectory(run);
  const validation = await validateRun(run);
  printAssuranceSummary(title, run.id, evidence, trajectory, validation);
}

function printAssuranceSummary(
  title: string,
  runId: string,
  evidence: VerificationEvidence[],
  trajectory: TrajectoryAnalysis,
  validation: ValidationResult[],
): void {
  const verified = evidence.filter((item) => item.status === "verified").length;
  const failed = evidence.filter((item) => item.status === "failed").length;
  console.log(`\n${title}`);
  console.log(`Run: ${runId}`);
  console.log("Verification evidence:");
  for (const item of evidence) {
    console.log(`  ${item.status === "verified" ? "VERIFIED" : "FAILED"}  ${item.claim}`);
  }
  console.log(`Outcome: ${failed === 0 ? "PASS" : "FAIL"} (${verified} verified, ${failed} failed)`);
  console.log(`Trajectory: ${trajectory.status === "acceptable" ? "PASS" : trajectory.status === "unacceptable" ? "FAIL" : "REVIEW"}`);
  for (const item of trajectory.findings) {
    console.log(`  ${item.severity.toUpperCase()}  ${item.rule}: ${item.description}`);
  }
  const validationFailed = validation.filter((item) => item.status === "fail").length;
  console.log(`Validation: ${validationFailed === 0 ? "PASS" : "FAIL"} (${validationFailed} failed rule${validationFailed === 1 ? "" : "s"})`);
  for (const item of validation.filter((item) => item.status === "fail")) {
    console.log(`  FAILED  ${item.rule}: ${item.explanation}`);
  }
  const acceptable = failed === 0 && trajectory.status === "acceptable" && validationFailed === 0;
  console.log(`Disposition: ${acceptable ? "ACCEPTABLE" : "NOT ACCEPTABLE"}`);
}

function printNotImplemented(scenario: string, milestone: string): void {
  console.log(`${scenario} demo is reserved for ${milestone}.`);
}

const program = new Command();
program.name("beyond-evals-lab-demo").description("Demo scenarios");
program.command("success").action(runSuccessDemo);
program.command("verification-failure").action(runVerificationFailureDemo);
program.command("trajectory-failure").action(runTrajectoryFailureDemo);
program.command("validation-failure").action(runValidationFailureDemo);
program.command("control-block").action(runControlBlockDemo);
program.command("feedback-loop").action(runFeedbackLoopDemo);
program.parse();
