#!/usr/bin/env tsx
import { Command } from "commander";

import { RuleBasedRefundAgent } from "../agent/rule-agent.js";
import { AuthorizationControl } from "../controls/authorization.js";
import { GuardrailEngine } from "../controls/engine.js";
import { RefundLimitControl } from "../controls/refund-limit.js";
import { SchemaValidationControl } from "../controls/schema-validation.js";
import { createFixtureState, sampleTransaction, supportUser } from "../domain/fixtures.js";
import { executeRun } from "../runtime/execute-run.js";
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

/** Placeholder entry point for the trajectory milestone. */
export async function runTrajectoryFailureDemo(): Promise<void> {
  printNotImplemented("trajectory-failure", "Milestone 4");
}

/** Placeholder entry point for the validation milestone. */
export async function runValidationFailureDemo(): Promise<void> {
  printNotImplemented("validation-failure", "Milestone 4");
}

/** Placeholder entry point for the control-block milestone. */
export async function runControlBlockDemo(): Promise<void> {
  printNotImplemented("control-block", "Milestone 4");
}

/** Placeholder entry point for the monitoring milestone. */
export async function runFeedbackLoopDemo(): Promise<void> {
  printNotImplemented("feedback-loop", "Milestone 7");
}

async function runRefundDemo(
  title: string,
  faults: { suppressAuditWrite?: boolean } = {},
): Promise<void> {
  const request = {
    requestId: "demo-refund-1",
    actorId: supportUser.id,
    message: "Please refund €42.",
  };
  const run = await executeRun(
    request,
    createFixtureState(),
    new RuleBasedRefundAgent("normal"),
    standardControls(),
    20,
    faults,
  );
  const evidence = await verifyRefundOutcome(run, run.finalState, EXPECTATION);
  printAssuranceSummary(title, run.id, evidence);
}

function printAssuranceSummary(title: string, runId: string, evidence: VerificationEvidence[]): void {
  const verified = evidence.filter((item) => item.status === "verified").length;
  const failed = evidence.filter((item) => item.status === "failed").length;
  console.log(`\n${title}`);
  console.log(`Run: ${runId}`);
  console.log("Verification evidence:");
  for (const item of evidence) {
    console.log(`  ${item.status === "verified" ? "VERIFIED" : "FAILED"}  ${item.claim}`);
  }
  console.log(`Disposition: ${failed === 0 ? "ACCEPTABLE" : "NOT ACCEPTABLE"} (${verified} verified, ${failed} failed)`);
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
